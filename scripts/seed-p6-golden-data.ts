import 'dotenv/config';
import { db } from '../src/db';
import { projects, materials, warehouses, inventoryTransactions, inventoryBalances } from '../src/db/schema';
import { eq, like } from 'drizzle-orm';

async function seed() {
  console.log('Seeding Phase 6 Golden Data (Inventory - Nhập kho vật tư Bệnh Viện Huế)...');

  // Find Project
  const projectList = await db.select().from(projects).where(eq(projects.code, 'DA-BVH-2026'));
  if (projectList.length === 0) {
    console.error('Project Bệnh Viện Huế not found! Please run Phase 1 seeding first.');
    process.exit(1);
  }
  const project = projectList[0];

  const ts = Date.now();

  // 1. Create Warehouse
  const [warehouse] = await db.insert(warehouses).values({
    code: `WH-MAIN-${ts}`,
    name: 'Kho Tổng Vật Tư (Nhà máy 1)',
    type: 'MAIN_WAREHOUSE',
    address: 'KCN Nam Cấm, Nghệ An',
    isActive: true
  }).returning();
  console.log('✅ Warehouse created:', warehouse.id);

  // Find Materials created in Phase 3
  const mdfList = await db.select().from(materials).where(like(materials.code, 'RM-MDF-17%')).limit(1);
  const puList = await db.select().from(materials).where(like(materials.code, 'RM-PU-01%')).limit(1);
  const banLeList = await db.select().from(materials).where(like(materials.code, 'RM-BANLE-SS%')).limit(1);

  if (!mdfList[0] || !puList[0] || !banLeList[0]) {
    console.error('Raw materials from Phase 3 not found! Please run Phase 3 seed first.');
    process.exit(1);
  }

  const rawMaterials = [
    { mat: mdfList[0], qty: 100, cost: 350000 },
    { mat: puList[0], qty: 20, cost: 1200000 },
    { mat: banLeList[0], qty: 500, cost: 45000 }
  ];

  // 2. Create Inventory Transactions (RECEIPT)
  for (const item of rawMaterials) {
    const tx = await db.insert(inventoryTransactions).values({
      movementNumber: `GR-${item.mat.id}-${ts}`,
      movementType: 'RECEIPT',
      materialId: item.mat.id,
      warehouseId: warehouse.id,
      quantity: item.qty,
      unitCost: item.cost,
      totalCost: item.qty * item.cost,
      referenceType: 'PO',
      projectId: project.id,
      movementDate: new Date(),
      notes: `Nhập kho đợt 1 phục vụ sản xuất dự án ${project.name}`
    }).returning();
    console.log(`✅ Transaction RECEIPT created for ${item.mat.name}`);

    // 3. Update Inventory Balances
    await db.insert(inventoryBalances).values({
      materialId: item.mat.id,
      warehouseId: warehouse.id,
      quantity: item.qty,
      availableQuantity: item.qty,
      unitCost: item.cost,
    });
    console.log(`✅ Balance updated for ${item.mat.name}`);
  }

  console.log('🎉 Phase 6 Golden Data Seeding Completed!');
  process.exit(0);
}

seed().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
