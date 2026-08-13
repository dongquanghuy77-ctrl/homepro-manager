import { chromium } from 'playwright';
import fs from 'fs';

const accounts = [
  'demo',       // STAFF
  'phuc.tran',  // WORKER
  'admin',      // ADMIN
  'viewer',     // VIEWER / BOD
  'manager',    // MANAGER
  'hra',        // HR
  'letramkt',   // ACCOUNTANT
  'worker',     // WORKER
];

async function run() {
  const browser = await chromium.launch({ headless: true });
  const report: any[] = [];

  for (const account of accounts) {
    console.log(`\n=============================`);
    console.log(`Testing account: ${account}`);
    
    const context = await browser.newContext();
    const page = await context.newPage();

    let loginStatus = 0;
    let loginResponse: any = null;

    page.on('response', async (response) => {
      if (response.url().includes('/api/auth/login') && response.request().method() === 'POST') {
        loginStatus = response.status();
        try {
          loginResponse = await response.json();
        } catch (e) {
          loginResponse = null;
        }
      }
    });

    try {
      await page.goto('http://localhost:3000/login');
      await page.waitForLoadState('networkidle');
      
      await page.fill('input[type="text"], input[type="email"]', account);
      await page.fill('input[type="password"]', '123456');
      
      await page.click('button[type="submit"]');
      
      let finalUrl = '';
      try {
        await page.waitForNavigation({ timeout: 2000, waitUntil: 'networkidle' });
      } catch(e) {
      }
      // Add explicit wait for Next.js soft navigation
      await page.waitForTimeout(2000);
      finalUrl = page.url();
      
      // GET /api/auth/me
      const meRes = await page.evaluate(async () => {
        try {
          const res = await fetch('/api/auth/me');
          if (!res.ok) return { error: 'Not logged in' };
          return await res.json();
        } catch (err) {
          return { error: 'Fetch failed' };
        }
      });
      
      // Get Sidebar Menus
      const sidebarMenus = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('aside a, nav a, .sidebar a, [role="navigation"] a'));
        return links.map(el => (el as HTMLElement).innerText.trim()).filter(t => t);
      });

      const bodyText = await page.evaluate(() => document.body.innerText);
      let dashboardRendered = 'UNKNOWN';
      if (finalUrl.includes('/login') && bodyText.includes('Đăng nhập thất bại')) {
        dashboardRendered = 'LỖI ĐĂNG NHẬP';
      } else if (finalUrl.includes('/attendance-gate') && bodyText.includes('Chấm Công Hôm Nay')) {
        dashboardRendered = 'GATE: CHẤM CÔNG';
      } else if (bodyText.includes('Đăng xuất') || bodyText.includes('Tổng quan') || bodyText.includes('Dự án')) {
        dashboardRendered = 'DASHBOARD RENDERED';
      }

      const result = {
        Account: account,
        Login_Status: loginStatus,
        JWT_Role: loginResponse?.user?.role || 'null',
        ME_Username: meRes?.user?.username || 'null',
        ME_Role: meRes?.user?.role || 'null',
        ME_Department: meRes?.user?.department || 'null',
        URL_After_Login: new URL(finalUrl).pathname,
        Dashboard_UI: dashboardRendered,
        Sidebar_Menus: Array.from(new Set(sidebarMenus)).join(', ') || 'None',
        Redirect_Mismatch: (new URL(finalUrl).pathname === '/login' && loginStatus === 200) ? 'YES (Stuck on /login)' : 'NO'
      };

      report.push(result);
      console.log(result);
      
    } catch (err) {
      console.error('Error during test:', err);
    } finally {
      await context.close();
    }
  }

  await browser.close();

  // Print markdown table
  console.log(`\n\n### FINAL REPORT MATRIX`);
  console.log(`| Account | Login | JWT Role | ME Role | ME Dept | Final URL | Dashboard UI | Mismatch? | Menus |`);
  console.log(`|---------|-------|----------|---------|---------|-----------|--------------|-----------|-------|`);
  for (const r of report) {
    console.log(`| ${r.Account} | ${r.Login_Status} | ${r.JWT_Role} | ${r.ME_Role} | ${r.ME_Department} | ${r.URL_After_Login} | ${r.Dashboard_UI} | ${r.Redirect_Mismatch} | ${r.Sidebar_Menus.substring(0, 50)}... |`);
  }
}

run().catch(console.error);
