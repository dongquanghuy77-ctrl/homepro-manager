import { db } from '@/db';
import { eq, and, sql } from 'drizzle-orm';
import {
  boms,
  bomItems,
  routings,
  routingSteps,
  productionOrders,
  workOrders,
  materialConsumptions,
  productionOutputs,
  scrapLogs,
  machines,
  inventoryBalances,
  materials,
  warehouses
} from '@/db/schema';
import { InventoryService } from '@/lib/inventory/services';
import { BoqBomService } from './boq_bom_service';
import { BudgetService } from '../finance/budget_service';

export class ProductionService {

  // ==========================================
  // BOM & ROUTING
  // ==========================================
  static async createBOM(data: any) {
    return await db.transaction(async (tx) => {
      const [bom] = await tx.insert(boms).values({
        productId: data.productId,
        name: data.name,
        version: data.version
      }).returning();

      if (data.items && data.items.length > 0) {
        const items = data.items.map((i: any) => ({ ...i, bomId: bom.id }));
        await tx.insert(bomItems).values(items);
      }
      return bom;
    });
  }

  static async createRouting(data: any) {
    return await db.transaction(async (tx) => {
      const [routing] = await tx.insert(routings).values({
        productId: data.productId,
        name: data.name,
        version: data.version
      }).returning();

      if (data.steps && data.steps.length > 0) {
        const steps = data.steps.map((s: any) => ({ ...s, routingId: routing.id }));
        await tx.insert(routingSteps).values(steps);
      }
      return routing;
    });
  }

  // ==========================================
  // PRODUCTION PLANS
  // ==========================================
  static async createProductionPlan(data: any) {
    return await db.transaction(async (tx) => {
      const [plan] = await tx.insert(require('@/db/schema').productionPlans).values({
        code: data.code,
        projectId: data.projectId,
        name: data.name,
        startDate: data.startDate,
        endDate: data.endDate,
        createdBy: data.userId
      }).returning();

      if (data.items && data.items.length > 0) {
        const items = data.items.map((i: any) => ({ ...i, planId: plan.id }));
        await tx.insert(require('@/db/schema').productionPlanItems).values(items);
      }
      return plan;
    });
  }

  static async generateProductionOrdersFromPlan(planId: number, userId: number) {
    return await db.transaction(async (tx) => {
      const planItems = await tx.select().from(require('@/db/schema').productionPlanItems).where(eq(require('@/db/schema').productionPlanItems.planId, planId));
      if (!planItems || planItems.length === 0) throw new Error("No items in plan");

      const createdOrders = [];
      for (const item of planItems) {
        const qtyToOrder = Number(item.plannedQuantity) - Number(item.orderedQuantity);
        if (qtyToOrder <= 0) continue;

        const code = `PO-${planId}-${item.id}-${Date.now()}`;
        const [po] = await tx.insert(productionOrders).values({
          code,
          projectId: (await tx.select().from(require('@/db/schema').productionPlans).where(eq(require('@/db/schema').productionPlans.id, planId)))[0].projectId,
          planId: planId,
          planItemId: item.id,
          productId: item.productId,
          bomId: item.bomId,
          plannedQuantity: qtyToOrder,
          status: 'PLANNED',
          createdBy: userId
        }).returning();

        // Generate WOs if BOM -> Routing mapping exists. For now, just generate PO.
        createdOrders.push(po);

        // Update ordered qty
        await tx.update(require('@/db/schema').productionPlanItems)
          .set({ orderedQuantity: Number(item.orderedQuantity) + qtyToOrder })
          .where(eq(require('@/db/schema').productionPlanItems.id, item.id));
      }

      await tx.update(require('@/db/schema').productionPlans).set({ status: 'IN_PROGRESS' }).where(eq(require('@/db/schema').productionPlans.id, planId));

      return createdOrders;
    });
  }

  // ==========================================
  // PRODUCTION ORDERS & WORK ORDERS
  // ==========================================
  static async createProductionOrder(data: any) {
    return await db.transaction(async (tx) => {
      const [order] = await tx.insert(productionOrders).values({
        code: data.code,
        projectId: data.projectId,
        productId: data.productId,
        bomId: data.bomId,
        routingId: data.routingId,
        plannedQuantity: data.plannedQuantity,
        status: 'PLANNED',
        createdBy: data.userId
      }).returning();

      // Generate Work Orders from Routing
      if (data.routingId) {
        const steps = await tx.select().from(routingSteps).where(eq(routingSteps.routingId, data.routingId));
        if (steps.length > 0) {
          const wos = steps.map(s => ({
            productionOrderId: order.id,
            operation: s.operation,
            sequence: s.sequence,
            plannedQuantity: data.plannedQuantity,
            status: 'PENDING',
            workCenterId: s.workCenterId
          }));
          await tx.insert(workOrders).values(wos);
        }
      }
      return order;
    });
  }

