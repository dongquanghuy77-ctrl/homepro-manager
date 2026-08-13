import { chromium } from 'playwright';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('Testing account: demo');
  await page.goto('http://localhost:3000/login');
  
  // Fill credentials
  await page.fill('input[type="text"], input[type="email"]', 'demo');
  await page.fill('input[type="password"]', '123456');
  
  // Click login
  await page.click('button[type="submit"]');
  
  // Wait for navigation or a bit of time
  try {
    await page.waitForNavigation({ timeout: 5000, waitUntil: 'networkidle' });
  } catch(e) {
    console.log('Navigation wait timeout or no navigation occurred');
  }
  
  // Wait extra 2 seconds just in case client side routing is slow
  await page.waitForTimeout(2000);
  
  const currentUrl = page.url();
  console.log('Current URL:', currentUrl);
  
  // Get cookies
  const cookies = await context.cookies();
  console.log('Cookies:', cookies.map(c => c.name));
  
  // Fetch /api/auth/me using browser
  const meRes = await page.evaluate(async () => {
    const res = await fetch('/api/auth/me');
    return res.json();
  });
  console.log('/api/auth/me response:', meRes);
  
  await browser.close();
}

run().catch(console.error);
