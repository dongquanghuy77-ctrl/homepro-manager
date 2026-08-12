// scripts/setup_shadow.ts
import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());
import { Client } from '@neondatabase/serverless';

async function setup() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  
  try {
    await client.query(`CREATE SCHEMA IF NOT EXISTS shadow;`);
    console.log("Schema 'shadow' created.");
    
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
    `);
    
    for (const t of tablesRes.rows) {
      const tableName = t.table_name;
      await client.query(`DROP TABLE IF EXISTS shadow."${tableName}" CASCADE;`);
      await client.query(`CREATE TABLE shadow."${tableName}" (LIKE public."${tableName}" INCLUDING ALL);`);
      await client.query(`INSERT INTO shadow."${tableName}" SELECT * FROM public."${tableName}";`);
      console.log(`Copied table ${tableName}`);
    }
    
    console.log("SUCCESS");
  } catch (e) {
    console.error("Error setting up shadow:", e);
  } finally {
    await client.end();
  }
}

setup();