  static async releaseProductionOrder(id: number) {
    return await db.update(productionOrders)
      .set({ status: 'RELEASED' })
      .where(and(eq(productionOrders.id, id), eq(productionOrders.status, 'PLANNED')));
  }

  static async startWorkOrder(id: number, userId: number) {
    return await db.update(workOrders)
      .set({ status: 'IN_PROGRESS', startTime: new Date(), assignedUserId: userId })
      .where(and(eq(workOrders.id, id), eq(workOrders.status, 'PENDING')));
  }

  static async completeWorkOrder(id: number, completedQuantity: number) {
    return await db.transaction(async (tx) => {
      const woRes = await tx.update(workOrders)
        .set({ status: 'COMPLETED', endTime: new Date(), completedQuantity })
        .where(eq(workOrders.id, id))
        .returning();
      
      const wo = woRes[0];
      return wo;
    });
  }

  static async recordJobCard(data: {
    workOrderId: number;
    employeeId: number;
    startTime: Date;
    endTime?: Date;
    durationMinutes?: number;
    completedQuantity: number;
    rejectedQuantity: number;
    status: 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
    notes?: string;
  }) {
    return await db.transaction(async (tx) => {
      // 1. Insert Job Card
      const [jobCard] = await tx.insert(require('@/db/schema').jobCards).values({
        workOrderId: data.workOrderId,
        employeeId: data.employeeId,
        startTime: data.startTime,
        endTime: data.endTime,
        durationMinutes: data.durationMinutes,
        completedQuantity: data.completedQuantity,
        rejectedQuantity: data.rejectedQuantity,
        status: data.status,
        notes: data.notes
      }).returning();

      // 2. Update Work Order quantities if completed
      if (data.status === 'COMPLETED') {
        const [wo] = await tx.select().from(workOrders).where(eq(workOrders.id, data.workOrderId));
        if (wo) {
          const newCompleted = Number(wo.completed_quantity || 0) + Number(data.completedQuantity);
          let newStatus = wo.status;
          if (newCompleted >= Number(wo.planned_quantity)) {
            newStatus = 'COMPLETED';
          } else {
            newStatus = 'IN_PROGRESS';
          }
          await tx.update(workOrders)
            .set({ completedQuantity: newCompleted, status: newStatus, endTime: new Date() })
            .where(eq(workOrders.id, data.workOrderId));

          // Auto-calculate Labor Cost based on duration and employee standard rate?
          // For now, if we have basicSalary, we could push this to project_costs.
          // (Simplified for this version)
        }
      }

      return jobCard;
    });
  }

  static async completeProductionOrder(id: number) {
    return await db.transaction(async (tx) => {
      // 1. Fetch PO
      const poRes = await tx.select().from(productionOrders).where(eq(productionOrders.id, id));
      if (poRes.length === 0) throw new Error("Production Order not found");
      const po = poRes[0];

      // 2. HARD GATE: Enforce QC Status
      if (po.qcStatus === 'FAIL') {
        throw new Error("HARD GATE BLOCKED: Cannot complete Production Order with failed QC status. Please resolve Defects/NCRs first.");
      }

      // Check for pending inspections
      // Note: If you want to enforce that all mandatory control points are PASSED, you would query them here.
      // For now, if qcStatus is PASS or UNTESTED (meaning no failures logged), we allow completion.

      // 3. Mark Completed
      const [updated] = await tx.update(productionOrders)
        .set({ status: 'COMPLETED' })
        .where(eq(productionOrders.id, id))
        .returning();
      
      return updated;
    });
  }

