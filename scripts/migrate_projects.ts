import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

async function run() {
  const sql = neon(process.env.DATABASE_URL!);
  await sql`
    CREATE TABLE IF NOT EXISTS pwr_projects (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `;
  console.log("Table pwr_projects created successfully!");
}
run().catch(console.error);
