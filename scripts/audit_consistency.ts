import 'dotenv/config';
import { db } from '../src/db';
import { sql } from 'drizzle-orm';
import { 
  boqItems, materials, inventoryBalances, inventoryTransactions, purchaseOrderItems, productionOrders
} from '../src/db/schema';

async function auditConsistency() {
  console.log("=== BẮT ĐẦU DATA CONSISTENCY AUDIT ===");
  let errorCount = 0;

  // 1. Check for missing Project IDs in BOQ
  const orphanBoqs = await db.execute(sql`SELECT count(*) as count FROM boq_items WHERE project_id IS NULL`);
  if (Number(orphanBoqs.rows[0].count) > 0) {
    console.error(`❌ LỖI: Phát hiện ${orphanBoqs.rows[0].count} BOQ Items mồ côi không thuộc dự án nào.`);
    errorCount++;
  } else {
    console.log(`✅ Toàn bộ BOQ Items đều gắn với Project.`);
  }

  // 2. Check for negative inventory balances
  const negativeStock = await db.execute(sql`SELECT count(*) as count FROM inventory_balances WHERE quantity < 0`);
  if (Number(negativeStock.rows[0].count) > 0) {
    console.error(`❌ LỖI: Phát hiện ${negativeStock.rows[0].count} record tồn kho âm.`);
    errorCount++;
  } else {
    console.log(`✅ Tồn kho hợp lệ (không có số âm).`);
  }

  // 3. Check for broken Material Links in transactions
  const brokenTxs = await db.execute(sql`SELECT count(*) as count FROM inventory_transactions WHERE material_id NOT IN (SELECT id FROM materials)`);
  if (Number(brokenTxs.rows[0].count) > 0) {
    console.error(`❌ LỖI: Phát hiện ${brokenTxs.rows[0].count} inventory_transactions có material_id không tồn tại.`);
    errorCount++;
  } else {
    console.log(`✅ Toàn bộ Inventory Transactions đều trỏ đúng Material.`);
  }

  // 4. Check for broken PO Items
  const brokenPoItems = await db.execute(sql`SELECT count(*) as count FROM purchase_order_items WHERE po_id NOT IN (SELECT id FROM purchase_orders)`);
  if (Number(brokenPoItems.rows[0].count) > 0) {
    console.error(`❌ LỖI: Phát hiện ${brokenPoItems.rows[0].count} PO Items mồ côi (không có PO).`);
    errorCount++;
  } else {
    console.log(`✅ Toàn bộ PO Items đều có PO gốc.`);
  }

  // 5. Check duplicate idempotency keys in Payroll
  const dupPayroll = await db.execute(sql`
    SELECT idempotency_key, COUNT(*) as count 
    FROM monthly_payroll 
    WHERE idempotency_key IS NOT NULL 
    GROUP BY idempotency_key 
    HAVING COUNT(*) > 1
  `);
  if (dupPayroll.rows.length > 0) {
    console.error(`❌ LỖI: Phát hiện ${dupPayroll.rows.length} duplicate idempotency_keys trong monthly_payroll.`);
    errorCount++;
  } else {
    console.log(`✅ Không có duplicate Payroll Idempotency Keys.`);
  }

  console.log("\n=== TỔNG KẾT DATA CONSISTENCY ===");
  if (errorCount > 0) {
      console.error(`❌ CẦN XỬ LÝ ${errorCount} LỖI DỮ LIỆU!`);
      process.exit(1);
  } else {
      console.log(`🎉 DATA CONSISTENCY ĐẠT CHUẨN! (0 LỖI)`);
      process.exit(0);
  }
}

auditConsistency().catch(err => {
  console.error("❌ LỖI AUDIT:", err);
  process.exit(1);
});
