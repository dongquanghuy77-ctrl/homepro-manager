// scripts/dump_db_schema.ts
import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());
import { db } from '../src/db';
import { sql } from 'drizzle-orm';
import fs from 'fs';

async function dump() {
  const { rows } = await db.execute(sql`
    SELECT table_name, column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position;
  `);
  
  const tables: Record<string, any[]> = {};
  for (const row of rows) {
    const t = row.table_name as string;
    if (!tables[t]) tables[t] = [];
    tables[t].push(row);
  }
  
  // also dump foreign keys
  const { rows: fkRows } = await db.execute(sql`
    SELECT
      tc.table_name, kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
    WHERE constraint_type = 'FOREIGN KEY' AND tc.table_schema='public';
  `);

  fs.writeFileSync('db_schema_dump.json', JSON.stringify({ tables, foreignKeys: fkRows }, null, 2));
  console.log('Dumped to db_schema_dump.json');
  process.exit(0);
}

dump().catch(console.error);
