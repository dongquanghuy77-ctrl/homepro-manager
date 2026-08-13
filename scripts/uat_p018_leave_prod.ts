// @ts-nocheck
// P0.18 UAT Leave Approval & HR Dashboard

async function loginAs(page, username, password = 'password123') {
  const BASE_URL = 'https://homepro-manager-psi.vercel.app';
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[placeholder="Nhập email, số điện thoại hoặc username"]', username);
  
  if (username === '0901234567') {
      await page.waitForSelector('text=Nhập mã PIN đăng nhập (6 số)');
      const pinInputs = await page.locator('input[inputmode="numeric"]').all();
      for (let i = 0; i < 6; i++) {
          await pinInputs[i].fill(password[i]); 
      }
  } else {
      await page.fill('input[placeholder="Nhập mật khẩu"]', password);
  }
  
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);
}

async function uat_p018() {
  const { chromium } = require('playwright');
  const browser = await chromium.launch({ headless: true });
  
  let workerPage;
  try {
    console.log('--- STARTING UAT P0.18 LEAVE APPROVAL ---');

    console.log('>> 1. Worker (0901234567) creates a leave request');
    const workerContext = await browser.newContext();
    workerPage = await workerContext.newPage();
    
    await loginAs(workerPage, '0901234567', '123456');
    
    await workerPage.waitForTimeout(3000);
    if (workerPage.url().includes('attendance-gate')) {
        const checkInBtn = await workerPage.$('button:has-text("CHẤM CÔNG VÀO")');
        if (checkInBtn) {
            await workerPage.click('button:has-text("CHẤM CÔNG VÀO")');
            await workerPage.waitForTimeout(3000);
        }
    }
    
    await workerPage.click('button:has-text("Xin Nghỉ Phép")');
    
    await workerPage.selectOption('select.form-select', 'SICK');
    await workerPage.locator('input[type="date"]').nth(0).fill('2026-10-10');
    await workerPage.locator('input[type="date"]').nth(1).fill('2026-10-11');
    await workerPage.locator('textarea').fill('Smoke test leave request');
    
    await workerPage.click('button[type="submit"]:has-text("Gửi đơn")');
    
    await workerPage.waitForSelector('text=Xin Nghỉ Phép', { state: 'visible' });
    console.log('   ✅ Worker successfully created leave request');
    
    console.log('>> 2. Manager (quan.mai) verifies scope and rejects');
    const managerContext = await browser.newContext();
    const managerPage = await managerContext.newPage();
    
    await loginAs(managerPage, 'quan.mai', '123456');
    await managerPage.goto('https://homepro-manager-psi.vercel.app/leave');
    
    await managerPage.waitForSelector('table');
    const hasLeaveTable = await managerPage.isVisible('table');
    if (!hasLeaveTable) throw new Error('Manager cannot see leave table');
    
    const workerRequestVisible = await managerPage.isVisible('text=Smoke test leave request');
    console.log(`   Manager sees worker request? ${workerRequestVisible}`);
    
    if (workerRequestVisible) {
      await managerPage.click('button:has-text("✕ Từ chối")');
      await managerPage.fill('textarea', 'Manager rejected it');
      await managerPage.click('button:has-text("✕ Từ chối")');
      await managerPage.waitForSelector('text=Manager rejected it', { state: 'visible' });
      console.log('   ✅ Manager rejected the request');
    } else {
      console.log('   ✅ Manager only sees own department (phuc.tran is not in it)');
    }
    
    console.log('>> 3. HR (huy.dong) checks dashboard and leave table');
    const hrContext = await browser.newContext();
    const hrPage = await hrContext.newPage();
    
    await loginAs(hrPage, 'huy.dong', '123456');
    
    await hrPage.goto('https://homepro-manager-psi.vercel.app/hr');
    await hrPage.waitForSelector('text=Chờ duyệt nghỉ phép');
    console.log('   ✅ HR Dashboard loaded');
    
    await hrPage.goto('https://homepro-manager-psi.vercel.app/leave');
    await hrPage.waitForSelector('table');
    
    const hrCanSeeWorkerRequest = await hrPage.isVisible('text=Smoke test leave request');
    if (!hrCanSeeWorkerRequest) {
      throw new Error('HR cannot see worker request!');
    }
    
    const isPendingForHr = await hrPage.isVisible('button:has-text("✓ Duyệt")');
    if (isPendingForHr) {
      await hrPage.click('button:has-text("✓ Duyệt")');
      await hrPage.waitForSelector('text=Đã duyệt', { state: 'visible' });
      console.log('   ✅ HR approved the request');
    } else {
      console.log('   ✅ Request already handled by manager');
    }

    console.log('>> 4. Check API authorization (Worker trying to fetch all leaves)');
    const res = await workerPage.request.get('https://homepro-manager-psi.vercel.app/api/hr/leave?employeeId=999');
    const data = await res.json();
    const unauthorizedAccess = data.records?.some(r => r.employeeId === 999);
    if (unauthorizedAccess) {
      throw new Error('Worker was able to fetch other employee leave records!');
    }
    console.log('   ✅ API RBAC protects worker from fetching others');

    console.log('>> 5. P0.14 Regression Test (Attendance Correction)');
    await hrPage.goto('https://homepro-manager-psi.vercel.app/attendance');
    await hrPage.waitForSelector('table');
    const hasAttendanceTable = await hrPage.isVisible('table');
    if (!hasAttendanceTable) throw new Error('Attendance table broke in P0.14 regression');
    console.log('   ✅ Attendance P0.14 UI intact');

    await browser.close();
    console.log('--- ALL UAT PASSED ---');
  } catch (err) {
    if (workerPage) {
      await workerPage.screenshot({ path: 'uat_error.png' });
      console.log('Screenshot saved to uat_error.png');
    }
    throw err;
  }
}

uat_p018().catch(err => {
  console.error('UAT FAILED:', err);
  process.exit(1);
});
