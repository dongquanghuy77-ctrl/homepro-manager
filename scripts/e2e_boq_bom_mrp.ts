import * as dotenv from 'dotenv';
dotenv.config();
import { db } from '@/db';
import { materials, boms, bomItems, boqs, boqItems, materialRequirements, inventoryBalances, projects } from '@/db/schema';
import { BomService } from '@/lib/engineering/bom_service';
import { BoqService } from '@/lib/engineering/boq_service';
import { eq, sql } from 'drizzle-orm';

async function main() {
  console.log('=== STARTING BOQ/BOM/MRP E2E TEST ===');
  
  // 1. Create a dummy Project
  const projInsert = await db.insert(projects).values({
    name: 'E2E BOQ/BOM Test Project',
    code: `PRJ-E2E-BOQ-${Date.now()}`,
    status: 'ACTIVE'
  }).returning();
  const testProj = projInsert[0];
  console.log(`✅ Project created: ${testProj.code}`);

  // 2. Create Raw Materials
  const rawMat1 = await db.insert(materials).values({
    code: `MAT-MDF-${Date.now()}`,
    name: 'Gỗ MDF chống ẩm 18mm',
    unit: 'tấm',
    type: 'RAW_MATERIAL',
    unitPrice: 350000
  }).returning();
  
  const rawMat2 = await db.insert(materials).values({
    code: `MAT-HINGE-${Date.now()}`,
    name: 'Bản lề giảm chấn',
    unit: 'cái',
    type: 'HARDWARE',
    unitPrice: 15000
  }).returning();

  // 3. Create Sub-Assemblies
  const subAssy1 = await db.insert(materials).values({
    code: `SUB-DOOR-${Date.now()}`,
    name: 'Cụm Cánh tủ',
    unit: 'bộ',
    type: 'SUB_ASSEMBLY',
  }).returning();

  // 4. Create BOM for Sub-Assembly (Cánh tủ needs 0.5 tấm MDF and 2 bản lề)
  const bomSub1 = await db.insert(boms).values({
    productId: subAssy1[0].id,
    name: 'BOM Cánh tủ V1',
    version: '1.0',
    status: 'ACTIVE'
  }).returning();

  await db.insert(bomItems).values([
    { bomId: bomSub1[0].id, materialId: rawMat1[0].id, quantity: 0.5, unit: 'tấm', wastePercentage: 5 }, // 5% waste
    { bomId: bomSub1[0].id, materialId: rawMat2[0].id, quantity: 2, unit: 'cái', wastePercentage: 0 }
  ]);
  console.log(`✅ Sub-Assembly BOM created for Cánh tủ`);

  // 5. Create Finished Good
  const finishedGood = await db.insert(materials).values({
    code: `FG-CABINET-${Date.now()}`,
    name: 'Tủ hồ sơ MDF',
    unit: 'cái',
    type: 'FINISHED_GOOD',
  }).returning();

  // 6. Create BOM for Finished Good (Needs 2 Cánh tủ and 1.5 tấm MDF for Thùng)
  const bomFg = await db.insert(boms).values({
    productId: finishedGood[0].id,
    name: 'BOM Tủ hồ sơ V1',
    version: '1.0',
    status: 'ACTIVE'
  }).returning();

  await db.insert(bomItems).values([
    { bomId: bomFg[0].id, materialId: subAssy1[0].id, quantity: 2, unit: 'bộ', wastePercentage: 0 },
    { bomId: bomFg[0].id, materialId: rawMat1[0].id, quantity: 1.5, unit: 'tấm', wastePercentage: 10 } // 10% waste for body
  ]);
  console.log(`✅ Finished Good Multi-level BOM created for Tủ hồ sơ`);

  // --- Test Flattened BOM ---
  const flatBom = await BomService.getFlattenedBom(bomFg[0].id, 1);
  console.log(`\n🔍 Flattened BOM Output for 1 Tủ hồ sơ:`);
  flatBom.forEach(item => {
    console.log(`  - ${item.materialName}: Gross Qty = ${item.grossQuantity} ${item.unit} | Cost = ${item.totalCost} | Path: ${item.path}`);
  });

  // Calculate Expected Qty for 10 Tủ hồ sơ:
  // 1 FG = 2 Cánh tủ + 1.5 MDF (body)
  // 1 Cánh tủ = 0.5 MDF (door) + 2 Bản lề
  // MDF needed = 10 * ( (2 * 0.5 * 1.05) + (1.5 * 1.1) )
  //            = 10 * ( 1.05 + 1.65 ) = 10 * 2.7 = 27 tấm
  // Hinge needed = 10 * ( 2 * 2 ) = 40 cái

  // 7. Create BOQ
  const boq = await db.insert(boqs).values({
    code: `BOQ-${Date.now()}`,
    projectId: testProj.id,
    version: '1.0',
    status: 'APPROVED'
  }).returning();

  await db.insert(boqItems).values({
    boqId: boq[0].id,
    projectId: testProj.id,
    productId: finishedGood[0].id,
    materialName: 'Tủ hồ sơ MDF',
    unit: 'cái',
    qtyRequired: 10
  });
  console.log(`\n✅ BOQ created for 10 Tủ hồ sơ`);

  // 8. Run MRP
  await BoqService.runMrpForBoq(boq[0].id, testProj.id);
  console.log(`✅ MRP Calculated successfully.`);

  // 9. Verify MRP Output
  const mrpQuery = await db.select().from(materialRequirements).where(eq(materialRequirements.boqId, boq[0].id));
  
  let mdfPassed = false;
  let hingePassed = false;

  console.log(`\n📊 MRP Results:`);
  for (const req of mrpQuery) {
    if (req.materialId === rawMat1[0].id) { // MDF
      console.log(`  - MDF Shortage: ${req.shortageQty}`);
      if (Math.abs(Number(req.shortageQty) - 27) < 0.001) mdfPassed = true;
    }
    if (req.materialId === rawMat2[0].id) { // Hinge
      console.log(`  - Hinge Shortage: ${req.shortageQty}`);
      if (Math.abs(Number(req.shortageQty) - 40) < 0.001) hingePassed = true;
    }
  }

  if (mdfPassed && hingePassed) {
    console.log(`\n🎉 E2E TEST PASSED: Gross Requirements accurately flattened & generated!`);
    process.exit(0);
  } else {
    console.error(`\n❌ E2E TEST FAILED: Calculation mismatch.`);
    process.exit(1);
  }
}

main();
