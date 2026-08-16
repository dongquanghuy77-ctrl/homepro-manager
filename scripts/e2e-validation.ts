import 'dotenv/config';
import { db } from '../src/db';
import { projects, boqs, materials, inventoryTransactions, productionOrders, installations, paymentVouchers, debts } from '../src/db/schema';
import { eq, like } from 'drizzle-orm';

async function validateE2E() {
  console.log('🚀 MASTER E2E FLOW VALIDATION 🚀');
  console.log('==================================');

  let passed = true;

  // 1. Dự án / Khách hàng
  const projectList = await db.select().from(projects).where(eq(projects.code, 'DA-BVH-2026'));
  if (projectList.length > 0) {
    console.log('✅ [Khách hàng/Dự án] DA-BVH-2026 tồn tại.');
  } else {
    console.error('❌ [Khách hàng/Dự án] DA-BVH-2026 không tồn tại!');
    passed = false;
  }
  const project = projectList[0];

  // 2. Báo giá (BOQ)
  if (project) {
    const boqList = await db.select().from(boqs).where(eq(boqs.projectId, project.id));
    if (boqList.length > 0) {
      console.log(`✅ [Báo giá] Đã duyệt BOQ cho DA-BVH-2026 (ID: ${boqList[0].id}, version: ${boqList[0].version}).`);
    } else {
      console.error('❌ [Báo giá] Không tìm thấy BOQ!');
      passed = false;
    }
  }

  // 3. Nhập vật tư (Inventory)
  if (project) {
    const receipts = await db.select().from(inventoryTransactions).where(eq(inventoryTransactions.projectId, project.id));
    if (receipts.length > 0) {
      console.log(`✅ [Nhập vật tư] Có ${receipts.length} giao dịch nhập kho vật tư cho DA-BVH-2026.`);
    } else {
      console.error('❌ [Nhập vật tư] Không có giao dịch nhập kho!');
      passed = false;
    }
  }

  // 4. Sản xuất (Production Orders)
  if (project) {
    const pos = await db.select().from(productionOrders).where(eq(productionOrders.projectId, project.id));
    if (pos.length > 0) {
      console.log(`✅ [Sản xuất] Lệnh sản xuất ${pos[0].code} đang ở trạng thái ${pos[0].status}.`);
    } else {
      console.error('❌ [Sản xuất] Không có lệnh sản xuất!');
      passed = false;
    }
  }

  // 5. Giao hàng / Lắp đặt (Installation)
  if (project) {
    const installs = await db.select().from(installations).where(eq(installations.projectId, project.id));
    if (installs.length > 0) {
      console.log(`✅ [Lắp đặt & Bàn giao] Lịch lắp đặt ${installs[0].code} trạng thái ${installs[0].status}.`);
    } else {
      console.error('❌ [Lắp đặt & Bàn giao] Không có lịch lắp đặt!');
      passed = false;
    }
  }

  // 6. Nhận tiền (Finance)
  if (project) {
    const receipts = await db.select().from(paymentVouchers).where(eq(paymentVouchers.referenceId, project.id));
    if (receipts.length > 0) {
      console.log(`✅ [Tài chính/Nhận tiền] Đã có phiếu thu ${receipts[0].code} số tiền ${Number(receipts[0].amount).toLocaleString('vi-VN')} đ.`);
    } else {
      console.error('❌ [Tài chính/Nhận tiền] Không có phiếu thu!');
      passed = false;
    }
    
    // Check Debts
    const projectDebts = await db.select().from(debts).where(like(debts.notes, '%Bệnh Viện Huế%'));
    if (projectDebts.length > 0) {
      console.log(`✅ [Công nợ] Công nợ dự án được ghi nhận: Đã thu ${Number(projectDebts[0].paidAmount).toLocaleString('vi-VN')} / ${Number(projectDebts[0].totalAmount).toLocaleString('vi-VN')} đ.`);
    } else {
      console.error('❌ [Công nợ] Không tìm thấy công nợ dự án!');
      passed = false;
    }
  }

  console.log('==================================');
  if (passed) {
    console.log('🌟 PASS = 100%. Master E2E Flow Validation SUCCESS! 🌟');
    process.exit(0);
  } else {
    console.error('💥 FAILED! Master E2E Flow Validation found errors.');
    process.exit(1);
  }
}

validateE2E().catch(err => {
  console.error('Validation script failed:', err);
  process.exit(1);
});
