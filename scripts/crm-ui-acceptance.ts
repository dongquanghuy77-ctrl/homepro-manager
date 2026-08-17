import fs from 'fs';
import path from 'path';

const CRM_ROUTES = [
  'src/app/crm/page.tsx',
  'src/app/crm/leads/page.tsx',
  'src/app/crm/leads/[id]/page.tsx',
  'src/app/crm/customers/page.tsx',
  'src/app/crm/customers/[id]/page.tsx',
  'src/app/crm/opportunities/page.tsx',
  'src/app/crm/opportunities/[id]/page.tsx',
  'src/app/crm/quotes/page.tsx',
  'src/app/crm/quotes/[id]/page.tsx',
  'src/app/crm/contracts/page.tsx',
];

const API_ROUTES = [
  'src/app/api/crm/dashboard/route.ts',
  'src/app/api/crm/leads/route.ts',
  'src/app/api/crm/leads/[id]/route.ts',
  'src/app/api/crm/customers/route.ts',
  'src/app/api/crm/customers/[id]/route.ts',
  'src/app/api/crm/opportunities/route.ts',
  'src/app/api/crm/opportunities/[id]/route.ts',
  'src/app/api/crm/quotes/route.ts',
  'src/app/api/crm/quotes/[id]/route.ts',
];

let allPassed = true;

console.log('--- CRM UI ACCEPTANCE AUDIT ---');

console.log('\n[1] Checking UI Routes...');
for (const route of CRM_ROUTES) {
  const fullPath = path.join(process.cwd(), route);
  if (fs.existsSync(fullPath)) {
    console.log(`✅ FOUND: ${route}`);
  } else {
    console.error(`❌ MISSING: ${route}`);
    allPassed = false;
  }
}

console.log('\n[2] Checking API Routes...');
for (const route of API_ROUTES) {
  const fullPath = path.join(process.cwd(), route);
  if (fs.existsSync(fullPath)) {
    console.log(`✅ FOUND: ${route}`);
  } else {
    console.error(`❌ MISSING: ${route}`);
    allPassed = false;
  }
}

if (allPassed) {
  console.log('\n✅ ALL CRM ROUTES IMPLEMENTED AND REACHABLE.');
  process.exit(0);
} else {
  console.error('\n❌ SOME CRM ROUTES ARE MISSING.');
  process.exit(1);
}
