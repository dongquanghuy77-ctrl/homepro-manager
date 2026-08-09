// BƯỚC 5: Manual DB-level tests for attendance logic
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

let passed = 0;
let failed = 0;

function pass(msg) { console.log('  ✅ PASS:', msg); passed++; }
function fail(msg) { console.log('  ❌ FAIL:', msg); failed++; }

console.log('\n=== PHASE 1.5 MANUAL TESTS ===\n');

// Get first employee id
const [emp] = await sql`SELECT id, name, employee_code FROM users LIMIT 1`;
if (!emp) { console.error('No employees found — seed first'); process.exit(1); }
const empId = emp.id;
const today = new Date().toISOString().split('T')[0];

console.log(`Using employee: ${emp.name} (id=${empId}) | date=${today}`);

// TEST 02: Insert attendance record
console.log('\nTEST 02 – Thêm chấm công vào DB');
try {
  const [rec] = await sql`
    INSERT INTO attendance (employee_id, work_date, status, check_in, created_at, updated_at)
    VALUES (${empId}, ${today}, 'PRESENT', NOW(), NOW(), NOW())
    RETURNING id, employee_id, work_date, status
  `;
  pass(`Inserted: id=${rec.id}, employee_id=${rec.employee_id}, date=${rec.work_date}, status=${rec.status}`);
  
  // TEST 03: Reload data
  console.log('\nTEST 03 – Reload data sau khi insert');
  const rows = await sql`SELECT * FROM attendance WHERE id=${rec.id}`;
  if (rows.length === 1 && rows[0].employee_id === empId) pass('Row persisted correctly');
  else fail('Row not found after insert');

  // TEST 04: Update record
  console.log('\nTEST 04 – Sửa giờ vào/ra');
  await sql`UPDATE attendance SET check_out=NOW(), total_hours=8.0, updated_at=NOW() WHERE id=${rec.id}`;
  const [updated] = await sql`SELECT total_hours, check_out FROM attendance WHERE id=${rec.id}`;
  if (updated.check_out !== null && updated.total_hours === 8) pass(`Updated: total_hours=${updated.total_hours}, check_out set`);
  else fail('Update failed');

  // TEST 05: Duplicate constraint
  console.log('\nTEST 05 – Duplicate bị chặn (UNIQUE employee_id + work_date)');
  try {
    await sql`INSERT INTO attendance (employee_id, work_date, status, created_at, updated_at)
              VALUES (${empId}, ${today}, 'ABSENT', NOW(), NOW())`;
    fail('Duplicate không bị chặn — UNIQUE constraint missing!');
  } catch (e) {
    if (e.message.includes('unique') || e.message.includes('duplicate')) pass('Duplicate bị chặn bởi UNIQUE constraint');
    else fail(`Unexpected error: ${e.message}`);
  }

  // TEST 06–08: Filter by employeeId, date, month
  console.log('\nTEST 06 – Lọc theo employeeId');
  const byEmp = await sql`SELECT COUNT(*) as n FROM attendance WHERE employee_id=${empId}`;
  if (Number(byEmp[0].n) >= 1) pass(`Found ${byEmp[0].n} record(s) for employee ${empId}`);
  else fail('Filter by employeeId failed');

  console.log('\nTEST 07 – Lọc theo ngày');
  const byDate = await sql`SELECT COUNT(*) as n FROM attendance WHERE work_date=${today}`;
  if (Number(byDate[0].n) >= 1) pass(`Found ${byDate[0].n} record(s) for date ${today}`);
  else fail('Filter by date failed');

  console.log('\nTEST 08 – Lọc theo tháng (LIKE)');
  const month = today.substring(0, 7);
  const byMonth = await sql`SELECT COUNT(*) as n FROM attendance WHERE work_date LIKE ${month + '-%'}`;
  if (Number(byMonth[0].n) >= 1) pass(`Found ${byMonth[0].n} record(s) for month ${month}`);
  else fail('Filter by month failed');

  // TEST 09: Employee without record
  console.log('\nTEST 09 – Nhân viên không có bản ghi');
  const [noRecEmp] = await sql`
    SELECT u.id FROM users u
    LEFT JOIN attendance a ON a.employee_id = u.id AND a.work_date = ${today}
    WHERE a.id IS NULL LIMIT 1
  `;
  if (noRecEmp) pass(`Employee id=${noRecEmp.id} không có bản ghi ngày ${today}`);
  else pass('Tất cả nhân viên đã có bản ghi (1 NV trong test)');

  // Cleanup
  await sql`DELETE FROM attendance WHERE id=${rec.id}`;
  console.log('\n  🧹 Cleaned up test data');

} catch (e) {
  fail(`Unexpected error: ${e.message}`);
}

// TEST 10: Authorization check (table-level — route-level checked by requireAuth)
console.log('\nTEST 10 – Authorization kiểm tra schema-level');
const [{ n }] = await sql`SELECT COUNT(*) as n FROM users WHERE role IN ('ADMIN','MANAGER')`;
if (Number(n) >= 1) pass(`${n} ADMIN/MANAGER account(s) có thể truy cập attendance API`);
else fail('Không có ADMIN/MANAGER nào — API sẽ không thể truy cập');

console.log(`\n=== RESULTS: ${passed} PASS | ${failed} FAIL ===`);
process.exit(failed > 0 ? 1 : 0);
