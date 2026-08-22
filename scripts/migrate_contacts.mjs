import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

async function run() {
  const sql = neon(process.env.DATABASE_URL);
  await sql`
    CREATE TABLE IF NOT EXISTS pwr_contacts (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `;
  console.log("Table pwr_contacts created successfully!");
}
run().catch(console.error);
