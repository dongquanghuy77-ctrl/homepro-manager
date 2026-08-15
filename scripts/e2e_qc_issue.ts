import 'dotenv/config';
import { db } from '../src/db';
import { projects, materials, productionOrders, warehouses } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import { QcService } from '../src/lib/quality/qc_service';
import { ProductionService } from '../src/lib/production/services';

async function main() {
  console.log("=== BẮT ĐẦU E2E QC / LỖI TEST ===");

  try {
    // 1. Setup Data
    let proj = await db.select().from(projects).limit(1);
    let mat = await db.select().from(materials).limit(1);
    let wh = await db.select().from(warehouses).limit(1);
    
    if (!proj.length || !mat.length || !wh.length) {
      throw new Error("Missing prerequisite data");
    }

    const testProj = proj[0];
    const testMat = mat[0];
    const whId = wh[0].id;

    console.log("✅ Test 01: Create PO with requiresQc = true");
    const [po] = await db.insert(productionOrders).values({
      projectId: testProj.id,
      productId: testMat.id,
      code: `PO-QC-TEST-${Date.now()}`,
      plannedQuantity: 100,
      completedQuantity: 0,
      status: 'RELEASED',
      requiresQc: true,
      qcStatus: 'PENDING'
    }).returning();
    console.log(`   -> Created PO: ${po.code}`);

    console.log("✅ Test 02: Create QC Issue (FAIL the PO)");
    const issue = await QcService.createIssue({
      projectId: testProj.id,
      productId: testMat.id,
      productionOrderId: po.id,
      title: "Vết xước bề mặt",
      description: "Phát hiện xước xát trên bề mặt FG",
      category: "SURFACE_DEFECT",
      severity: "HIGH",
      quantityAffected: 15
    });
    console.log(`   -> Created Issue: ${issue.code}`);

    // Verify PO is FAIL
    const verifyPo = await db.select().from(productionOrders).where(eq(productionOrders.id, po.id));
    if (verifyPo[0].qcStatus !== 'FAIL') {
      throw new Error("PO qcStatus was not automatically set to FAIL");
    }

    console.log("✅ Test 03: Test Hard Gate (Should Block Production)");
    try {
      await ProductionService.produceOutput({
        productionOrderId: po.id,
        warehouseId: whId,
        quantity: 10
      });
      throw new Error("Should have blocked production!");
    } catch (e: any) {
      if (!e.message.includes('QC FAIL')) throw e;
      console.log(`   -> Successfully blocked production output`);
    }

    console.log("✅ Test 04: Investigate & Close Issue");
    await QcService.investigateIssue(issue.id, {
      rootCause: "Máy chà nhám hỏng giấy nhám",
      correctiveAction: "Thay giấy nhám, rework chà lại",
      status: "REWORK"
    });
    
    // Rework complete, close issue
    await QcService.closeIssue(issue.id, true);
    console.log(`   -> Issue CLOSED. PO should be PASS`);

    // Verify PO is PASS
    const verifyPo2 = await db.select().from(productionOrders).where(eq(productionOrders.id, po.id));
    if (verifyPo2[0].qcStatus !== 'PASS') {
      throw new Error("PO qcStatus was not automatically set to PASS after closing issue");
    }

    console.log("✅ Test 05: Produce Finished Goods (Passes Hard Gate)");
    await ProductionService.produceOutput({
      productionOrderId: po.id,
      warehouseId: whId,
      quantity: 100 // Fully produce
    });
    
    const finalPo = await db.select().from(productionOrders).where(eq(productionOrders.id, po.id));
    if (finalPo[0].status !== 'COMPLETED') {
      throw new Error("PO status should be COMPLETED");
    }
    console.log(`   -> Production successfully completed!`);

    console.log("🎉 ALL QC TESTS PASSED");
    process.exit(0);

  } catch (error) {
    console.error("❌ E2E Failed:", error);
    process.exit(1);
  }
}

main();
