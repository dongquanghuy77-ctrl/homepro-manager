import 'dotenv/config';
import { db } from '../src/db';
import { projects, boqs, boqSections, boqItems, materials, boms, bomItems, productionBomLines } from '../src/db/schema';
import { eq } from 'drizzle-orm';

async function seed() {
  console.log('Seeding Phase 3 Golden Data (Bệnh Viện Huế)...');

  // Find Project
  const projectList = await db.select().from(projects).where(eq(projects.code, 'DA-BVH-2026'));
  if (projectList.length === 0) {
    console.error('Project Bệnh Viện Huế not found! Please run Phase 1 seeding first.');
    process.exit(1);
  }
  const project = projectList[0];

  const ts = Date.now();

  // 1. Create BOQ
  const [boq] = await db.insert(boqs).values({
    code: `BOQ-BVH-V1-${ts}`,
    projectId: project.id,
    version: 'V1.0',
    totalAmount: 15000000000,
    status: 'APPROVED',
  }).returning();
  console.log('✅ BOQ created:', boq.id);

  // 2. Create BOQ Sections
  const [section1] = await db.insert(boqSections).values({
    boqId: boq.id,
    name: 'Tầng 1 - Sảnh chính',
    sequence: 1,
  }).returning();
  const [section2] = await db.insert(boqSections).values({
    boqId: boq.id,
    name: 'Tầng 2 - Hành lang chung',
    sequence: 2,
  }).returning();
  console.log('✅ BOQ Sections created');

  // 3. Create Finished Goods in Materials
  const [fgQuayLeTan] = await db.insert(materials).values({
    code: `FG-QLT-BVH-${ts}`,
    name: 'Quầy Lễ Tân (Gỗ MDF Lõi xanh)',
    unit: 'Bộ',
    unitPrice: 50000000,
    type: 'FINISHED_GOOD',
  }).returning();
  const [fgCuaGo] = await db.insert(materials).values({
    code: `FG-CUA-BVH-${ts}`,
    name: 'Cửa gỗ chống cháy 120p',
    unit: 'Bộ',
    unitPrice: 8500000,
    type: 'FINISHED_GOOD',
  }).returning();
  console.log('✅ Finished Goods created');

  // 4. Create BOQ Items
  const [boqItem1] = await db.insert(boqItems).values({
    boqId: boq.id,
    sectionId: section1.id,
    productId: fgQuayLeTan.id,
    projectId: project.id,
    materialName: fgQuayLeTan.name,
    unit: fgQuayLeTan.unit,
    unitPrice: fgQuayLeTan.unitPrice,
    qtyRequired: 1,
  }).returning();
  
  const [boqItem2] = await db.insert(boqItems).values({
    boqId: boq.id,
    sectionId: section2.id,
    productId: fgCuaGo.id,
    projectId: project.id,
    materialName: fgCuaGo.name,
    unit: fgCuaGo.unit,
    unitPrice: fgCuaGo.unitPrice,
    qtyRequired: 20, // 20 doors
  }).returning();
  console.log('✅ BOQ Items created');

  // 5. Create Raw Materials
  const [rmMdf] = await db.insert(materials).values({
    code: `RM-MDF-17-${ts}`,
    name: 'Ván MDF chống ẩm 17mm',
    unit: 'Tấm',
    unitPrice: 350000,
    type: 'RAW_MATERIAL',
  }).returning();
  
  const [rmSon] = await db.insert(materials).values({
    code: `RM-PU-01-${ts}`,
    name: 'Sơn PU chống cháy',
    unit: 'Thùng',
    unitPrice: 1200000,
    type: 'RAW_MATERIAL',
  }).returning();

  const [rmBanLe] = await db.insert(materials).values({
    code: `RM-BANLE-SS-${ts}`,
    name: 'Bản lề Inox 304',
    unit: 'Cái',
    unitPrice: 45000,
    type: 'HARDWARE',
  }).returning();
  console.log('✅ Raw Materials created');

  // 6. Create BOMs for the Finished Goods
  const [bomCuaGo] = await db.insert(boms).values({
    productId: fgCuaGo.id,
    version: 'V1.0',
    name: 'BOM - Cửa gỗ chống cháy',
    isActive: true,
  }).returning();
  console.log('✅ BOM created:', bomCuaGo.id);

  // 7. Create BOM Items (Định mức)
  await db.insert(bomItems).values([
    { bomId: bomCuaGo.id, materialId: rmMdf.id, quantity: 2.5, unit: 'Tấm', unitCost: 350000 },
    { bomId: bomCuaGo.id, materialId: rmSon.id, quantity: 0.2, unit: 'Thùng', unitCost: 1200000 },
    { bomId: bomCuaGo.id, materialId: rmBanLe.id, quantity: 4, unit: 'Cái', unitCost: 45000 },
  ]);
  console.log('✅ BOM Items created');

  // 8. Create Production BOM Lines (tổng hợp nhu cầu dự án)
  await db.insert(productionBomLines).values([
    {
      projectId: project.id,
      zoneId: 'ZN-BVH-01',
      zoneName: 'Khu vực Tầng 1',
      productName: 'Cửa gỗ chống cháy 120p',
      materialId: fgCuaGo.id,
      qty: 20, // Nhu cầu từ BOQ (20 bộ cửa)
      unit: 'cái',
      supplyType: 'HOMEPRO_PRODUCTION'
    }
  ]);
  console.log('✅ Production BOM Lines created');

  console.log('🎉 Phase 3 Golden Data Seeding Completed!');
  process.exit(0);
}

seed().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
