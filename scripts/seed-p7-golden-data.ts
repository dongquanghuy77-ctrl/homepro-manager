import 'dotenv/config';
import { db } from '../src/db';
import { projects, materials, workCenters, routings, routingSteps, productionOrders, workOrders } from '../src/db/schema';
import { eq, like } from 'drizzle-orm';

async function seed() {
  console.log('Seeding Phase 7 Golden Data (Shop Floor - Lệnh sản xuất Bệnh Viện Huế)...');

  // Find Project
  const projectList = await db.select().from(projects).where(eq(projects.code, 'DA-BVH-2026'));
  if (projectList.length === 0) {
    console.error('Project Bệnh Viện Huế not found! Please run Phase 1 seeding first.');
    process.exit(1);
  }
  const project = projectList[0];

  const ts = Date.now();

  // Find Finished Good (Cửa Gỗ)
  const fgList = await db.select().from(materials).where(like(materials.code, 'FG-CUA-BVH%')).limit(1);
  if (fgList.length === 0) {
    console.error('Finished Good Cửa Gỗ not found! Please run Phase 3 seeding first.');
    process.exit(1);
  }
  const fgCuaGo = fgList[0];

  // 1. Create Work Centers
  const [wcCnc] = await db.insert(workCenters).values({
    code: `WC-CNC-${ts}`,
    name: 'Tổ Cắt CNC',
    description: 'Cắt ván MDF',
    capacity: 100,
    isActive: true
  }).returning();

  const [wcDanCanh] = await db.insert(workCenters).values({
    code: `WC-EDGE-${ts}`,
    name: 'Tổ Dán Cạnh',
    capacity: 150,
    isActive: true
  }).returning();

  const [wcSon] = await db.insert(workCenters).values({
    code: `WC-PAINT-${ts}`,
    name: 'Tổ Sơn PU',
    capacity: 50,
    isActive: true
  }).returning();
  
  const [wcLapRap] = await db.insert(workCenters).values({
    code: `WC-ASM-${ts}`,
    name: 'Tổ Lắp Ráp & Đóng Gói',
    capacity: 200,
    isActive: true
  }).returning();
  console.log('✅ Work Centers created');

  // 2. Create Routing
  const [routing] = await db.insert(routings).values({
    productId: fgCuaGo.id,
    name: 'Quy trình SX Cửa gỗ chống cháy',
    version: '1.0',
    isActive: true
  }).returning();
  console.log('✅ Routing created');

  // 3. Create Routing Steps
  await db.insert(routingSteps).values([
    { routingId: routing.id, sequence: 1, operation: 'Cắt CNC MDF', workCenterId: wcCnc.id, estimatedMinutes: 30 },
    { routingId: routing.id, sequence: 2, operation: 'Dán Cạnh', workCenterId: wcDanCanh.id, estimatedMinutes: 15 },
    { routingId: routing.id, sequence: 3, operation: 'Sơn PU chống cháy', workCenterId: wcSon.id, estimatedMinutes: 120 },
    { routingId: routing.id, sequence: 4, operation: 'Lắp ráp bản lề & Đóng gói', workCenterId: wcLapRap.id, estimatedMinutes: 45 },
  ]);
  console.log('✅ Routing Steps created');

  // 4. Create Production Order
  const [po] = await db.insert(productionOrders).values({
    code: `PO-BVH-${ts}`,
    projectId: project.id,
    productId: fgCuaGo.id,
    routingId: routing.id,
    plannedQuantity: 20,
    status: 'IN_PROGRESS',
    plannedStart: new Date(),
    plannedEnd: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
  }).returning();
  console.log('✅ Production Order created:', po.code);

  // 5. Create Work Orders
  await db.insert(workOrders).values([
    { productionOrderId: po.id, operation: 'Cắt CNC MDF', sequence: 1, plannedQuantity: 20, status: 'COMPLETED', workCenterId: wcCnc.id },
    { productionOrderId: po.id, operation: 'Dán Cạnh', sequence: 2, plannedQuantity: 20, status: 'IN_PROGRESS', workCenterId: wcDanCanh.id, completedQuantity: 10 },
    { productionOrderId: po.id, operation: 'Sơn PU chống cháy', sequence: 3, plannedQuantity: 20, status: 'PENDING', workCenterId: wcSon.id },
    { productionOrderId: po.id, operation: 'Lắp ráp bản lề & Đóng gói', sequence: 4, plannedQuantity: 20, status: 'PENDING', workCenterId: wcLapRap.id },
  ]);
  console.log('✅ Work Orders created');

  console.log('🎉 Phase 7 Golden Data Seeding Completed!');
  process.exit(0);
}

seed().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
