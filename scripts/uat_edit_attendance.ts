import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:3000'; // Test local first before vercel

async function run() {
  const browser = await chromium.launch({ headless: true });
  
  // 1. Test as WORKER (should NOT see edit button)
  console.log('Testing as WORKER (phuc.tran)...');
  const workerContext = await browser.newContext();
  const workerPage = await workerContext.newPage();
  await workerPage.goto(`${BASE_URL}/login`);
  await workerPage.fill('input[type="text"]', 'phuc.tran');
  await workerPage.fill('input[type="password"]', '123456');
  await workerPage.click('button[type="submit"]');
  await workerPage.waitForURL('**/nhan-vien');
  
  // wait for react to render
  await workerPage.waitForTimeout(2000);
  
  const editBtnVisible = await workerPage.locator('button:has-text("✏️ Sửa")').isVisible();
  console.log(`WORKER sees edit button: ${editBtnVisible} (Expected: false)`);
  if (editBtnVisible) {
      console.error("FAIL: Worker should not see edit button!");
      process.exit(1);
  }
  await workerContext.close();

  // 2. Test as ADMIN (should see edit button and can edit)
  console.log('Testing as ADMIN (admin)...');
  const adminContext = await browser.newContext({
    permissions: ['geolocation'],
    geolocation: { latitude: 10.762622, longitude: 106.660172 }
  });
  const adminPage = await adminContext.newPage();
  await adminPage.goto(`${BASE_URL}/login`);
  await adminPage.fill('input[type="text"]', 'admin');
  await adminPage.fill('input[type="password"]', '123456');
  await adminPage.click('button[type="submit"]');
  
  // wait for login to finish
  await adminPage.waitForTimeout(3000);
  
  // Need to go to /nhan-vien because admin dashboard is /
  await adminPage.goto(`${BASE_URL}/nhan-vien`);
  await adminPage.waitForTimeout(2000);

  // Admin must have a todayRecord to edit. Let's click "VÀO CA GPS" if available
  const checkInBtn = adminPage.locator('button:has-text("VÀO CA GPS")');
  if (await checkInBtn.isVisible() && await checkInBtn.isEnabled()) {
      await checkInBtn.click();
      await adminPage.waitForTimeout(3000); // wait for GPS and API
  }

  const adminEditBtn = adminPage.locator('button:has-text("✏️ Sửa")');
  await adminPage.screenshot({ path: 'debug_admin.png' });
  const adminCanEdit = await adminEditBtn.isVisible();
  console.log(`ADMIN sees edit button: ${adminCanEdit} (Expected: true)`);
  if (!adminCanEdit) {
      console.error("FAIL: Admin should see edit button!");
      process.exit(1);
  }

  // Click edit
  await adminEditBtn.click();
  await adminPage.waitForTimeout(500);

  // Fill modal
  await adminPage.fill('textarea[placeholder="Nhập lý do điều chỉnh bắt buộc..."]', 'Admin test edit attendance reason');
  
  // Submit
  await adminPage.click('button[type="submit"]:has-text("Lưu thay đổi")');
  
  // Wait for success
  await adminPage.waitForTimeout(2000);
  
  // Check if success alert is shown or modal is closed
  const modalVisible = await adminPage.locator('h3:has-text("Chỉnh Sửa Giờ Công")').isVisible();
  console.log(`Modal still visible after save: ${modalVisible} (Expected: false)`);
  if (modalVisible) {
      console.error("FAIL: Modal should be closed on success!");
      process.exit(1);
  }

  console.log("All UAT tests PASS!");
  await browser.close();
}

run().catch(console.error);
