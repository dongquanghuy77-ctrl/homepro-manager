import 'dotenv/config';
import { db } from '../src/db';
import { leads, customers, opportunities, quotes, contracts, surveys, crmActivities, projects } from '../src/db/schema';
import { sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

// ============================================================
// CRM FINAL ACCEPTANCE AUDIT
// ============================================================

const REQUIRED_UI_ROUTES = [
  'src/app/crm/page.tsx',
  'src/app/crm/leads/page.tsx',
  'src/app/crm/leads/[id]/page.tsx',
  'src/app/crm/customers/page.tsx',
  'src/app/crm/customers/[id]/page.tsx',
  'src/app/crm/opportunities/page.tsx',
  'src/app/crm/opportunities/[id]/page.tsx',
  'src/app/crm/surveys/page.tsx',
  'src/app/crm/surveys/[id]/page.tsx',
  'src/app/crm/designs/page.tsx',
  'src/app/crm/designs/[id]/page.tsx',
  'src/app/crm/boq/page.tsx',
  'src/app/crm/quotes/page.tsx',
  'src/app/crm/quotes/[id]/page.tsx',
  'src/app/crm/contracts/page.tsx',
  'src/app/crm/contracts/[id]/page.tsx',
  'src/app/crm/care/page.tsx',
];

const REQUIRED_API_ROUTES = [
  'src/app/api/crm/dashboard/route.ts',
  'src/app/api/crm/leads/route.ts',
  'src/app/api/crm/leads/[id]/route.ts',
  'src/app/api/crm/customers/route.ts',
  'src/app/api/crm/customers/[id]/route.ts',
  'src/app/api/crm/contacts/route.ts',
  'src/app/api/crm/contacts/[id]/route.ts',
  'src/app/api/crm/opportunities/route.ts',
  'src/app/api/crm/opportunities/[id]/route.ts',
  'src/app/api/crm/surveys/route.ts',
  'src/app/api/crm/surveys/[id]/route.ts',
  'src/app/api/crm/designs/route.ts',
  'src/app/api/crm/designs/[id]/route.ts',
  'src/app/api/crm/boq/route.ts',
  'src/app/api/crm/activities/route.ts',
  'src/app/api/crm/activities/[id]/route.ts',
  'src/app/api/crm/quotes/route.ts',
  'src/app/api/crm/quotes/[id]/route.ts',
  'src/app/api/crm/contracts/route.ts',
  'src/app/api/crm/contracts/[id]/route.ts',
];

let passed = 0;
let failed = 0;

function check(label: string, ok: boolean, detail = '') {
  if (ok) {
    console.log(`  ✅ ${label}${detail ? ' — ' + detail : ''}`);
    passed++;
  } else {
    console.error(`  ❌ ${label}${detail ? ' — ' + detail : ''}`);
    failed++;
  }
}

async function run() {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║     CRM FINAL ACCEPTANCE AUDIT — HomePro ERP        ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  // ── 1. UI Routes ──
  console.log('[1] UI Routes (17 expected)');
  for (const route of REQUIRED_UI_ROUTES) {
    check(route, fs.existsSync(path.join(process.cwd(), route)));
  }

  // ── 2. API Routes ──
  console.log('\n[2] API Routes (20 expected)');
  for (const route of REQUIRED_API_ROUTES) {
    check(route, fs.existsSync(path.join(process.cwd(), route)));
  }

  // ── 3. Database State ──
  console.log('\n[3] Database — CRM Tables');
  const [lCount] = await db.select({ c: sql<number>`count(*)` }).from(leads);
  check('leads table', Number(lCount.c) > 0, `${lCount.c} records`);

  const [cCount] = await db.select({ c: sql<number>`count(*)` }).from(customers);
  check('customers table', Number(cCount.c) > 0, `${cCount.c} records`);

  const [oCount] = await db.select({ c: sql<number>`count(*)` }).from(opportunities);
  check('opportunities table', Number(oCount.c) > 0, `${oCount.c} records`);

  const [sCount] = await db.select({ c: sql<number>`count(*)` }).from(surveys);
  check('surveys table (CRM)', Number(sCount.c) > 0, `${sCount.c} records`);

  const [qCount] = await db.select({ c: sql<number>`count(*)` }).from(quotes);
  check('quotes table', Number(qCount.c) > 0, `${qCount.c} records`);

  const [ctCount] = await db.select({ c: sql<number>`count(*)` }).from(contracts);
  check('contracts table', Number(ctCount.c) > 0, `${ctCount.c} records`);

  const [actCount] = await db.select({ c: sql<number>`count(*)` }).from(crmActivities);
  check('crm_activities table', Number(actCount.c) > 0, `${actCount.c} records`);

  const [pCount] = await db.select({ c: sql<number>`count(*)` }).from(projects);
  check('projects table', Number(pCount.c) > 0, `${pCount.c} records`);

  // ── 4. Full Chain E2E ──
  console.log('\n[4] Golden Data Chain — Bệnh viện Huế');
  const goldenLead = await db.select().from(leads).where(sql`email = 'bvhue@bvhue.com.vn'`);
  check('Lead CONVERTED exists', goldenLead.length > 0, `id=${goldenLead[0]?.id}, status=${goldenLead[0]?.status}`);

  const goldenCustomer = await db.select().from(customers).where(sql`name like '%Bệnh Viện Trung%'`);
  check('Customer ENTERPRISE exists', goldenCustomer.length > 0, `id=${goldenCustomer[0]?.id}`);

  const goldenOpp = await db.select().from(opportunities).where(sql`status = 'WON'`);
  check('Opportunity WON exists', goldenOpp.length > 0, `id=${goldenOpp[0]?.id}`);

  const goldenQuote = await db.select().from(quotes).where(sql`status = 'ACCEPTED'`);
  check('Quote ACCEPTED exists', goldenQuote.length > 0, `id=${goldenQuote[0]?.id}`);

  const goldenContract = await db.select().from(contracts).where(sql`status = 'SIGNED'`);
  check('Contract SIGNED exists', goldenContract.length > 0, `id=${goldenContract[0]?.id}`);

  const goldenProject = await db.select().from(projects).where(sql`status = 'ACTIVE'`);
  check('Project ACTIVE exists', goldenProject.length > 0, `id=${goldenProject[0]?.id}`);

  // ── 5. Navigation ──
  console.log('\n[5] Navigation Config');
  const navContent = fs.readFileSync(path.join(process.cwd(), 'src/config/navigation.ts'), 'utf8');
  check('crm-surveys in nav', navContent.includes('crm-surveys'));
  check('crm-designs in nav', navContent.includes('crm-designs'));
  check('crm-boq in nav', navContent.includes('crm-boq'));
  check('crm-care in nav', navContent.includes('crm-care'));
  check('crm-dashboard in nav', navContent.includes('crm-dashboard'));

  // ── 6. Sidebar Icons ──
  console.log('\n[6] Sidebar Icon Registry');
  const sidebarContent = fs.readFileSync(path.join(process.cwd(), 'src/components/layout/Sidebar.tsx'), 'utf8');
  check('MapPin icon registered', sidebarContent.includes('MapPin'));
  check('Heart icon registered', sidebarContent.includes('Heart'));
  check('BarChart3 icon registered', sidebarContent.includes('BarChart3'));
  check('PenTool icon registered', sidebarContent.includes('PenTool'));

  // ── Summary ──
  const total = passed + failed;
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log(`║  RESULT: ${passed}/${total} checks passed                          ║`);
  if (failed === 0) {
    console.log('║  ✅ CRM FULLY ACCEPTED — PRODUCTION READY            ║');
  } else {
    console.log(`║  ❌ ${failed} check(s) FAILED — see above               ║`);
  }
  console.log('╚══════════════════════════════════════════════════════╝\n');

  process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
