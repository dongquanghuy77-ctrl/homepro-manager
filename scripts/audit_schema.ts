// scripts/audit_schema.ts
import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());
import * as schema from '../src/db/schema';
import { getTableName, getTableColumns } from 'drizzle-orm';
import fs from 'fs';

const dbDump = JSON.parse(fs.readFileSync('db_schema_dump.json', 'utf8'));
const tablesInDb = dbDump.tables;
const fksInDb = dbDump.foreignKeys;

const report: string[] = [
  '# SCHEMA DRIFT REPORT',
  '**Status:** AUDIT COMPLETED',
  '',
  'This report compares the Drizzle ORM schema (`src/db/schema.ts`) against the actual Neon PostgreSQL database schema.',
  ''
];

const importantTables = [
  'leave_requests', 'users', 'departments', 'manager_departments', 
  'attendance', 'leave_types', 'payroll_records'
];

for (const key of Object.keys(schema)) {
  const table = (schema as any)[key];
  if (!table || typeof table !== 'object') continue;
  
  let tableName;
  try {
    tableName = getTableName(table);
  } catch (e) {
    continue; // Not a table
  }

  if (!importantTables.includes(tableName)) continue;

  report.push(`## Table: \`${tableName}\``);
  
  const dbColumns = tablesInDb[tableName];
  if (!dbColumns) {
    report.push(`- **MISSING_IN_DB**: Table \`${tableName}\` does not exist in the database.\n`);
    continue;
  }

  const drizzleColumns = getTableColumns(table);
  const dbColMap = new Map<string, any>(dbColumns.map((c: any) => [c.column_name, c]));
  
  for (const [colKey, colDef] of Object.entries(drizzleColumns) as [string, any][]) {
    const colName = colDef.name;
    const dbCol = dbColMap.get(colName);
    
    if (!dbCol) {
      report.push(`- **MISSING_IN_DB**: Column \`${colName}\` is defined in Drizzle but missing in the actual DB.`);
    } else {
      // compare types or nullability if possible, basic checks
      let typeMatch = true;
      let note = '';
      
      const dbType = dbCol.data_type;
      const drizzleType = colDef.columnType;
      // Very basic type comparison
      // ...
      
      if (colDef.notNull && dbCol.is_nullable === 'YES') {
        report.push(`- **TYPE_MISMATCH**: Column \`${colName}\` is NOT NULL in Drizzle but NULLABLE in DB.`);
      }
      
      dbColMap.delete(colName);
    }
  }

  for (const remainingCol of dbColMap.keys()) {
    report.push(`- **MISSING_IN_SCHEMA**: Column \`${remainingCol}\` exists in DB but is missing in Drizzle schema.`);
  }

  // FK check basic
  const tableFks = fksInDb.filter((fk: any) => fk.table_name === tableName);
  // Just list the FKs in DB to see if they match expectations
  if (tableFks.length > 0) {
    report.push(`\n**Database Foreign Keys:**`);
    for (const fk of tableFks) {
      report.push(`- \`${fk.column_name}\` -> \`${fk.foreign_table_name}(${fk.foreign_column_name})\``);
    }
  } else {
    report.push(`\n- No Foreign Keys in DB.`);
  }

  report.push('');
}

fs.writeFileSync('SCHEMA_DRIFT_REPORT.md', report.join('\n'));
console.log('Generated SCHEMA_DRIFT_REPORT.md');
process.exit(0);
