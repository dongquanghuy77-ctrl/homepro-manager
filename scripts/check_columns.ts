import { loadEnvConfig } from '@next/env';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.uat') });

import { db } from '../src/db';

async function check() {
  const res = await (db as any).execute('SELECT column_name FROM information_schema.columns WHERE table_name = \'monthly_payroll\'');
  console.log(res.rows.map((r: any) => r.column_name));
  process.exit(0);
}

check().catch(console.error);
