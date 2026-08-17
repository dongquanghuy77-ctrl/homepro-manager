require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function q(sql, params = []) {
  const result = await pool.query(sql, params);
  return result.rows;
}

async function runChecks() {
  console.log('=============================================');
  console.log('PHASE 5 — RECONCILIATION & INTEGRITY CHECK');
  console.log('=============================================\n');

  try {
    // 1. BOQ ↔ BOM ↔ MATERIAL
    console.log('1. Checking BOQ ↔ BOM ↔ MATERIAL relationships...');
    const orphanBoqItems = await q(`SELECT id, material_id FROM boq_items WHERE material_id IS NOT NULL AND material_id NOT IN (SELECT id FROM materials)`);
    console.log(`- Orphan BOQ items (missing material): ${orphanBoqItems.length}`);
    
    // Check if BOM links exist
    const orphanBomItems = await q(`
      SELECT id, material_id 
      FROM bom_items 
      WHERE material_id IS NOT NULL AND material_id NOT IN (SELECT id FROM materials)
    `);
    console.log(`- Orphan BOM items (missing material): ${orphanBomItems.length}`);

    // 2. PR ↔ PO ↔ GRN
    console.log('\n2. Checking Purchasing Flow (PR ↔ PO ↔ GRN)...');
    
    // Are there PR items without valid PRs?
    const orphanPrItems = await q(`SELECT id FROM purchase_request_items WHERE request_id NOT IN (SELECT id FROM purchase_requests)`);
    console.log(`- Orphan PR items: ${orphanPrItems.length}`);

    // Check PO items
    const orphanPoItems = await q(`SELECT id FROM purchase_order_items WHERE po_id NOT IN (SELECT id FROM purchase_orders)`);
    console.log(`- Orphan PO items: ${orphanPoItems.length}`);

    // Are there POs linked to invalid PRs?
    // Check GRNs linked to POs
    const orphanGrns = await q(`SELECT id FROM goods_receipts WHERE po_id IS NOT NULL AND po_id NOT IN (SELECT id FROM purchase_orders)`);
    console.log(`- GRNs pointing to invalid POs: ${orphanGrns.length}`);

    // 3. INVENTORY TRANSACTIONS
    console.log('\n3. Checking Inventory Transactions...');
    const orphanTx = await q(`SELECT id FROM inventory_transactions WHERE material_id NOT IN (SELECT id FROM materials)`);
    console.log(`- Inventory transactions missing materials: ${orphanTx.length}`);

    // 4. TASK ↔ PROGRESS
    console.log('\n4. Checking Task ↔ Progress ↔ Project...');
    const orphanTasks = await q(`SELECT id FROM tasks WHERE project_id IS NOT NULL AND project_id NOT IN (SELECT id FROM projects)`);
    console.log(`- Orphan Tasks (missing project): ${orphanTasks.length}`);

    // 5. EMPLOYEE ↔ USER ↔ ATTENDANCE
    console.log('\n5. Checking HR (Employee ↔ User ↔ Attendance)...');
    const employeesNoUser = await q(`SELECT id, employee_code, full_name FROM employees WHERE user_id IS NULL`);
    console.log(`- Employees without linked User: ${employeesNoUser.length}`);
    if (employeesNoUser.length > 0 && employeesNoUser.length <= 5) {
      console.log(`  Names: ${employeesNoUser.map(e => e.full_name).join(', ')}`);
    }

    const invalidUserLinks = await q(`SELECT id, user_id FROM employees WHERE user_id IS NOT NULL AND user_id NOT IN (SELECT id FROM users)`);
    console.log(`- Employees linked to non-existent Users: ${invalidUserLinks.length}`);

    const orphanAttendance = await q(`SELECT id FROM attendance WHERE user_id NOT IN (SELECT id FROM users)`);
    console.log(`- Orphan Attendance records (invalid user): ${orphanAttendance.length}`);

    const orphanLeaves = await q(`SELECT id FROM leave_requests WHERE user_id NOT IN (SELECT id FROM users)`);
    console.log(`- Orphan Leave requests (invalid user): ${orphanLeaves.length}`);

  } catch (err) {
    console.error('ERROR running checks:', err.message);
  } finally {
    pool.end();
  }
}

runChecks();
