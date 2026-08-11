// Kiểm tra timestamps tháng 7 trong DB
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

const rows = await sql`
  SELECT id, employee_id, work_date, check_in, check_out
  FROM attendance
  WHERE work_date LIKE '2026-07-%'
  LIMIT 5
`;

console.log('\n=== SAMPLE JULY TIMESTAMPS (raw from DB) ===');
for (const r of rows) {
  const ci = r.check_in;
  const co = r.check_out;
  const ciLocal = ci ? new Date(ci).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' }) : '—';
  const coLocal = co ? new Date(co).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' }) : '—';
  console.log(`  id=${r.id} | date=${r.work_date} | raw_ci=${ci} | raw_co=${co}`);
  console.log(`         | VN display: ci=${ciLocal} co=${coLocal}`);
}
process.exit(0);
