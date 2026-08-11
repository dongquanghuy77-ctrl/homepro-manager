// scripts/check_db_columns.ts
// Quick check: xem cột nào đã có trên DB thực tế
import { db } from '../src/db';
import { sql } from 'drizzle-orm';

async function check() {
  const r = await db.execute(sql`
    SELECT table_name, column_name, data_type
    FROM information_schema.columns
    WHERE table_name IN ('users','monthly_payroll','payslip_disputes')
    ORDER BY table_name, ordinal_position
  `);
  const byTable: Record<string, string[]> = {};
  for (const row of r.rows) {
    const t = String(row.table_name);
    if (!byTable[t]) byTable[t] = [];
    byTable[t].push(String(row.column_name));
  }
  for (const [t, cols] of Object.entries(byTable)) {
    console.log(`\n[${t}]: ${cols.join(', ')}`);
  }
  process.exit(0);
}

check().catch(e => { console.error(e.message); process.exit(1); });
