import { loadEnvConfig } from '@next/env';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.uat') });

import { db } from '../src/db';

async function fixLate() {
  await (db as any).execute("UPDATE attendance SET late_minutes = 30 WHERE status = 'LATE'");
  console.log('[OK] Updated late_minutes to 30 for LATE status');
  
  // also need to delete monthly_payroll because it's PUBLISHED and calculation won't overwrite it
  await (db as any).execute("DELETE FROM monthly_payroll WHERE month=7 AND year=2026");
  console.log('[OK] Cleared monthly_payroll');
  
  process.exit(0);
}

fixLate().catch(console.error);
