import 'dotenv/config';
import { db } from '../src/db';
import { projects, paymentVouchers, debts, users } from '../src/db/schema';
import { eq } from 'drizzle-orm';

async function seed() {
  console.log('Seeding Phase 9 Golden Data (Finance - Bệnh Viện Huế)...');

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

  // 1. Create Payment Vouchers
  await db.insert(paymentVouchers).values([
    {
      code: `PT-BVH-${ts}`,
      type: 'RECEIPT',
      amount: 500000000,
      currency: 'VND',
      referenceId: project.id,
      referenceType: 'PROJECT',
      payerPayeeName: 'BQL Dự án Bệnh Viện Huế',
      description: 'Thu tiền tạm ứng đợt 1 (30%) hợp đồng nội thất',
      status: 'COMPLETED',
      createdBy: user ? user.id : null
    },
    {
      code: `PC-NCC-${ts}`,
      type: 'PAYMENT',
      amount: 150000000,
      currency: 'VND',
      referenceId: null,
      referenceType: 'PO',
      payerPayeeName: 'Công ty TNHH Gỗ Minh Phát',
      description: 'Chi thanh toán tiền mua Ván MDF lô 1',
      status: 'COMPLETED',
      createdBy: user ? user.id : null
    }
  ]);
  console.log('✅ Payment Vouchers (Thu/Chi) created');

  // 2. Create Debts
  await db.insert(debts).values([
    {
      code: `CN-PT-${ts}`,
      type: 'RECEIVABLE', // Phải thu
      partnerId: null,
      partnerType: 'CUSTOMER',
      totalAmount: 1800000000, // Tổng HĐ
      paidAmount: 500000000,   // Đã thanh toán (tạm ứng)
      remainingAmount: 1300000000,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 days
      status: 'PARTIAL',
      notes: 'Công nợ dự án Bệnh Viện Huế'
    },
    {
      code: `CN-PC-${ts}`,
      type: 'PAYABLE', // Phải trả
      partnerId: null,
      partnerType: 'SUPPLIER',
      totalAmount: 250000000,
      paidAmount: 150000000,
      remainingAmount: 100000000,
      dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // +15 days
      status: 'PARTIAL',
      notes: 'Công nợ nhà cung cấp Ván MDF'
    }
  ]);
  console.log('✅ Debts (Công nợ) created');

  console.log('🎉 Phase 9 Golden Data Seeding Completed!');
  process.exit(0);
}

seed().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
