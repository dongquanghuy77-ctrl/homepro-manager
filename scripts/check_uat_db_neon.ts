import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());
import { neon } from '@neondatabase/serverless';

async function checkDatabases() {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    const res = await sql`SELECT datname FROM pg_database WHERE datname = 'uat_neondb'`;
    if (res.length > 0) {
      console.log('UAT_DATABASE_EXISTS');
    } else {
      console.log('UAT_DATABASE_MISSING');
    }
  } catch (err: any) {
    console.error(err.message);
  }
}

checkDatabases();
