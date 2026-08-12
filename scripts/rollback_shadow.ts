// scripts/rollback_shadow.ts
import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());
import { Client } from '@neondatabase/serverless';

async function rollback() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  
  try {
    await client.query('BEGIN');
    
    await client.query(`
      ALTER TABLE shadow.leave_requests
      DROP COLUMN IF EXISTS leave_type_id,
      DROP COLUMN IF EXISTS period,
      DROP COLUMN IF EXISTS attachment_url,
      DROP COLUMN IF EXISTS approved_by_manager,
      DROP COLUMN IF EXISTS approved_by_manager_at,
      DROP COLUMN IF EXISTS manager_note,
      DROP COLUMN IF EXISTS approved_by_hr,
      DROP COLUMN IF EXISTS approved_by_hr_at,
      DROP COLUMN IF EXISTS hr_note,
      DROP COLUMN IF EXISTS cancelled_at,
      DROP COLUMN IF EXISTS cancel_reason;
    `);
    
    await client.query('DROP TABLE IF EXISTS shadow.leave_types CASCADE;');
    
    await client.query('COMMIT');
    console.log("Shadow rollback successful.");
  } catch (e) {
    await client.query('ROLLBACK');
    console.error("Rollback failed:", e);
  } finally {
    await client.end();
  }
}

rollback();
