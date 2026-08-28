import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

const sql = neon(process.env.DATABASE_URL);

async function fix() {
  console.log('Fixing EDGE_BAND based on unit...');
  const res = await sql`UPDATE pwr_materials SET category = 'EDGE_BAND' WHERE unit ILIKE 'm' OR unit ILIKE 'mét' OR name ILIKE '%nẹp%';`;
  console.log(`Updated ${res.length} rows to EDGE_BAND`);
  
  // Also just in case, ensure hardware is correct
  const res2 = await sql`UPDATE pwr_materials SET category = 'HARDWARE' WHERE unit ILIKE 'cái' OR unit ILIKE 'bộ' OR name ILIKE '%bản lề%' OR name ILIKE '%cam%' OR name ILIKE '%chốt%';`;
  console.log(`Updated ${res2.length} rows to HARDWARE`);

  console.log('DONE');
}

fix().catch(console.error);
