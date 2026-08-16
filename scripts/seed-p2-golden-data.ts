import 'dotenv/config';
import { db } from '../src/db';
import { projects, surveys, designs, approvals, productionReleases, customers, users } from '../src/db/schema';
import { eq } from 'drizzle-orm';

async function seed() {
  console.log('Seeding Phase 2 Golden Data (Bệnh Viện Huế)...');

  // Find Project
  const projectList = await db.select().from(projects).where(eq(projects.code, 'DA-BVH-2026'));
  if (projectList.length === 0) {
    console.error('Project Bệnh Viện Huế not found! Please run Phase 1 seeding first.');
    process.exit(1);
  }
  const project = projectList[0];

  // Find Customer
  const customerList = await db.select().from(customers).where(eq(customers.id, project.customerId!));
  const customer = customerList[0];

  // Find an admin user to act as approver/releaser
  const userList = await db.select().from(users).limit(1);
  const adminUser = userList[0];

  // 1. Survey
  const [survey] = await db.insert(surveys).values({
    projectId: project.id,
    surveyDate: new Date(),
    status: 'COMPLETED',
    notes: 'Đã khảo sát mặt bằng tầng 1 và 2 Bệnh Viện Huế. Diện tích 2000m2. Hiện trạng đã cán nền.',
    documents: { photos: ['url1', 'url2'], floorPlan: 'url_cad' }
  }).returning();
  console.log('✅ Survey created:', survey.id);

  // 2. Design
  const [design] = await db.insert(designs).values({
    projectId: project.id,
    version: 'V1.0.0',
    status: 'APPROVED',
    notes: 'Bản vẽ kỹ thuật thi công cửa gỗ chống cháy, quầy lễ tân, ốp vách khu vực chờ.',
    files: { cad: 'url_cad', pdf: 'url_pdf', render3d: 'url_3d' }
  }).returning();
  console.log('✅ Design created:', design.id);

  // 3. Approval
  const [approval] = await db.insert(approvals).values({
    designId: design.id,
    customerId: customer.id,
    approvedBy: adminUser ? adminUser.id : null,
    status: 'APPROVED',
    comments: 'Chủ đầu tư đồng ý với phương án V1.0.0, yêu cầu triển khai ngay.',
    approvalDate: new Date()
  }).returning();
  console.log('✅ Approval created:', approval.id);

  // 4. Production Release
  const [release] = await db.insert(productionReleases).values({
    designId: design.id,
    projectId: project.id,
    status: 'RELEASED',
    releasedBy: adminUser ? adminUser.id : null,
    releaseDate: new Date()
  }).returning();
  console.log('✅ Production Release created:', release.id);

  console.log('🎉 Phase 2 Golden Data Seeding Completed!');
  process.exit(0);
}

seed().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
