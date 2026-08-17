import 'dotenv/config';
import { db } from '../src/db';
import { sql } from 'drizzle-orm';

async function main() {
  const res = await db.execute(sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`);
  console.log('All tables:');
  res.rows.forEach((row: any) => console.log(' -', row.table_name));
  process.exit(0);
}
main().catch(console.error);
