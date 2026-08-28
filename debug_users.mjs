import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

// Find the actual admin/manager user
const admins = await sql`SELECT id, name, username FROM users WHERE role IN ('ADMIN', 'admin', 'MANAGER', 'Quản lý') OR username = 'admin' LIMIT 5`;
console.log('ADMIN USERS:', JSON.stringify(admins, null, 2));

// Also check which user has the most tasks
const topUsers = await sql`SELECT user_id, COUNT(*) as cnt FROM pwr_tasks GROUP BY user_id ORDER BY cnt DESC LIMIT 5`;
console.log('TOP TASK USERS:', JSON.stringify(topUsers, null, 2));
