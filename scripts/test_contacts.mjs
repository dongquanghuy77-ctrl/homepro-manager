import { neon } from '@neondatabase/serverless';
import 'dotenv/config';
async function test() {
  const sql = neon(process.env.DATABASE_URL);
  const result = await sqlSELECT * FROM pwr_contacts LIMIT 1;
  console.log(result);
}
test().catch(console.error);
