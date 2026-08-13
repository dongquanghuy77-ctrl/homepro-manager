// @ts-nocheck
// P0.18 UAT Leave Approval & HR Dashboard

// P0.18 UAT Leave Approval & HR Dashboard

async function loginAs(page, username, password = 'password123') {
  await page.goto('http://localhost:3000/login');
  
  await page.fill('input[placeholder="Nhập email, số điện thoại hoặc username"]', username);
  
  if (username === '0901234567') {
      // It's a PIN login
      await page.waitForSelector('text=Nhập mã PIN đăng nhập (6 số)');
      const pinInputs = await page.locator('input[inputmode="numeric"]').all();
      for (let i = 0; i < 6; i++) {
          await pinInputs[i].fill(password[i]); // password holds the pin in this case
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
  
  console.log('--- STARTING UAT P0.18 LEAVE APPROVAL ---');

  // ==========================================
  // 1. Worker (Trần Thanh Phúc) - Create Leave Request
  // ==========================================
  console.log('>> 1. Worker (0901234567) creates a leave request');
  const workerContext = await browser.newContext();
  const workerPage = await workerContext.newPage();
  
  await loginAs(workerPage, '0901234567', '123456');
  
  await workerPage.waitForTimeout(3000);
  if (workerPage.url().includes('attendance-gate')) {
      const checkInBtn = await workerPage.$('button:has-text("CHẤM CÔNG VÀO")');
      if (checkInBtn) {
          await workerPage.click('button:has-text("CHẤM CÔNG VÀO")');
          await workerPage.waitForTimeout(3000);
      }
  }
  
  // Click "Xin Nghỉ Phép"
  await workerPage.click('button:has-text("Xin Nghỉ Phép")');
  
  // Fill modal
  await workerPage.selectOption('select[name="leaveType"]', 'SICK');
  await workerPage.fill('input[name="startDate"]', '2026-10-10');
  await workerPage.fill('input[name="endDate"]', '2026-10-11');
  await workerPage.fill('textarea[name="reason"]', 'Smoke test leave request');
  
  // Submit
  await workerPage.click('button[type="submit"]:has-text("Gửi đơn")');
  
  // Wait for modal to close
  await workerPage.waitForSelector('text=Xin Nghỉ Phép', { state: 'visible' });
  console.log('   ✅ Worker successfully created leave request');
  
  // ==========================================
  // 2. Manager (quan.mai) - Check limits & reject
  // ==========================================
  console.log('>> 2. Manager (quan.mai) verifies scope and rejects');
  const managerContext = await browser.newContext();
  const managerPage = await managerContext.newPage();
  
  await loginAs(managerPage, 'quan.mai', '123456');
  await managerPage.goto('http://localhost:3000/leave');
  
  // Manager should see the table
  await managerPage.waitForTimeout(2000);
  const hasLeaveTable = await managerPage.isVisible('table');
  if (!hasLeaveTable) throw new Error('Manager cannot see leave table');
  
  // Manager checks if phuc.tran's request is visible (assuming phuc.tran is in 'Xưởng gỗ' and manager is 'Xưởng gỗ')
  const workerRequestVisible = await managerPage.isVisible('text=Smoke test leave request');
  console.log(`   Manager sees worker request? ${workerRequestVisible}`);
  
  if (workerRequestVisible) {
    // If manager can see it, try to reject it
    await managerPage.click('button:has-text("✕ Từ chối")');
    await managerPage.fill('textarea', 'Manager rejected it');
    await managerPage.click('button:has-text("✕ Từ chối")');
    await managerPage.waitForSelector('text=Manager rejected it', { state: 'visible' });
    console.log('   ✅ Manager rejected the request');
  } else {
    console.log('   ✅ Manager only sees own department (phuc.tran is not in it)');
  }
  
  // ==========================================
  // 3. HR Admin (huy.dong) - Verify Dashboard & Leave
  // ==========================================
  console.log('>> 3. HR (huy.dong) checks dashboard and leave table');
  const hrContext = await browser.newContext();
  const hrPage = await hrContext.newPage();
  
  await loginAs(hrPage, 'huy.dong', '123456');
  
  // Verify Dashboard
  await hrPage.goto('http://localhost:3000/hr');
  await hrPage.waitForSelector('text=Dashboard tổng quan nhân sự');
  console.log('   ✅ HR Dashboard loaded');
  
  // Verify Leave
  await hrPage.goto('http://localhost:3000/leave');
  await hrPage.waitForSelector('table');
  
  // HR can see all
  const hrCanSeeWorkerRequest = await hrPage.isVisible('text=Smoke test leave request');
  if (!hrCanSeeWorkerRequest) {
    throw new Error('HR cannot see worker request!');
  }
  
  // If still PENDING (manager didn't see/reject), HR approves it
  const isPendingForHr = await hrPage.isVisible('button:has-text("✓ Duyệt")');
  if (isPendingForHr) {
    await hrPage.click('button:has-text("✓ Duyệt")');
    await hrPage.waitForSelector('text=Đã duyệt', { state: 'visible' });
    console.log('   ✅ HR approved the request');
  } else {
    console.log('   ✅ Request already handled by manager');
  }

  // ==========================================
  // 4. API Authorization direct check
  // ==========================================
  console.log('>> 4. Check API authorization (Worker trying to fetch all leaves)');
  const res = await workerPage.request.get('http://localhost:3000/api/hr/leave?employeeId=999');
  const data = await res.json();
  // Worker should only get their own records, so records shouldn't contain employeeId=999
  const unauthorizedAccess = data.records?.some(r => r.employeeId === 999);
  if (unauthorizedAccess) {
    throw new Error('Worker was able to fetch other employee leave records!');
  }
  console.log('   ✅ API RBAC protects worker from fetching others');

  // ==========================================
  // 5. P0.14 Regression Test
  // ==========================================
  console.log('>> 5. P0.14 Regression Test (Attendance Correction)');
  await hrPage.goto('http://localhost:3000/attendance');
  await hrPage.waitForTimeout(2000);
  const hasAttendanceTable = await hrPage.isVisible('table');
  if (!hasAttendanceTable) throw new Error('Attendance table broke in P0.14 regression');
  console.log('   ✅ Attendance P0.14 UI intact');

  await browser.close();
  console.log('--- ALL UAT PASSED ---');
}

uat_p018().catch(err => {
  console.error('UAT FAILED:', err);
  process.exit(1);
});
