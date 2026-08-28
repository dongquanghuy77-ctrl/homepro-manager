import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

// Check remaining BATCH tasks
const batchTasks = await sql`SELECT id, title, status, project_ref FROM pwr_tasks WHERE project_ref LIKE 'BATCH_%'`;
console.log('BATCH tasks remaining:', batchTasks.length, JSON.stringify(batchTasks, null, 2));

// Check task_resources 
const res = await sql`SELECT * FROM pwr_task_resources`;
console.log('Task resources:', res.length);

// Delete remaining BATCH tasks (full cleanup)
if (batchTasks.length > 0) {
  await sql`DELETE FROM pwr_tasks WHERE project_ref LIKE 'BATCH_%'`;
  console.log('✓ Deleted all BATCH tasks');
}

// Reset reserved_level to 0 for all materials
await sql`UPDATE pwr_materials SET reserved_level = 0`;
console.log('✓ Reset all reserved_level to 0');

console.log('\n🎉 Full cleanup done! Capacity will show 0% after refresh.');
