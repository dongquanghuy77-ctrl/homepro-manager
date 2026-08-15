import * as dotenv from 'dotenv';
dotenv.config();
import { db } from '@/db';
import { projects, productionOrders, qcInspections, qcIssues, qcNcrs } from '@/db/schema';
import { QcService } from '@/lib/quality/qc_service';
import { ProductionService } from '@/lib/production/services';
import { eq } from 'drizzle-orm';

async function main() {
  console.log('=== STARTING QC/LỖI E2E TEST ===');

  // 1. Setup Dummy Project & Production Orders
  const [testProj] = await db.insert(projects).values({
    name: 'E2E QC Test Project',
    code: `PRJ-E2E-QC-${Date.now()}`,
    status: 'ACTIVE'
  }).returning();

  const [testProduct] = await db.insert(require('@/db/schema').materials).values({
    code: `MAT-QC-${Date.now()}`,
    name: 'Dummy QC Product',
    unit: 'cái',
    type: 'FINISHED_GOOD'
  }).returning();

  const [po1] = await db.insert(productionOrders).values({
    projectId: testProj.id,
    productId: testProduct.id,
    code: `PO-PASS-${Date.now()}`,
    status: 'IN_PROGRESS',
    plannedQuantity: 10
  }).returning();

  const [po2] = await db.insert(productionOrders).values({
    projectId: testProj.id,
    productId: testProduct.id,
    code: `PO-FAIL-${Date.now()}`,
    status: 'IN_PROGRESS',
    plannedQuantity: 5
  }).returning();

  console.log(`✅ Setup complete. PO1 (Happy Path) & PO2 (Defect Path) created.`);

  // ==========================================
  // PATH 1: HAPPY PATH (PASS)
  // ==========================================
  console.log(`\n--- Testing Path 1: Happy Path ---`);
  const inspPass = await QcService.createInspection({
    productionOrderId: po1.id,
    result: 'PASS',
    notes: 'Everything looks good'
  });
  console.log(`✅ Inspection PASSED logged for PO1. Insp ID: ${inspPass.id}`);

  // Try to complete PO1
  const completedPo1 = await ProductionService.completeProductionOrder(po1.id);
  console.log(`✅ PO1 completed successfully. Status: ${completedPo1.status}`);

  // ==========================================
  // PATH 2: DEFECT PATH (FAIL -> NCR -> PASS)
  // ==========================================
  console.log(`\n--- Testing Path 2: Defect Path with Hard Gate ---`);
  
  const inspFail = await QcService.createInspection({
    productionOrderId: po2.id,
    result: 'FAIL',
    notes: 'Scratch on the surface'
  });
  console.log(`✅ Inspection FAILED logged for PO2. Insp ID: ${inspFail.id}`);

  // Verify HARD GATE BLOCKED
  let blocked = false;
  try {
    await ProductionService.completeProductionOrder(po2.id);
  } catch (error: any) {
    if (error.message.includes('HARD GATE BLOCKED')) blocked = true;
  }
  
  if (blocked) {
    console.log(`✅ HARD GATE VERIFIED: PO2 blocked from completion due to FAIL qcStatus.`);
  } else {
    console.error(`❌ HARD GATE FAILED: PO2 was allowed to complete!`);
    process.exit(1);
  }

  // Log Defect
  const defect = await QcService.logDefect(inspFail.id, {
    title: 'Surface Scratch',
    description: 'Deep scratch observed during final assembly inspection.',
    severity: 'HIGH',
    quantityAffected: 2
  });
  console.log(`✅ Defect logged. Defect ID: ${defect.id}`);

  // Raise NCR
  const ncr = await QcService.createNcr(defect.id, {
    source: 'INSPECTION',
    description: 'Investigate scratch causes on assembly line.'
  });
  console.log(`✅ NCR Raised. NCR ID: ${ncr.id}`);

  // Submit RCA Action
  const actionedNcr = await QcService.submitNcrAction(ncr.id, {
    rootCause: 'Improper handling by machine operator',
    responsibility: 'Production Manager',
    correctiveAction: 'Retrain operator and replace affected parts',
    preventiveAction: 'Add padding to assembly jigs'
  });
  console.log(`✅ NCR RCA Action Submitted. Status: ${actionedNcr.status}`);

  // Log Rework Cost (Quality Cost)
  await QcService.logReworkCost(defect.id, 500000, 'MATERIAL');
  console.log(`✅ Rework Cost Logged: 500,000 VND`);

  // Close the Defect Issue
  await QcService.closeIssue(defect.id);
  console.log(`✅ Defect Issue Closed.`);

  // Re-inspect as PASS
  const inspPassRe = await QcService.createInspection({
    productionOrderId: po2.id,
    result: 'PASS',
    notes: 'Rework completed, scratch fixed.'
  });
  console.log(`✅ Re-Inspection PASSED logged for PO2. Insp ID: ${inspPassRe.id}`);

  // Try to complete PO2 again
  const completedPo2 = await ProductionService.completeProductionOrder(po2.id);
  console.log(`✅ PO2 completed successfully after Re-Inspection. Status: ${completedPo2.status}`);

  console.log(`\n🎉 E2E TEST PASSED: QC/QMS Module fully operational with Hard Gates and RCA!`);
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ E2E TEST FAILED UNEXPECTEDLY:", err);
  process.exit(1);
});
