import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

async function fix() {
  // Xem cột hiện có trong tasks
  const cols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'tasks' ORDER BY column_name`;
  console.log('Tasks columns:', cols.map(c => c.column_name).join(', '));

  // Thêm end_date nếu chưa có
  const hasEndDate = cols.some(c => c.column_name === 'end_date');
  if (!hasEndDate) {
    await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS end_date TEXT`;
    console.log('✅ Added end_date column to tasks');
  } else {
    console.log('✅ end_date already exists');
  }

  // Verify tất cả columns khác
  const allTables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`;
  console.log('Tables:', allTables.map(t => t.table_name).join(', '));
}

fix().catch(e => console.error('Error:', e.message));
