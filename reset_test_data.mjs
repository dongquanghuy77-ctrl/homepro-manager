import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

const sql = neon(process.env.DATABASE_URL);

async function reset() {
  console.log('Resetting test data...');
  
  // 1. Delete all dependencies and resources linked to tasks
  await sql`DELETE FROM pwr_task_dependencies`;
  await sql`DELETE FROM pwr_task_resources`;
  await sql`DELETE FROM pwr_work_logs`;
  await sql`DELETE FROM pwr_task_audit_log`;
  
  // 2. Delete transactions (they link to tasks)
  await sql`DELETE FROM pwr_material_transactions`;
  
  // 3. Delete tasks
  await sql`DELETE FROM pwr_tasks`;
  
  // 4. Reset inventory reservations
  await sql`UPDATE pwr_materials SET reserved_level = 0`;
  
  // 5. Delete auto-generated master data (so they can test the auto-generation again)
  await sql`DELETE FROM pwr_materials WHERE sku_code LIKE 'AUTO_%'`;
  
  console.log('✅ Dữ liệu rác đã được dọn dẹp sạch sẽ!');
}

reset().catch(console.error);
