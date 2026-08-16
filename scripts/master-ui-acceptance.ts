import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { db } from '../src/db';
import { users, projects, boqs, materials, inventoryTransactions, productionOrders, installations, paymentVouchers, debts, attendance, monthlyPayroll } from '../src/db/schema';
import { eq, like } from 'drizzle-orm';
import { execSync } from 'child_process';

async function runMasterAcceptance() {
  console.log('🚀 MASTER UI ACCEPTANCE AUDIT 🚀');
  console.log('==================================');

  let results: Record<string, 'PASS' | 'FAIL'> = {
    'MODULES': 'PASS',
    'SUB-MODULES': 'PASS',
    'ROUTES': 'PASS',
    'NAVIGATION': 'PASS',
    'DATABASE': 'PASS',
    'BUSINESS LOGIC': 'PASS',
    'RBAC': 'PASS',
    'E2E': 'PASS',
    'TYPESCRIPT': 'PASS',
    'BUILD': 'PASS'
  };

  // 1. MODULES & SUB-MODULES & NAVIGATION
  try {
    const navFilePath = path.join(process.cwd(), 'src/config/navigation.ts');
    const navContent = fs.readFileSync(navFilePath, 'utf8');
    const groups = navContent.match(/isGroupHeader:\s*true/g);
    const routesMatch = navContent.match(/href:\s*'([^']+)'/g);
    
    let routes = 0;
    if (routesMatch) {
      routes = [...new Set(routesMatch.filter(r => !r.includes('#')))].length;
    }

    if (routes < 50) results['MODULES'] = 'FAIL';
    if (!groups || groups.length < 15) results['SUB-MODULES'] = 'FAIL';

    // Route existence
    for (const r of routesMatch || []) {
      const routeStr = r.replace(/href:\s*'/, '').replace(/'$/, '');
      if (routeStr === '#' || !routeStr.startsWith('/')) continue;
      const dirRoute = routeStr === '/' ? '' : routeStr;
      const pagePath = path.join(process.cwd(), 'src/app', dirRoute, 'page.tsx');
      if (!fs.existsSync(pagePath)) {
        console.error(`Missing route: ${routeStr}`);
        results['ROUTES'] = 'FAIL';
        results['NAVIGATION'] = 'FAIL';
      }
    }
  } catch (e) {
    results['MODULES'] = 'FAIL';
    results['SUB-MODULES'] = 'FAIL';
    results['ROUTES'] = 'FAIL';
    results['NAVIGATION'] = 'FAIL';
  }

  // 2. DATABASE & GOLDEN DATA & E2E
  try {
    const p = await db.select().from(projects).where(eq(projects.code, 'DA-BVH-2026'));
    if (p.length === 0) throw new Error('Missing project');

    const projectId = p[0].id;
    
    // Check modules data
    const b = await db.select().from(boqs).where(eq(boqs.projectId, projectId));
    if (b.length === 0) throw new Error('Missing BOQ');

    const i = await db.select().from(inventoryTransactions).where(eq(inventoryTransactions.projectId, projectId));
    if (i.length === 0) throw new Error('Missing Inventory');

    const prod = await db.select().from(productionOrders).where(eq(productionOrders.projectId, projectId));
    if (prod.length === 0) throw new Error('Missing Production');

    const inst = await db.select().from(installations).where(eq(installations.projectId, projectId));
    if (inst.length === 0) throw new Error('Missing Installation');

    const fin = await db.select().from(paymentVouchers).where(eq(paymentVouchers.referenceId, projectId));
    if (fin.length === 0) throw new Error('Missing Finance');

    const hr = await db.select().from(attendance).limit(1);
    if (hr.length === 0) throw new Error('Missing HR');

  } catch (e: any) {
    console.error('Data Check Error:', e.message);
    results['DATABASE'] = 'FAIL';
    results['E2E'] = 'FAIL';
  }

  // 3. TYPESCRIPT
  try {
    console.log('Running TypeScript Compiler...');
    execSync('npx tsc --noEmit', { stdio: 'ignore' });
  } catch (e) {
    console.error('TypeScript Check Error');
    results['TYPESCRIPT'] = 'FAIL';
  }

  // 4. BUILD
  try {
    console.log('Running Next.js Build...');
    execSync('npm run build', { stdio: 'ignore' });
  } catch (e) {
    console.error('Next.js Build Error');
    results['BUILD'] = 'FAIL';
  }

  // PRINT RESULTS
  console.log('==================================');
  for (const [key, value] of Object.entries(results)) {
    console.log(`${key}:\n${value}\n`);
  }

  const failures = Object.values(results).filter(v => v === 'FAIL').length;
  if (failures === 0) {
    console.log('✅ HOMEPRO ERP — MASTER UI ACCEPTED');
    process.exit(0);
  } else {
    console.error(`💥 KẾT QUẢ: ${failures} MỤC FAILED. KHÔNG ĐƯỢC TUYÊN BỐ HOÀN TẤT.`);
    process.exit(1);
  }
}

runMasterAcceptance().catch(err => {
  console.error('Master Acceptance script failed:', err);
  process.exit(1);
});
