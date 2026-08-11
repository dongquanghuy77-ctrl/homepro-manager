// Seed HR data for HomePro Manager — based on existing real accounts
// Seeds: employee profiles, attendance (last 5 working days), leave requests
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

console.log('\n=== SEED DỮ LIỆU NHÂN SỰ HOMEPRO ===\n');

// ─── 1. CẬP NHẬT HỒ SƠ NHÂN VIÊN ────────────────────────────────────────────
console.log('📋 Bước 1: Cập nhật hồ sơ nhân viên...');

const profiles = [
  // id, name, department, position, phone, joinDate, employmentType, managerId, note
  { id: 2,  dept: 'Quản lý',   pos: 'Quản lý xưởng',          phone: '0905 100 002', join: '2020-01-05', type: 'FULL_TIME', mgr: null },
  { id: 3,  dept: 'Xưởng gỗ', pos: 'Giám sát công trình',     phone: '0905 100 003', join: '2020-03-10', type: 'FULL_TIME', mgr: 2 },
  { id: 4,  dept: 'Xưởng gỗ', pos: 'Thợ mộc',                 phone: '0905 100 004', join: '2021-06-01', type: 'FULL_TIME', mgr: 3 },
  { id: 5,  dept: 'Quản lý',   pos: 'Ban Giám Đốc',            phone: '0905 100 005', join: '2020-01-01', type: 'FULL_TIME', mgr: null },
  { id: 6,  dept: 'Quản lý',   pos: 'Giám đốc điều hành',     phone: '0905 100 006', join: '2019-06-01', type: 'FULL_TIME', mgr: null },
  { id: 7,  dept: 'Lắp đặt',  pos: 'Giám sát lắp đặt',       phone: '0905 100 007', join: '2021-01-15', type: 'FULL_TIME', mgr: 2 },
  { id: 8,  dept: 'Sơn',       pos: 'Giám sát sơn & hoàn thiện', phone: '0905 100 008', join: '2021-04-01', type: 'FULL_TIME', mgr: 2 },
  { id: 9,  dept: 'Quản lý',   pos: 'Quản lý dự án',          phone: '0905 100 009', join: '2020-07-01', type: 'FULL_TIME', mgr: null },
  { id: 11, dept: 'Xưởng gỗ', pos: 'Thợ mộc CNC',            phone: '0905 100 011', join: '2021-09-01', type: 'FULL_TIME', mgr: 3 },
  { id: 12, dept: 'Xưởng gỗ', pos: 'Thợ sơn PU',             phone: '0905 100 012', join: '2022-01-10', type: 'FULL_TIME', mgr: 8 },
  { id: 13, dept: 'Lắp đặt',  pos: 'Thợ lắp đặt nội thất',  phone: '0905 100 013', join: '2021-11-01', type: 'FULL_TIME', mgr: 7 },
  { id: 14, dept: 'Xưởng gỗ', pos: 'Thợ mộc',                phone: '0905 100 014', join: '2022-03-01', type: 'FULL_TIME', mgr: 3 },
  { id: 15, dept: 'Lắp đặt',  pos: 'Thợ lắp đặt',           phone: '0905 100 015', join: '2022-06-01', type: 'FULL_TIME', mgr: 7 },
  { id: 16, dept: 'Xưởng gỗ', pos: 'Thợ mộc',                phone: '0905 100 016', join: '2022-08-01', type: 'FULL_TIME', mgr: 3 },
  { id: 17, dept: 'Sơn',       pos: 'Thợ sơn',                phone: '0905 100 017', join: '2023-01-01', type: 'FULL_TIME', mgr: 8 },
  { id: 18, dept: 'Xưởng gỗ', pos: 'Thợ tiện gỗ',            phone: '0905 100 018', join: '2022-11-01', type: 'FULL_TIME', mgr: 3 },
  { id: 19, dept: 'Kho',       pos: 'Thủ kho vật tư',         phone: '0905 100 019', join: '2023-03-01', type: 'FULL_TIME', mgr: 9 },
  { id: 20, dept: 'Lắp đặt',  pos: 'Thợ lắp đặt',           phone: '0905 100 020', join: '2023-06-01', type: 'CONTRACT',  mgr: 7 },
];

