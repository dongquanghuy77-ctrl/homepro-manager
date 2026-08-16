import 'dotenv/config';
import { db } from '../src/db';
import { projects, purchaseRequests, purchaseOrders, users, suppliers } from '../src/db/schema';
import { eq } from 'drizzle-orm';

async function seed() {
  console.log('Seeding Phase 5 Golden Data (Bệnh Viện Huế)...');

  // Find Project
  const projectList = await db.select().from(projects).where(eq(projects.code, 'DA-BVH-2026'));
  if (projectList.length === 0) {
    console.error('Project Bệnh Viện Huế not found! Please run Phase 1 seeding first.');
    process.exit(1);
  }
  const project = projectList[0];

  const ts = Date.now();

  // Find User for Requestor
  const userList = await db.select().from(users).limit(1);
  const user = userList[0];

  // 1. Create Supplier
  const [supplier] = await db.insert(suppliers).values({
    code: `SUP-AN-${ts}`,
    name: 'Công ty Gỗ An Cường',
    contactPerson: 'Nguyễn Văn B',
    phone: '0901234567',
    status: 'ACTIVE'
  }).returning();
  console.log('✅ Supplier created:', supplier.id);

  // 2. Create Purchase Request (PR)
  const [pr] = await db.insert(purchaseRequests).values({
    requestNumber: `PR-BVH-${ts}`,
    projectId: project.id,
    requestDate: new Date(),
    status: 'APPROVED',
    reason: 'Mua ván MDF lõi xanh và sơn PU phục vụ sản xuất quầy lễ tân',
    requesterId: user ? user.id : null
  }).returning();
  console.log('✅ Purchase Request created:', pr.id);

  // 3. Create Purchase Order (PO)
  const [po] = await db.insert(purchaseOrders).values({
    poNumber: `PO-BVH-${ts}`,
    supplierId: supplier.id,
    projectId: project.id,
    orderDate: new Date(),
    expectedDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // +10 days
    total: 125000000, // 125M VND
    status: 'APPROVED',
  }).returning();
  console.log('✅ Purchase Order created:', po.id);

  console.log('🎉 Phase 5 Golden Data Seeding Completed!');
  process.exit(0);
}

seed().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
