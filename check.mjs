import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

const sql = neon(process.env.DATABASE_URL);

async function check() {
  const mats = await sql`SELECT id, name, unit, category FROM pwr_materials;`;
  console.table(mats);
}

check().catch(console.error);