let empCodes = [
  { id: 1,  code: 'HP-001' }, { id: 2,  code: 'HP-002' },
  { id: 3,  code: 'HP-003' }, { id: 4,  code: 'HP-004' },
  { id: 5,  code: 'HP-005' }, { id: 6,  code: 'HP-006' },
  { id: 7,  code: 'HP-007' }, { id: 8,  code: 'HP-008' },
  { id: 9,  code: 'HP-009' }, { id: 11, code: 'HP-011' },
  { id: 12, code: 'HP-012' }, { id: 13, code: 'HP-013' },
  { id: 14, code: 'HP-014' }, { id: 15, code: 'HP-015' },
  { id: 16, code: 'HP-016' }, { id: 17, code: 'HP-017' },
  { id: 18, code: 'HP-018' }, { id: 19, code: 'HP-019' },
  { id: 20, code: 'HP-020' }, { id: 21, code: 'HP-021' },
];

// Update employee codes first
for (const { id, code } of empCodes) {
  await sql`UPDATE users SET employee_code=${code} WHERE id=${id} AND (employee_code IS NULL OR employee_code = '')`;
}

// Update profiles
for (const p of profiles) {
  await sql`
    UPDATE users SET
      department      = ${p.dept},
      position        = ${p.pos},
      phone           = ${p.phone},
      join_date       = ${p.join},
      employment_type = ${p.type},
      manager_id      = ${p.mgr},
      employee_status = 'ACTIVE',
      active          = true,
      updated_at      = NOW()
    WHERE id = ${p.id}
  `;
}

// Update admin
await sql`UPDATE users SET department='Quản lý', position='Quản trị hệ thống', phone='0905 100 001', join_date='2019-01-01', employment_type='FULL_TIME', employee_status='ACTIVE' WHERE id=1`;

console.log(`  ✅ Đã cập nhật hồ sơ ${profiles.length + 1} nhân viên\n`);

// ─── 2. CHẤM CÔNG — 6 ngày làm việc gần nhất ────────────────────────────────
console.log('📅 Bước 2: Tạo dữ liệu chấm công...');

