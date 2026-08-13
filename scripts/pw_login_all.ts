import { chromium } from 'playwright';

const accounts = [
  'demo',
  'phuc.tran',
  'admin',
  'viewer',
  'managera',
  'hra',
  'letramkt',
  'worker',
  'staff',
  'designer'
];

async function run() {
  const browser = await chromium.launch({ headless: true });

  for (const account of accounts) {
    console.log(`\n=============================`);
    console.log(`Testing account: ${account}`);
    
    const context = await browser.newContext();
    const page = await context.newPage();

    let loginPass = false;
    let loginResponse: any = null;
    let loginStatus = 0;

    // Monitor network to get /api/auth/login response
    page.on('response', async (response) => {
      if (response.url().includes('/api/auth/login') && response.request().method() === 'POST') {
        loginStatus = response.status();
        try {
          loginResponse = await response.json();
        } catch (e) {
          loginResponse = { error: 'Failed to parse JSON' };
        }
      }
    });

    try {
      await page.goto('http://localhost:3000/login');
      await page.waitForLoadState('networkidle');
      
      // Fill credentials
      await page.fill('input[type="text"], input[type="email"]', account);
      await page.fill('input[type="password"]', '123456');
      
      // Click login
      await page.click('button[type="submit"]');
      
      // Wait for navigation or timeout
      try {
        await page.waitForNavigation({ timeout: 4000, waitUntil: 'networkidle' });
      } catch(e) {
        // Might be soft navigation
      }
      
      await page.waitForTimeout(2000); // give some extra time for client routing
      
      console.log(`LOGIN FORM -> POST /api/auth/login`);
      console.log(`HTTP status -> ${loginStatus}`);
      console.log(`response ->`, loginResponse);

      const cookies = await context.cookies();
      const hasSession = cookies.some(c => c.name === 'homepro_session');
      console.log(`cookie/session được tạo hay không -> ${hasSession ? 'CÓ' : 'KHÔNG'}`);

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
      
      console.log(`GET /api/auth/me ->`, meRes);

      const finalUrl = page.url();
      console.log(`redirect thực tế -> ${new URL(finalUrl).pathname}`);

      // Check UI elements to see what was rendered
      const bodyText = await page.evaluate(() => document.body.innerText);
      let uiResult = 'UNKNOWN';
      if (finalUrl.includes('/login') && bodyText.includes('Đăng nhập thất bại')) {
        uiResult = 'LỖI ĐĂNG NHẬP';
      } else if (finalUrl.includes('/attendance-gate') && bodyText.includes('Chấm Công Hôm Nay')) {
        uiResult = 'MÀN HÌNH CHẤM CÔNG';
      } else if (bodyText.includes('Đăng xuất') || bodyText.includes('Tổng quan') || bodyText.includes('Dự án')) {
        uiResult = 'DASHBOARD';
      }
      
      console.log(`UI thực tế sau redirect -> ${uiResult}`);
      
      // We know there's a bug if they are stuck on attendance-gate when they are ALREADY CHECKED IN
      // For this script, we just report everything clearly.
      
    } catch (err) {
      console.error('Error during test:', err);
    }

    await context.close();
  }

  await browser.close();
}

run().catch(console.error);
