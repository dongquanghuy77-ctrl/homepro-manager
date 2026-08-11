// Seed HR data based on existing users
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

// Check existing users
const users = await sql`
  SELECT id, name, username, role, department, employee_code, employee_status, join_date, active
  FROM users ORDER BY id
`;

console.log('\n=== TÀI KHOẢN HIỆN CÓ ===');
users.forEach(u => {
  console.log(`  [${u.id}] ${u.name} | ${u.role} | ${u.department ?? 'no dept'} | code=${u.employee_code ?? 'none'} | status=${u.employee_status}`);
});

process.exit(0);