// Working employees (not demo/viewer)
const workEmployees = [2, 3, 4, 7, 8, 9, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

// Last 6 working days (Mon-Sat pattern for workshop)
const workDays = [
  '2026-08-03', // Mon
  '2026-08-04', // Tue
  '2026-08-05', // Wed
  '2026-08-06', // Thu
  '2026-08-07', // Fri
  '2026-08-08', // Sat
];

// Attendance patterns per employee (realistic for a workshop)
// P=Present, L=Late, A=Absent, H=Half Day
const patterns = {
  2:  ['P','P','P','P','P','P'],  // Manager - always present
  3:  ['P','P','P','P','P','P'],  // Supervisor - always present
  4:  ['P','P','L','P','P','A'],  // Worker - 1 late, 1 absent
  7:  ['P','P','P','P','P','P'],  // Supervisor - always present
  8:  ['P','L','P','P','P','P'],  // Supervisor - 1 late
  9:  ['P','P','P','P','P','P'],  // Manager
  11: ['P','P','P','L','P','P'],  // Worker - 1 late
  12: ['P','P','A','P','P','P'],  // Worker - 1 absent
  13: ['L','P','P','P','P','H'],  // Worker - 1 late, 1 half day
  14: ['P','P','P','P','A','P'],  // Worker - 1 absent
  15: ['P','L','P','P','P','P'],  // Worker - 1 late
  16: ['P','P','P','P','P','P'],  // Worker - good attendance
  17: ['A','P','P','P','P','P'],  // Worker - 1 absent Monday
  18: ['P','P','L','P','P','P'],  // Worker - 1 late
  19: ['P','P','P','P','P','P'],  // Warehouse - always present
  20: ['P','P','P','L','P','P'],  // Contract worker - 1 late
};

const checkInBase  = '07:30';
const checkOutBase = '17:00';
let attCount = 0;

for (const empId of workEmployees) {
  const pat = patterns[empId] || ['P','P','P','P','P','P'];
  for (let d = 0; d < workDays.length; d++) {
    const date   = workDays[d];
    const status = pat[d];

    // Check existing record
    const existing = await sql`SELECT id FROM attendance WHERE employee_id=${empId} AND work_date=${date}`;
    if (existing.length > 0) continue;

    let checkIn   = null;
    let checkOut  = null;
    let lateMin   = 0;
    let totalHours= 0;
    let dbStatus  = 'ABSENT';

    if (status === 'P') {
      // Present: 07:25 - 07:35 random check-in, 17:00-17:30 check-out
      const inOffset  = Math.floor(Math.random() * 10) - 5; // -5 to +5 min
      const outOffset = Math.floor(Math.random() * 30);      // 0 to 30 min
      const inTime  = new Date(`${date}T07:30:00+07:00`);
      inTime.setMinutes(inTime.getMinutes() + inOffset);
      const outTime = new Date(`${date}T17:00:00+07:00`);
      outTime.setMinutes(outTime.getMinutes() + outOffset);
      checkIn   = inTime;
      checkOut  = outTime;
      lateMin   = 0;
      totalHours= parseFloat(((outTime - inTime) / 3600000).toFixed(1));
      dbStatus  = 'PRESENT';
    } else if (status === 'L') {
      // Late: check-in 08:00-09:00
      const lateOffset = 30 + Math.floor(Math.random() * 60); // 30-90 min late
      const inTime  = new Date(`${date}T07:30:00+07:00`);
      inTime.setMinutes(inTime.getMinutes() + lateOffset);
      const outTime = new Date(`${date}T17:00:00+07:00`);
      checkIn   = inTime;
      checkOut  = outTime;
      lateMin   = lateOffset;
      totalHours= parseFloat(((outTime - inTime) / 3600000).toFixed(1));
      dbStatus  = 'LATE';
    } else if (status === 'H') {
      // Half day: morning only
      const inTime  = new Date(`${date}T07:30:00+07:00`);
      const outTime = new Date(`${date}T12:00:00+07:00`);
      checkIn   = inTime;
      checkOut  = outTime;
      lateMin   = 0;
      totalHours= 4.5;
      dbStatus  = 'HALF_DAY';
    } else {
      // Absent
      dbStatus  = 'ABSENT';
    }

    if (dbStatus === 'ABSENT') {
      await sql`
        INSERT INTO attendance (employee_id, work_date, status, late_minutes, total_hours, note, created_at, updated_at)
        VALUES (${empId}, ${date}, 'ABSENT', 0, 0, 'Vắng mặt', NOW(), NOW())
      `;
    } else {
      await sql`
        INSERT INTO attendance (employee_id, work_date, check_in, check_out, status, late_minutes, total_hours, created_at, updated_at)
        VALUES (${empId}, ${date}, ${checkIn}, ${checkOut}, ${dbStatus}, ${lateMin}, ${totalHours}, NOW(), NOW())
      `;
    }
    attCount++;
  }
}

console.log(`  ✅ Đã tạo ${attCount} bản ghi chấm công (6 ngày × ${workEmployees.length} nhân viên)\n`);

// ─── 3. ĐƠN NGHỈ PHÉP ────────────────────────────────────────────────────────
console.log('📝 Bước 3: Tạo đơn nghỉ phép...');

const leaveData = [
  // empId, type, start, end, days, reason, status, approvedBy
  { emp: 4,  type: 'ANNUAL',   start: '2026-08-12', end: '2026-08-12', days: 1, reason: 'Việc gia đình', status: 'APPROVED', approver: 3 },
  { emp: 12, type: 'SICK',     start: '2026-08-05', end: '2026-08-05', days: 1, reason: 'Bệnh (có giấy khám)', status: 'APPROVED', approver: 8 },
  { emp: 17, type: 'ANNUAL',   start: '2026-08-03', end: '2026-08-03', days: 1, reason: 'Nghỉ phép năm', status: 'APPROVED', approver: 8 },
  { emp: 13, type: 'PERSONAL', start: '2026-08-15', end: '2026-08-15', days: 1, reason: 'Sự kiện gia đình', status: 'PENDING', approver: null },
  { emp: 14, type: 'ANNUAL',   start: '2026-08-20', end: '2026-08-22', days: 3, reason: 'Nghỉ phép hè', status: 'PENDING', approver: null },
  { emp: 20, type: 'SICK',     start: '2026-08-11', end: '2026-08-11', days: 1, reason: 'Đau lưng', status: 'PENDING', approver: null },
  { emp: 15, type: 'ANNUAL',   start: '2026-09-01', end: '2026-09-03', days: 3, reason: 'Nghỉ phép về quê', status: 'PENDING', approver: null },
  { emp: 16, type: 'ANNUAL',   start: '2026-07-15', end: '2026-07-15', days: 1, reason: 'Nghỉ phép cá nhân', status: 'REJECTED', approver: 3 },
];

let leaveCount = 0;
for (const lr of leaveData) {
  // Check duplicate
  const existing = await sql`SELECT id FROM leave_requests WHERE employee_id=${lr.emp} AND start_date=${lr.start} AND end_date=${lr.end}`;
  if (existing.length > 0) continue;

  if (lr.status === 'APPROVED') {
    await sql`
      INSERT INTO leave_requests (employee_id, leave_type, start_date, end_date, total_days, reason, status, reviewed_by, reviewed_at, created_at, updated_at)
      VALUES (${lr.emp}, ${lr.type}, ${lr.start}, ${lr.end}, ${lr.days}, ${lr.reason}, 'APPROVED', ${lr.approver}, NOW(), NOW(), NOW())
    `;
  } else if (lr.status === 'REJECTED') {
    await sql`
      INSERT INTO leave_requests (employee_id, leave_type, start_date, end_date, total_days, reason, status, review_note, created_at, updated_at)
      VALUES (${lr.emp}, ${lr.type}, ${lr.start}, ${lr.end}, ${lr.days}, ${lr.reason}, 'REJECTED', 'Không đủ ngày phép tồn', NOW(), NOW())
    `;
  } else {
    await sql`
      INSERT INTO leave_requests (employee_id, leave_type, start_date, end_date, total_days, reason, status, created_at, updated_at)
      VALUES (${lr.emp}, ${lr.type}, ${lr.start}, ${lr.end}, ${lr.days}, ${lr.reason}, 'PENDING', NOW(), NOW())
    `;
  }
  leaveCount++;
}

console.log(`  ✅ Đã tạo ${leaveCount} đơn nghỉ phép\n`);

// ─── 4. SUMMARY ──────────────────────────────────────────────────────────────
console.log('=== KẾT QUẢ SEED ===');
const empTotal  = await sql`SELECT COUNT(*) as n FROM users WHERE employee_status = 'ACTIVE'`;
const attTotal  = await sql`SELECT COUNT(*) as n, SUM(CASE WHEN status='PRESENT' THEN 1 ELSE 0 END) as present, SUM(CASE WHEN status='LATE' THEN 1 ELSE 0 END) as late, SUM(CASE WHEN status='ABSENT' THEN 1 ELSE 0 END) as absent FROM attendance`;
const leaveTotal= await sql`SELECT COUNT(*) as n, SUM(CASE WHEN status='PENDING' THEN 1 ELSE 0 END) as pending, SUM(CASE WHEN status='APPROVED' THEN 1 ELSE 0 END) as approved FROM leave_requests`;

console.log(`  👥 Nhân viên active:   ${empTotal[0].n}`);
console.log(`  📅 Bản ghi chấm công: ${attTotal[0].n} (Present=${attTotal[0].present}, Late=${attTotal[0].late}, Absent=${attTotal[0].absent})`);
console.log(`  📝 Đơn nghỉ phép:     ${leaveTotal[0].n} (Pending=${leaveTotal[0].pending}, Approved=${leaveTotal[0].approved})`);
console.log('\n✅ SEED HOÀN THÀNH — Bạn có thể vào /employees, /attendance, /leave để xem\n');
