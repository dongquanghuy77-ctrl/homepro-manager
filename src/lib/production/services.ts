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
  stockBalances,
  materials,
  warehouses
} from '@/db/schema';
import { InventoryService } from '@/lib/inventory/services';

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
            machineId: s.machineTypeId
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
      // Check if all WOs are completed to auto-complete PO? 
      // Usually output decides PO completion, or final operation.
      return wo;
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
        productionOrderId: data.productionOrderId,
        materialId: data.materialId,
        quantity: data.quantity,
        reason: data.reason,
        userId: data.userId
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
      const newCompleted = po.completed_quantity + data.quantity;
      const status = newCompleted >= po.planned_quantity ? 'COMPLETED' : 'IN_PROGRESS';
      
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
        projectId: po.project_id,
        userId: data.userId
      });

      return { output, receipt: rcpt };
    });
  }
}
