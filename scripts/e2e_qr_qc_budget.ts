import 'dotenv/config';
import { db } from '../src/db';
import { projects, materials, productionOrders, warehouses, qrCodes, budgetLines, budgets } from '../src/db/schema';
import { eq, sql } from 'drizzle-orm';
import { QrService } from '../src/lib/tracking/qr_service';
import { QcService } from '../src/lib/quality/qc_service';
import { BudgetService } from '../src/lib/finance/budget_service';
import { ProductionService } from '../src/lib/production/services';
import { InventoryService } from '../src/lib/inventory/services';

async function main() {
  console.log("=== BẮT ĐẦU E2E MASTER INTEGRATION (QR + QC + BUDGET) ===");

  try {
    // Setup Core Data
    let proj = await db.select().from(projects).limit(1);
    let mat = await db.select().from(materials).limit(1);
    let wh = await db.select().from(warehouses).limit(1);
    if (!proj.length || !mat.length || !wh.length) throw new Error("Missing data");

    const testProj = proj[0];
    const testMat = mat[0];
    const whId = wh[0].id;

    console.log("⏳ Cleanup old E2E data...");
    await db.delete(budgetLines).where(sql`budget_id IN (SELECT id FROM budgets WHERE project_id = ${testProj.id})`);
    await db.delete(budgets).where(eq(budgets.projectId, testProj.id));

    // 1. Budget Phase
    console.log("✅ Phase 1: Budget Initialization");
    const budget = await BudgetService.createBudget({
      projectId: testProj.id,
      totalBudget: 15000000000,
      notes: "MASTER_E2E",
      lines: [
        { category: "MATERIAL", budgetedAmount: 8000000000 },
        { category: "LABOR", budgetedAmount: 4000000000 }
      ]
    });
    console.log(`   -> Created Budget for Project ${testProj.name}`);

    // Seed inventory value to consume
    await InventoryService.processMovement(db as any, {
      movementNumber: `RCP-MASTER-${Date.now()}`,
      movementType: 'RECEIPT',
      materialId: testMat.id,
      warehouseId: whId,
      quantity: 500,
      costOverride: 1000000 // 1 Million VND / unit
    });

    // 2. Production Order Creation
    console.log("✅ Phase 2: Production Setup");
    const [po] = await db.insert(productionOrders).values({
      projectId: testProj.id,
      productId: testMat.id,
      code: `PO-MASTER-${Date.now()}`,
      plannedQuantity: 100,
      completedQuantity: 0,
      status: 'RELEASED',
      requiresQc: true,
      qcStatus: 'PENDING'
    }).returning();
    
    // Auto-generate QR for PO
    const poQr = await QrService.generateQr({ entityType: 'PRODUCTION_ORDER', entityId: po.id });
    console.log(`   -> PO Created & QR Assigned: ${poQr.qrValue}`);

    // 3. Material Consumption -> Budget Integration
    console.log("✅ Phase 3: Material Consumption (Triggers Budget Actual Cost)");
    const { consumption, issue: invIssue } = await ProductionService.consumeMaterial({
      productionOrderId: po.id,
      materialId: testMat.id,
      warehouseId: whId,
      plannedQuantity: 50,
      actualQuantity: 50, // 50 * 1M = 50M VND
      userId: 1
    });
    console.log(`   -> Consumed 50 units. Validating Budget...`);
    
    const bQuery = await db.execute(sql`SELECT * FROM budget_lines WHERE budget_id = ${budget.id} AND category = 'MATERIAL'`);
    const matLine = bQuery.rows[0] as any;
    const expectedCost = Math.abs(Number(invIssue.ledger.totalCost));
    if (Math.abs(Number(matLine.actual_amount) - expectedCost) > 1) { // 1 VND tolerance
      throw new Error(`Budget actual amount mismatch. Expected ${expectedCost}, got ${matLine.actual_amount}`);
    }
    console.log(`   -> Budget dynamically updated! Actual Material Cost = ${matLine.actual_amount}`);

    // 4. QC Issue Creation -> QR Generation
    console.log("✅ Phase 4: QC Hard Gate & Traceability");
    const qcIssue = await QcService.createIssue({
      projectId: testProj.id,
      productionOrderId: po.id,
      title: "Khuyết tật kỹ thuật",
      severity: "CRITICAL"
    });
    
    // Trace the issue via QR
    const qcQr = await db.select().from(qrCodes).where(eq(qrCodes.entityId, qcIssue.id));
    const trace = await QrService.traceOrigins(qcQr[0].qrValue);
    if (trace.parents[0].type !== 'PRODUCTION_ORDER' || trace.parents[0].entity.id !== po.id) {
      throw new Error("Traceability failed to link QC Issue back to PO");
    }
    console.log(`   -> Traced QC QR ${qcQr[0].qrValue} back to PO ${po.code}`);

    // Try producing - Should block
    try {
      await ProductionService.produceOutput({ productionOrderId: po.id, warehouseId: whId, quantity: 100 });
      throw new Error("Should have blocked!");
    } catch (e: any) {
      if (!e.message.includes('QC FAIL')) throw e;
      console.log(`   -> Successfully BLOCKED production output by Hard Gate!`);
    }

    // 5. Resolve QC & Complete Production
    console.log("✅ Phase 5: QC Resolution & Final Output");
    await QcService.closeIssue(qcIssue.id, true);
    
    await ProductionService.produceOutput({ productionOrderId: po.id, warehouseId: whId, quantity: 100 });
    console.log(`   -> QC Resolved. Production Output successful!`);

    console.log("🎉 ALL INTEGRATION TESTS PASSED (QR + QC + BUDGET)");
    process.exit(0);

  } catch (error) {
    console.error("❌ E2E Failed:", error);
    process.exit(1);
  }
}

main();