  // ==========================================
  // MATERIAL CONSUMPTION
  // ==========================================
  static async consumeMaterial(data: any) {
    return await db.transaction(async (tx) => {
      // 1. Validate PO
      const poRes = await tx.select().from(productionOrders).where(eq(productionOrders.id, data.productionOrderId));
      const po = poRes[0];
      if (!po || po.status === 'DRAFT' || po.status === 'CANCELLED') {
        throw new Error('Invalid Production Order Status');
      }

      // 2. Consume from Inventory (Atomic)
      const issue = await InventoryService.processMovement(tx, {
        movementNumber: `ISS-PROD-${Date.now()}-${data.materialId}`,
        movementType: 'ISSUE',
        materialId: data.materialId,
        warehouseId: data.warehouseId,
        quantity: data.actualQuantity, // P4 service auto-negates
        referenceType: 'PROD_ORDER',
        referenceId: po.id,
        projectId: po.projectId,
        userId: data.userId
      });

      // 3. Log Consumption
      const [cons] = await tx.insert(materialConsumptions).values({
        productionOrderId: po.id,
        materialId: data.materialId,
        warehouseId: data.warehouseId,
        plannedQuantity: data.plannedQuantity || 0,
        actualQuantity: data.actualQuantity,
        userId: data.userId
      }).returning();

      // 4. Record Actual Cost to Budget (Material)
      // The issue.ledger.totalCost is the actual value of inventory issued
      if (issue && issue.ledger && issue.ledger.totalCost) {
        // Find project ID from PO
        const cost = Math.abs(Number(issue.ledger.totalCost));
        await BudgetService.recordActualCost(po.projectId, 'MATERIAL', cost, tx);
      }

      // Ensure PO is IN_PROGRESS
      if (po.status === 'RELEASED') {
        await tx.update(productionOrders).set({ status: 'IN_PROGRESS' }).where(eq(productionOrders.id, po.id));
      }

      return { consumption: cons, issue };
    });
  }

  // ==========================================
  // SCRAP / WASTE
  // ==========================================
  static async logScrap(data: any) {
    return await db.transaction(async (tx) => {
      const [scrap] = await tx.insert(scrapLogs).values({
        workOrderId: data.workOrderId,
        materialId: data.materialId,
        productId: data.productId,
        quantity: data.quantity,
        reason: data.reason,
        employeeId: data.employeeId
      }).returning();

      // Scrap is assumed already consumed from inventory, so no direct P4 movement here.
      // If it hasn't been consumed, it should be consumed first, then logged.
      // Or we can auto-consume. We assume it's logged during consumption or after.
      return scrap;
    });
  }

  // ==========================================
  // OUTPUT (FINISHED GOODS)
  // ==========================================
  static async produceOutput(data: any) {
    return await db.transaction(async (tx) => {
      // 1. Lock PO
      const poQuery = await tx.execute(sql`SELECT * FROM production_orders WHERE id = ${data.productionOrderId} FOR UPDATE`);
      const po = poQuery.rows[0] as any;
      if (!po) throw new Error('PO not found');
      console.log('Debug produceOutput PO Keys:', Object.keys(po));

      // 2. Validate Over-production
      if (po.completed_quantity + data.quantity > po.planned_quantity && !data.allowOverProduction) {
        throw new Error('Cannot produce more than planned without explicit flag');
      }

      // 3. Create Output Record
      const [output] = await tx.insert(productionOutputs).values({
        outputNumber: `MFG-OUT-${Date.now()}-${po.id}`,
        productionOrderId: po.id,
        productId: po.product_id,
        warehouseId: data.warehouseId,
        quantity: data.quantity,
        userId: data.userId
      }).returning();

      // 4. Update PO Completed Qty
      const newCompleted = Number(po.completed_quantity || 0) + Number(data.quantity);
      let status = 'IN_PROGRESS';
      
      // Strict QC Gate
      if (po.requires_qc && po.qc_status === 'FAIL') {
        throw new Error('QC FAIL: Cannot produce Finished Goods until QC Issue is resolved');
      }

      if (newCompleted >= Number(po.planned_quantity)) {
        if (po.requires_qc && po.qc_status !== 'PASS') {
          console.log(`Debug produceOutput: QC incomplete. requires_qc=${po.requires_qc}, qc_status=${po.qc_status}`);
          throw new Error('QC Incomplete: Cannot complete Production Order without QC PASS');
        } else {
          status = 'COMPLETED';
          console.log(`Debug produceOutput: Setting status to COMPLETED`);
        }
      } else {
        console.log(`Debug produceOutput: newCompleted (${newCompleted}) < planned (${po.planned_quantity})`);
      }
      
      await tx.execute(sql`UPDATE production_orders SET completed_quantity = ${newCompleted}, status = ${status} WHERE id = ${po.id}`);

      // 5. Receive to Inventory (P4)
      const rcpt = await InventoryService.processMovement(tx, {
        movementNumber: `RCP-PROD-${Date.now()}-${po.product_id}`,
        movementType: 'RECEIPT',
        materialId: po.product_id,
        warehouseId: data.warehouseId,
        quantity: data.quantity,
        referenceType: 'PROD_ORDER',
        referenceId: po.id,
        projectId: po.projectId,
        userId: data.userId
      });

      return { output, receipt: rcpt };
    });
  }
}
