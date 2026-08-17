import 'dotenv/config';
import { db } from '../src/db';
import { leads, customers, opportunities, quotes, contracts, projects, surveys, crmActivities } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

async function seed() {
  console.log('🚀 CRM Final Golden Data Seed v2 (Idempotent)...');

  const ts = Date.now();
  const quoteNum = `BG-BVH-${ts}`;
  const contractNum = `HD-BVH-${ts}`;
  const projectCode = `DA-BVH-${ts}`;

  // 1. Lead
  const [lead] = await db.insert(leads).values({
    name: 'Phòng Vật tư - Bệnh Viện Huế',
    company: 'Bệnh Viện Trung ương Huế',
    phone: '0234 3822325',
    email: 'bvhue@bvhue.com.vn',
    source: 'REFERRAL',
    status: 'CONVERTED',
    type: 'ENTERPRISE',
    potentialLevel: 'HIGH',
    estimatedValue: 15000000000,
    region: 'Miền Trung',
    address: '16 Lê Lợi, Vĩnh Ninh, Thành phố Huế',
    notes: 'Bệnh viện hạng đặc biệt, hội đồng thẩm định 6 tháng',
  }).returning();
  console.log('✅ Lead created:', lead.id);

  // 2. Customer
  const [customer] = await db.insert(customers).values({
    name: 'Bệnh Viện Trung ương Huế',
    phone: '0234 3822325',
    address: '16 Lê Lợi, Vĩnh Ninh, Thành phố Huế',
    customerType: 'ENTERPRISE',
    customerGroup: 'Bệnh viện & Y tế',
    notes: 'Khách hàng VIP nhà nước — ưu tiên cao',
    totalContractValue: 15000000000,
  }).returning();
  console.log('✅ Customer created:', customer.id);

  // 3. Opportunity
  const [opportunity] = await db.insert(opportunities).values({
    name: 'Thiết kế & Thi công Nội thất Bệnh viện Huế 2026',
    customerId: customer.id,
    leadId: lead.id,
    estimatedValue: 15000000000,
    probability: 100,
    status: 'WON',
    source: 'REFERRAL',
    projectType: 'FULL NỘI THẤT',
    location: '16 Lê Lợi, Vĩnh Ninh, Thành phố Huế',
    area: 4500,
    budget: 15000000000,
    nextAction: 'Triển khai thi công',
  }).returning();
  console.log('✅ Opportunity created:', opportunity.id);

  // 4. Survey
  const [survey] = await db.insert(surveys).values({
    opportunityId: opportunity.id,
    status: 'COMPLETED',
    location: '16 Lê Lợi, Vĩnh Ninh, Thành phố Huế',
    projectType: 'Bệnh viện - Nội thất y tế',
    area: 4500,
    floors: 12,
    rooms: 320,
    style: 'Hiện đại - Vô trùng',
    budget: 15000000000,
    materials: 'Gỗ công nghiệp chống khuẩn, Inox y tế, Kính cường lực',
    notes: 'Khảo sát hoàn tất tháng 1/2026, đủ điều kiện triển khai',
  }).returning();
  console.log('✅ Survey created:', survey.id);

  // 5. Quote
  const [quote] = await db.insert(quotes).values({
    quoteNumber: quoteNum,
    customerId: customer.id,
    opportunityId: opportunity.id,
    leadId: lead.id,
    version: 3,
    totalAmount: 15000000000,
    costAmount: 10500000000,
    margin: 30,
    vat: 1500000000,
    status: 'ACCEPTED',
    paymentTerms: '30% đặt cọc - 40% hoàn thiện phần cứng - 30% nghiệm thu',
    deliveryTime: '8 tháng',
    productionTime: '6 tháng',
    notes: 'Báo giá phiên bản cuối đã được HĐ Thẩm định BVH chấp thuận',
  }).returning();
  console.log('✅ Quote created:', quote.id, `(${quoteNum})`);

  // 6. Contract
  const [contract] = await db.insert(contracts).values({
    contractNumber: contractNum,
    quoteId: quote.id,
    customerId: customer.id,
    totalAmount: 15000000000,
    status: 'SIGNED',
    signDate: new Date('2026-02-15'),
    opportunityId: opportunity.id,
    paymentTerms: '30-40-30 milestone',
    notes: 'Hợp đồng chính thức số ' + contractNum,
  }).returning();
  console.log('✅ Contract created:', contract.id, `(${contractNum})`);

  // 7. Project
  const [project] = await db.insert(projects).values({
    code: projectCode,
    name: 'Nội thất Bệnh viện Trung ương Huế 2026',
    customerId: customer.id,
    manager: 'Nguyễn Văn An',
    location: '16 Lê Lợi, Vĩnh Ninh, Thành phố Huế',
    contractValue: 15000000000,
    status: 'ACTIVE',
    startDate: new Date('2026-03-01').toISOString().split('T')[0],
  }).returning();
  console.log('✅ Project created:', project.id, `(${projectCode})`);

  // 8. Update contract with project
  await db.update(contracts)
    .set({ projectId: project.id })
    .where(eq(contracts.id, contract.id));

  // 9. CRM Activities
  await db.insert(crmActivities).values([
    {
      type: 'CALL',
      title: 'Tư vấn ban đầu với Phòng Vật tư',
      customerId: customer.id,
      opportunityId: opportunity.id,
      status: 'COMPLETED',
      priority: 'HIGH',
    },
    {
      type: 'MEETING',
      title: 'Thuyết trình phương án thiết kế',
      customerId: customer.id,
      opportunityId: opportunity.id,
      status: 'COMPLETED',
      priority: 'HIGH',
    },
    {
      type: 'NOTE',
      title: 'Hợp đồng đã ký - Khởi công Q1/2026',
      customerId: customer.id,
      opportunityId: opportunity.id,
      status: 'COMPLETED',
      priority: 'MEDIUM',
    },
  ]);
  console.log('✅ CRM Activities created (3)');

  console.log('\n🎉 CRM Golden Data Seeding Completed!');
  console.log(`   Lead: ${lead.id} | Customer: ${customer.id} | Opportunity: ${opportunity.id}`);
  console.log(`   Survey: ${survey.id} | Quote: ${quote.id} | Contract: ${contract.id} | Project: ${project.id}`);
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Seeding failed:', err.message || err);
  process.exit(1);
});
