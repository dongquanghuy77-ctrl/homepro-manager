import { chromium } from 'playwright';

// Testing locally first, or Prod URL if deployed.
const BASE_URL = 'http://localhost:3000';

async function loginAs(page: any, username: string, password = 'password123') {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[placeholder="Nhập email, số điện thoại hoặc username"]', username);
  if (username === '0901234567') {
    await page.fill('input[placeholder="Mật khẩu"]', '123456');
  } else {
    await page.fill('input[placeholder="Mật khẩu"]', password);
  }
  await page.click('button[type="submit"]');
  await page.waitForURL('**/');
}

async function uat_payroll() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log('--- STARTING UAT PAYROLL (P1) ---');

  try {
    // 1. Accountant (letramkt) calculates payroll
    console.log('>> 1. Accountant (letramkt) accesses Payroll');
    await loginAs(page, 'letramkt');
    
    // Go to Payroll
    await page.goto(`${BASE_URL}/payroll`);
    await page.waitForSelector('text=Lương & Phúc lợi', { timeout: 10000 });
    
    // 2. Worker (demo) tries to access Payroll Calculation (should fail/hide)
    console.log('>> 2. Staff (demo) attempts to calculate payroll');
    await loginAs(page, 'demo');
    const apiRes = await page.request.post(`${BASE_URL}/api/hr/payroll/calculate`, {
      data: { month: 8, year: 2026 }
    });
    console.log(`   Staff API response status: ${apiRes.status()}`);
    if (apiRes.status() !== 403) throw new Error('RBAC Failed: Staff should get 403');
    console.log('   ✅ API RBAC protects calculation endpoint');

    console.log('--- ALL PAYROLL UAT PASSED ---');
  } catch (error) {
    console.error('UAT FAILED:', error);
    await page.screenshot({ path: 'uat_error_payroll.png' });
    process.exit(1);
  } finally {
    await browser.close();
  }
}

uat_payroll().catch(console.error);
