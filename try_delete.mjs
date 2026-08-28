import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config({path: '.env.local'});
const sql = neon(process.env.DATABASE_URL);
try {
  await sql`DELETE FROM pwr_tasks WHERE id = 141`;
  console.log("Deleted 141");
} catch (e) {
  console.log("ERROR: ", e.message);
}
