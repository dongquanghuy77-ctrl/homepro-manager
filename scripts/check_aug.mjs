import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

// Check August timestamps
const rows = await sql`
  SELECT id, work_date, check_in, check_out
  FROM attendance
  WHERE work_date LIKE '2026-08-%'
  ORDER BY work_date, id
  LIMIT 8
`;

console.log('\n=== AUGUST TIMESTAMPS (VN display) ===');
for (const r of rows) {
  const ci = r.check_in
    ? new Date(r.check_in).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' })
    : 'null';
  const co = r.check_out
    ? new Date(r.check_out).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' })
    : 'null';
  console.log(`  id=${r.id} | ${r.work_date} | ci=${ci} | co=${co}`);
  console.log(`    raw_ci=${r.check_in}`);
}
process.exit(0);
