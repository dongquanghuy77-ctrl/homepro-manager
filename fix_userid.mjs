import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

// Find which userId has the most pwr_tasks (that's the real logged-in user)
const topUsers = await sql`SELECT user_id, COUNT(*) as cnt FROM pwr_tasks GROUP BY user_id ORDER BY cnt DESC LIMIT 1`;
const realUserId = topUsers[0]?.user_id || 6;
console.log(`Real user ID with most tasks: ${realUserId}`);

// Update the 3 BATCH tasks from userId=1 to the real user
const updated = await sql`UPDATE pwr_tasks SET user_id = ${realUserId} WHERE user_id = 1 AND project_ref LIKE 'BATCH_%'`;
console.log(`✓ Updated BATCH tasks to userId=${realUserId}`);

// Verify
const tasks = await sql`SELECT id, title, user_id, project_ref FROM pwr_tasks WHERE project_ref LIKE 'BATCH_%'`;
console.log('Verified BATCH tasks:', JSON.stringify(tasks, null, 2));
