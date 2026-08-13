import { chromium } from 'playwright';

async function runTest() {
  console.log('Starting Master Dashboard UAT...');
  const browser = await chromium.launch({ headless: true });
  
  try {
    const context = await browser.newContext();
    const page = await context.newPage();

    // 1. Admin Login
    console.log('Logging in as ADMIN (admin/123456)...');
    await page.goto('http://localhost:3000/login');
    await page.fill('input[placeholder="Nhập email, số điện thoại hoặc username"]', 'admin');
    await page.fill('input[placeholder="Nhập mật khẩu"]', '123456');
    await page.click('button[type="submit"]');

    // Wait for Dashboard to load
    await page.waitForURL('http://localhost:3000/');
    console.log('Login successful.');

    // 2. Check Dashboard Components
    console.log('Verifying Dashboard Components...');
    
    // Wait for shell
    await page.waitForSelector('.page-container');
    
    // Check Action Center
    const actionCenterText = await page.textContent('.card-title:has-text("Action Center")');
    if (!actionCenterText) throw new Error('Action Center missing');
    
    // Check Activity Feed
    const activityFeedText = await page.textContent('.card-title:has-text("Hoạt động gần đây")');
    if (!activityFeedText) throw new Error('Activity Feed missing');

    console.log('Admin Dashboard UI verified.');
    console.log('MASTER DASHBOARD UAT: PASS');

  } catch (error) {
    console.error('MASTER DASHBOARD UAT: FAIL', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runTest();
