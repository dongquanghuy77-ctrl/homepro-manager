import 'dotenv/config';
import { db } from '../src/db';
import { projects, installations, installationChecklists, kcsRecords, users } from '../src/db/schema';
import { eq } from 'drizzle-orm';

async function seed() {
  console.log('Seeding Phase 8 Golden Data (Installation - Bệnh Viện Huế)...');

  // Find Project
  const projectList = await db.select().from(projects).where(eq(projects.code, 'DA-BVH-2026'));
  if (projectList.length === 0) {
    console.error('Project Bệnh Viện Huế not found! Please run Phase 1 seeding first.');
    process.exit(1);
  }
  const project = projectList[0];

  const ts = Date.now();

  const userList = await db.select().from(users).limit(1);
  const user = userList[0];

  // 1. Create Installation Schedule
  const [installation] = await db.insert(installations).values({
    code: `INST-BVH-${ts}`,
    projectId: project.id,
    teamLeaderId: user ? user.id : null,
    plannedStartDate: new Date(),
    plannedEndDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // +5 days
    status: 'IN_PROGRESS',
    notes: 'Lắp đặt 20 bộ cửa gỗ chống cháy tầng 1',
  }).returning();
  console.log('✅ Installation schedule created:', installation.code);

  // 2. Create Installation Checklists
  await db.insert(installationChecklists).values([
    { installationId: installation.id, itemTask: 'Kiểm tra độ thẳng đứng của khung bao', isCompleted: true },
    { installationId: installation.id, itemTask: 'Bơm foam chèn khe hở', isCompleted: true },
    { installationId: installation.id, itemTask: 'Lắp bản lề và cánh cửa', isCompleted: false },
    { installationId: installation.id, itemTask: 'Kiểm tra đóng mở, khe hở cánh', isCompleted: false },
    { installationId: installation.id, itemTask: 'Vệ sinh sạch sẽ bàn giao', isCompleted: false },
  ]);
  console.log('✅ Installation Checklists created');

  // 3. Create KCS Record
  const [kcs] = await db.insert(kcsRecords).values({
    code: `KCS-BVH-${ts}`,
    projectId: project.id,
    installationId: installation.id,
    inspectorId: user ? user.id : null,
    status: 'PENDING',
    customerRepresentative: 'Mr. Cường - BQL Dự án BV Huế',
    remarks: 'Chờ hoàn thiện lắp đặt để nghiệm thu',
  }).returning();
  console.log('✅ KCS Record created:', kcs.code);

  console.log('🎉 Phase 8 Golden Data Seeding Completed!');
  process.exit(0);
}

seed().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
