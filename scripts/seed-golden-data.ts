import 'dotenv/config';
import { db } from '../src/db';
import { leads, customers, opportunities, quotes, contracts, projects } from '../src/db/schema';
import { eq } from 'drizzle-orm';

async function seed() {
  console.log('Seeding Golden Data (Bệnh Viện Huế)...');

  // 1. Lead
  const [lead] = await db.insert(leads).values({
    name: 'Phòng Vật tư - Bệnh Viện Huế',
    company: 'Bệnh Viện Trung ương Huế',
    phone: '0234 3822325',
    email: 'bvhue@bvhue.com',
    source: 'REFERRAL',
    status: 'CONVERTED'
  }).returning();
  console.log('✅ Lead created:', lead.id);

  // 2. Customer
  const [customer] = await db.insert(customers).values({
    name: 'Bệnh Viện Trung ương Huế',
    phone: '0234 3822325',
    address: '16 Lê Lợi, Vĩnh Ninh, Thành phố Huế',
    notes: 'Khách hàng VIP nhà nước'
  }).returning();
  console.log('✅ Customer created:', customer.id);

  // 3. Opportunity
  const [opportunity] = await db.insert(opportunities).values({
    name: 'Thiết kế & Thi công Nội thất Bệnh viện Huế',
    customerId: customer.id,
    leadId: lead.id,
    estimatedValue: 15000000000,
    probability: 100,
    status: 'WON'
  }).returning();
  console.log('✅ Opportunity created:', opportunity.id);

  // 4. Quote
  const [quote] = await db.insert(quotes).values({
    quoteNumber: 'BG-BVH-001',
    customerId: customer.id,
    opportunityId: opportunity.id,
    leadId: lead.id,
    totalAmount: 15000000000,
    status: 'ACCEPTED'
  }).returning();
  console.log('✅ Quote created:', quote.id);

  // 5. Contract
  const [contract] = await db.insert(contracts).values({
    contractNumber: 'HĐ-BVH-001',
    quoteId: quote.id,
    customerId: customer.id,
    totalAmount: 15000000000,
    status: 'SIGNED',
    signDate: new Date()
  }).returning();
  console.log('✅ Contract created:', contract.id);

  // 6. Project
  const [project] = await db.insert(projects).values({
    code: 'DA-BVH-2026',
    name: 'Nội thất Bệnh viện Huế',
    customerId: customer.id,
    manager: 'Nguyen Van A',
    location: '16 Lê Lợi, Huế',
    contractValue: 15000000000,
    status: 'ACTIVE',
    startDate: new Date().toISOString().split('T')[0],
  }).returning();
  console.log('✅ Project created:', project.id);

  // Update Contract with project_id
  await db.update(contracts)
    .set({ projectId: project.id })
    .where(eq(contracts.id, contract.id));

  console.log('🎉 Golden Data Seeding Completed!');
  process.exit(0);
}

seed().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
