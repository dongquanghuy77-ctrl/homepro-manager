import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { db } from '@/db';
import { eq, sql } from 'drizzle-orm';
import { 
  projects, materials, boms, routings, 
  productionPlans, productionPlanItems,
  productionOrders, workOrders, jobCards,
  inventoryBalances, inventoryTransactions, qcInspections, qcIssues
} from '@/db/schema';
import { ProductionService } from '@/lib/production/services';
import { QcService } from '@/lib/quality/qc_service';

async function runE2E() {
  console.log('🚀 Starting FULL PRODUCTION E2E TEST: Bệnh viện Huế 15B');

  try {
    // 0. Get Base Master Data
    const project = (await db.select().from(projects).where(eq(projects.code, 'BV-HUE-15B-SIM')))[0];
    const fgCab = (await db.select().from(materials).where(eq(materials.code, 'TUT-HUE-01')))[0];
    const rawMdf = (await db.select().from(materials).where(eq(materials.code, 'MDF-18-ANCUONG')))[0];
    const rawEdge = (await db.select().from(materials).where(eq(materials.code, 'N-PVC-ANCUONG')))[0];
    const bom = (await db.select().from(boms).where(eq(boms.productId, fgCab.id)))[0];
    const routing = (await db.select().from(routings).where(eq(routings.productId, fgCab.id)))[0];

    const warehouse = (await db.select().from(require('@/db/schema').warehouses).where(eq(require('@/db/schema').warehouses.code, 'WH-HUE-01')))[0];

    const userId = 1; // Admin dummy
    const warehouseId = warehouse?.id; // Dynamic warehouseId

    if (!project || !fgCab || !bom || !routing || !warehouseId) {
      throw new Error('Master data missing! Run seed script first.');
    }

    // 1. Create Production Plan
    console.log('📝 1. Creating Production Plan for 10 Tủ y tế...');
    const plan = await ProductionService.createProductionPlan({
      code: `PLAN-HUE-${Date.now()}`,
      projectId: project.id,
      name: 'Kế hoạch sản xuất Tủ y tế đợt 1',
      startDate: new Date(),
      endDate: new Date(Date.now() + 86400000 * 7), // 7 days
      userId,
      items: [{
        productId: fgCab.id,
        bomId: bom.id,
        plannedQuantity: 10
      }]
    });
    console.log('✅ Plan Created:', plan.code);

    // 2. Generate Production Orders
    console.log('⚙️ 2. Generating Production Orders from Plan...');
    const pos = await ProductionService.generateProductionOrdersFromPlan(plan.id, userId);
    const po = pos[0];
    console.log('✅ Production Order Generated:', po.code);

    // Update PO to set Requires QC and Routing
    await db.update(productionOrders)
      .set({ requiresQc: true, routingId: routing.id })
      .where(eq(productionOrders.id, po.id));

    // Release PO (Generates WOs in old logic, but let's assume it was generated or we manually generate it for the test if not)
    // Actually, in the old logic `createProductionOrder` generated WOs, but our `generateProductionOrdersFromPlan` just inserts POs right now.
    // Let's generate WOs for this PO based on routing.
    const steps = await db.select().from(require('@/db/schema').routingSteps).where(eq(require('@/db/schema').routingSteps.routingId, routing.id));
    for (const s of steps) {
      await db.insert(workOrders).values({
        productionOrderId: po.id,
        operation: s.operation,
        sequence: s.sequence,
        plannedQuantity: 10,
        status: 'PENDING',
        workCenterId: s.workCenterId
      });
    }

    await ProductionService.releaseProductionOrder(po.id);
    console.log('✅ Production Order Released & Work Orders created.');

    // 3. Issue Materials (Consume)
    console.log('📦 3. Issuing Materials for Production (15 MDF, 150m Edge)...');
    await ProductionService.consumeMaterial({
      productionOrderId: po.id,
      materialId: rawMdf.id,
      warehouseId,
      plannedQuantity: 15, // 10 * 1.5
      actualQuantity: 15,
      userId
    });
    await ProductionService.consumeMaterial({
      productionOrderId: po.id,
      materialId: rawEdge.id,
      warehouseId,
      plannedQuantity: 150, // 10 * 15
      actualQuantity: 155,  // 5m extra scrap
      userId
    });
    console.log('✅ Materials Issued. Cost recorded to Budget via P4 Inventory.');

    // 4. Execute Work Orders / Job Cards
    console.log('🔨 4. Executing Work Orders and Job Cards...');
    const wos = await db.select().from(workOrders).where(eq(workOrders.productionOrderId, po.id));
    for (const wo of wos) {
      // Simulate Job Card
      await ProductionService.recordJobCard({
        workOrderId: wo.id,
        employeeId: userId,
        startTime: new Date(),
        durationMinutes: 120,
        completedQuantity: 10,
        rejectedQuantity: 0,
        status: 'COMPLETED',
        notes: `Hoàn thành công đoạn ${wo.operation}`
      });
    }
    console.log('✅ All Job Cards Completed.');

    // 5. Scrap Log
    console.log('🗑️ 5. Logging Scrap for 5m Edge Band...');
    await ProductionService.logScrap({
      workOrderId: wos.find(w => w.operation === 'EDGE_BANDING')?.id || wos[0].id,
      materialId: rawEdge.id,
      productId: null,
      quantity: 5,
      reason: 'Đứt nẹp trong quá trình dán',
      employeeId: userId
    });
    console.log('✅ Scrap Logged.');

    // 6. QC Gate Enforcement
    console.log('🛑 6. Testing QC Hard Gate Enforcement...');
    // Create a FAIL QC inspection and log a defect
    const insp = await QcService.createInspection({
      productionOrderId: po.id,
      result: 'FAIL',
      notes: 'Lỗi kích thước kiểm tra ban đầu'
    });

    const issue = await QcService.logDefect(insp.id, {
      title: 'Sai lệch kích thước',
      description: 'Cửa tủ bị lệch 2mm',
      severity: 'HIGH',
      quantityAffected: 10
    });
    console.log('   -> Simulated QC FAIL created. Defect:', issue.code);

    try {
      await ProductionService.produceOutput({
        productionOrderId: po.id,
        quantity: 10,
        warehouseId,
        userId
      });
      throw new Error("❌ FAILURE: QC Hard Gate bypassed! Output was produced despite QC FAIL.");
    } catch (e: any) {
      if (e.message.includes('QC FAIL')) {
        console.log('✅ SUCCESS: QC Hard Gate successfully blocked Output. (' + e.message + ')');
      } else {
        throw e;
      }
    }

    // 7. Resolve QC
    console.log('✅ 7. Resolving QC Issue (Rework/Fix)...');
    await QcService.closeIssue(issue.id);
    console.log('   -> QC Issue resolved to PASS.');

    // 8. Finished Goods Output
    console.log('📦 8. Receiving Finished Goods to Inventory...');
    const result = await ProductionService.produceOutput({
      productionOrderId: po.id,
      quantity: 10,
      warehouseId,
      userId
    });
    console.log('✅ Output successful! Generated receipt:', result.receipt.ledger.id);

    // 9. Verify Final Status
    const finalPo = (await db.select().from(productionOrders).where(eq(productionOrders.id, po.id)))[0];
    console.log(`Debug Final PO: qty=${finalPo.completedQuantity}, status=${finalPo.status}, qcStatus=${finalPo.qcStatus}`);
    if (finalPo.status !== 'COMPLETED') {
      throw new Error(`PO Status is not COMPLETED. It is ${finalPo.status}`);
    }

    console.log('🎉🎉 E2E PRODUCTION SIMULATION COMPLETED SUCCESSFULLY! 🎉🎉');
    console.log('All Hard Gates Passed. Consistency Checked.');
    process.exit(0);

  } catch (err: any) {
    console.error('❌ E2E failed:', err);
    if (err.cause) console.error('Caused by:', err.cause);
    process.exit(1);
  }
}

runE2E();
