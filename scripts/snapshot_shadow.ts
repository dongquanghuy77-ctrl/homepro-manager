// scripts/snapshot_shadow.ts
import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());
import { Client } from '@neondatabase/serverless';
import fs from 'fs';

async function snapshot() {
  const prefix = process.argv[2] || 'before';
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  
  try {
    const schemaRes = await client.query(`
      SELECT table_name, column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_schema = 'shadow'
      ORDER BY table_name, ordinal_position;
    `);
    
    fs.writeFileSync(`shadow_${prefix}_schema.json`, JSON.stringify(schemaRes.rows, null, 2));
    
    const tables = Array.from(new Set(schemaRes.rows.map(r => r.table_name)));
    const counts: Record<string, number> = {};
    for (const t of tables) {
      const c = await client.query(`SELECT COUNT(*) as count FROM shadow."${t}"`);
      counts[t as string] = parseInt(c.rows[0].count, 10);
    }
    
    fs.writeFileSync(`shadow_${prefix}_counts.json`, JSON.stringify(counts, null, 2));
    
    console.log(`Snapshot '${prefix}' completed.`);
  } catch (e) {
    console.error("Error taking snapshot:", e);
  } finally {
    await client.end();
  }
}

snapshot();
