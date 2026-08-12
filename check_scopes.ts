import { loadEnvConfig } from '@next/env';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { DbPermissionRepository } from './src/lib/permissions/repository';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function main() {
  const repo = new DbPermissionRepository();
  const s1 = await repo.getAllowedScopes('ACCOUNTANT', 'employee.read.all');
  const s2 = await repo.getAllowedScopes('ACCOUNTANT', 'payroll.read.all');
  console.log('employee.read.all:', s1);
  console.log('payroll.read.all:', s2);
  process.exit(0);
}

main().catch(console.error);
