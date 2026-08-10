#!/usr/bin/env tsx
// scripts/seed.ts
// ══════════════════════════════════════════════════════════════════════════════
// DATA STORYTELLING SEED — Demo Ban Giám đốc
//
// Kịch bản: "Hệ thống siết chặt kỷ luật thành công sau 4 tuần triển khai"
//
// Chạy: npm run seed
//
// SELF-REVIEW — ĐẢM BẢO TOÀN VẸN:
//   ✅ UNIQUE(employee_id, work_date): build Set<"empId:date"> trước khi insert
//   ✅ Ca đêm overnight: clockIn = workDate 22:00+07, clockOut = workDate+1 06:00+07
//   ✅ Tất cả timestamps dùng new Date(ISO string với timezone) → tuyệt đối
//   ✅ idempotencyKey = "empId:workDate" → khớp với constraint trên DB
//   ✅ Không insert 2 lần cùng (empId, workDate): check duplicateGuard Map trước khi push
// ══════════════════════════════════════════════════════════════════════════════

import { db }           from '../src/db/index';
import { users, attendance } from '../src/db/schema';
import { eq, inArray }  from 'drizzle-orm';
import bcrypt           from 'bcryptjs';

// ─────────────────────────────────────────────────────────────────────────────
// UTILS
// ─────────────────────────────────────────────────────────────────────────────

/** Tạo Date object từ ngày (YYYY-MM-DD) và giờ (HH:MM) theo múi giờ VN (+07:00) */
function toVNDate(dateStr: string, timeStr: string, addDay = false): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [h, min]  = timeStr.split(':').map(Number);
  const dd = d + (addDay ? 1 : 0);

  // Dùng ISO string với explicit timezone → không phụ thuộc TZ của server
  const padded = (n: number) => String(n).padStart(2, '0');
  const isoStr = `${y}-${padded(m)}-${padded(dd)}T${padded(h)}:${padded(min)}:00+07:00`;
  return new Date(isoStr);
}

/** Tính phút giữa 2 timestamps */
function diffMin(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / 60_000);
}

/** Lấy danh sách ngày làm việc (Mon-Fri) trong khoảng thời gian */
function getWorkDays(startDate: Date, days: number): string[] {
  const result: string[] = [];
  for (let i = 0; i < days; i++) {
    const d   = new Date(startDate);
    d.setDate(d.getDate() + i);
    const dow = d.getDay(); // 0=Sun, 6=Sat
    if (dow !== 0 && dow !== 6) {
      result.push(d.toLocaleDateString('sv-SE')); // YYYY-MM-DD
    }
  }
  return result;
}

/** Nhóm ngày theo tuần (0-indexed) */
function getWeekIndex(workDate: string, baseDate: Date): number {
  const d    = new Date(workDate + 'T00:00:00+07:00');
  const diff = Math.floor((d.getTime() - baseDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
  return Math.max(0, diff);
}

// ─────────────────────────────────────────────────────────────────────────────
// SEED DATA — EMPLOYEES
// ─────────────────────────────────────────────────────────────────────────────

const PASSWORD_HASH = bcrypt.hashSync('Homepro@2026', 10);

const SEED_EMPLOYEES = [
  // ── Hành chính (5 người) — Ca hành chính ────────────────────────────────
  { username: 'seed_emp001', name: 'Nguyễn Thị Mai',      employeeCode: 'HC001', department: 'Hành chính', role: 'WORKER',  shift: 'OFFICE' },
  { username: 'seed_emp002', name: 'Trần Văn An',          employeeCode: 'HC002', department: 'Hành chính', role: 'WORKER',  shift: 'OFFICE' },
  { username: 'seed_emp003', name: 'Lê Thị Hoa',           employeeCode: 'HC003', department: 'Hành chính', role: 'WORKER',  shift: 'OFFICE' },
  { username: 'seed_emp004', name: 'Phạm Minh Tú',         employeeCode: 'HC004', department: 'Hành chính', role: 'WORKER',  shift: 'OFFICE' },
  { username: 'seed_mgr01',  name: 'Vũ Thành Nam',         employeeCode: 'HC005', department: 'Hành chính', role: 'MANAGER', shift: 'OFFICE' },
  // ── Xưởng A (8 người) — Ca hành chính + 2 ca đêm ────────────────────────
  { username: 'seed_emp006', name: 'Đỗ Văn Hùng',          employeeCode: 'XA001', department: 'Xưởng A',    role: 'WORKER',  shift: 'OFFICE' },
  { username: 'seed_emp007', name: 'Bùi Thị Lan',           employeeCode: 'XA002', department: 'Xưởng A',    role: 'WORKER',  shift: 'OFFICE' },
  { username: 'seed_emp008', name: 'Hoàng Văn Bình',        employeeCode: 'XA003', department: 'Xưởng A',    role: 'WORKER',  shift: 'OFFICE' },
  { username: 'seed_emp009', name: 'Ngô Thị Thu',           employeeCode: 'XA004', department: 'Xưởng A',    role: 'WORKER',  shift: 'OFFICE' },
  { username: 'seed_emp010', name: 'Lý Văn Cường',          employeeCode: 'XA005', department: 'Xưởng A',    role: 'WORKER',  shift: 'OFFICE' },
  { username: 'seed_emp011', name: 'Đinh Thị Duyên',        employeeCode: 'XA006', department: 'Xưởng A',    role: 'WORKER',  shift: 'NIGHT'  },
  { username: 'seed_emp012', name: 'Trương Văn Đức',        employeeCode: 'XA007', department: 'Xưởng A',    role: 'WORKER',  shift: 'NIGHT'  },
  { username: 'seed_spv01',  name: 'Lưu Quang Hải',         employeeCode: 'XA008', department: 'Xưởng A',    role: 'MANAGER', shift: 'OFFICE' },
  // ── Xưởng B (7 người) — Ca đêm chính ────────────────────────────────────
  { username: 'seed_emp014', name: 'Phan Văn Khải',         employeeCode: 'XB001', department: 'Xưởng B',    role: 'WORKER',  shift: 'NIGHT'  },
  { username: 'seed_emp015', name: 'Tô Thị Linh',           employeeCode: 'XB002', department: 'Xưởng B',    role: 'WORKER',  shift: 'NIGHT'  },
  { username: 'seed_emp016', name: 'Cao Văn Mạnh',          employeeCode: 'XB003', department: 'Xưởng B',    role: 'WORKER',  shift: 'NIGHT'  },
  { username: 'seed_emp017', name: 'Lê Thị Ngọc',           employeeCode: 'XB004', department: 'Xưởng B',    role: 'WORKER',  shift: 'NIGHT'  },
  { username: 'seed_emp018', name: 'Vương Văn Phúc',        employeeCode: 'XB005', department: 'Xưởng B',    role: 'WORKER',  shift: 'NIGHT'  },
  { username: 'seed_emp019', name: 'Hà Thị Quỳnh',          employeeCode: 'XB006', department: 'Xưởng B',    role: 'WORKER',  shift: 'NIGHT'  },
  { username: 'seed_spv02',  name: 'Đặng Văn Sơn',          employeeCode: 'XB007', department: 'Xưởng B',    role: 'MANAGER', shift: 'NIGHT'  },
];

// ─────────────────────────────────────────────────────────────────────────────
// SHIFT CONFIG
// ─────────────────────────────────────────────────────────────────────────────
const SHIFTS = {
  OFFICE: {
    start: '08:00', end: '17:00', isOvernight: false,
    graceLateMins: 10, graceEarlyMins: 10, standardHours: 8,
    breakMinutes: 60, otThresholdMins: 30,
  },
  NIGHT: {
    start: '22:00', end: '06:00', isOvernight: true,
    graceLateMins: 10, graceEarlyMins: 15, standardHours: 8,
    breakMinutes: 30, otThresholdMins: 60,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// ATTENDANCE RATE BY WEEK (Data Storytelling: xu hướng đi lên)
// ─────────────────────────────────────────────────────────────────────────────
//  Tuần 1: 80% — hệ thống mới triển khai, kỷ luật còn lỏng lẻo
//  Tuần 2: 88% — hệ thống bắt đầu siết, NV dần thích nghi
//  Tuần 3: 93% — kỷ luật rõ rệt, chỉ còn vài ca nghỉ phép
//  Tuần 4: 98% — ổn định hoàn toàn, gần như toàn bộ có mặt
const ATTENDANCE_RATE_BY_WEEK = [0.80, 0.88, 0.93, 0.98];

// Chỉ số nhân viên "sẽ vắng" theo ngày trong tuần (deterministic, không random)
// Dùng modular math để đảm bảo NV khác nhau vắng ở ngày khác nhau
function getAbsentIndices(weekIdx: number, dayInWeek: number, totalEmp: number): Set<number> {
  const rate   = ATTENDANCE_RATE_BY_WEEK[Math.min(weekIdx, 3)];
  const count  = totalEmp - Math.floor(rate * totalEmp);   // Số người vắng
  const absent = new Set<number>();
  // Deterministic rotation: ngày khác nhau → tập NV vắng khác nhau
  const seed = weekIdx * 31 + dayInWeek * 7;
  for (let i = 0; i < count; i++) {
    absent.add((seed + i * 3) % totalEmp);
  }
  return absent;
}

// ─────────────────────────────────────────────────────────────────────────────
// SPECIAL SCENARIO SPECS
// ─────────────────────────────────────────────────────────────────────────────

// 5 Ca đi muộn / về sớm (employeeCode, workDate, scenario)
interface LateSpec {
  empIdx:       number;   // Index trong SEED_EMPLOYEES
  dateOffset:   number;   // Ngày thứ mấy trong danh sách working days (0-indexed)
  lateArrival?: string;   // Clock-in time (HH:MM) — nếu muộn
  earlyLeave?:  string;   // Clock-out time (HH:MM) — nếu về sớm
  label:        string;
}

// Tọa độ demo (trong vùng xưởng)
const DEMO_GPS = { lat: 10.762890, lng: 106.660500 };

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SEED FUNCTION
// ─────────────────────────────────────────────────────────────────────────────
async function seed() {
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║   HomePro Manager — Demo Seed Script                ║');
  console.log('║   Kịch bản: 30 ngày chấm công + Trend đi lên        ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  // ══════════════════════════════════════════════════════════════════════════
  // BƯỚC 1: Upsert 20 nhân viên seed
  // ══════════════════════════════════════════════════════════════════════════
  console.log('⏳ [1/4] Đang tạo 20 nhân viên...');

  const insertedUsers: { id: number; username: string; shift: string; empIdx: number }[] = [];

  for (const [idx, emp] of SEED_EMPLOYEES.entries()) {
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, emp.username));

    let userId: number;
    if (existing) {
      userId = existing.id;
      await db.update(users).set({
        name:           emp.name,
        employeeCode:   emp.employeeCode,
        department:     emp.department,
        role:           emp.role as 'WORKER' | 'MANAGER',
        employeeStatus: 'ACTIVE',
        active:         true,
        employmentType: 'FULL_TIME',
      }).where(eq(users.id, existing.id));
    } else {
      const [newUser] = await db.insert(users).values({
        username:       emp.username,
        password:       PASSWORD_HASH,
        name:           emp.name,
        role:           emp.role as 'WORKER' | 'MANAGER',
        employeeCode:   emp.employeeCode,
        department:     emp.department,
        employeeStatus: 'ACTIVE',
        active:         true,
        employmentType: 'FULL_TIME',
        joinDate:       '01/07/2026',
      }).returning({ id: users.id });
      userId = newUser.id;
    }
    insertedUsers.push({ id: userId, username: emp.username, shift: emp.shift, empIdx: idx });
  }

  console.log(`   ✅ ${insertedUsers.length} nhân viên (upsert thành công)\n`);

  // ══════════════════════════════════════════════════════════════════════════
  // BƯỚC 2: Xóa attendance cũ của seed employees (để seed sạch)
  // ══════════════════════════════════════════════════════════════════════════
  console.log('⏳ [2/4] Xóa dữ liệu chấm công cũ của seed users...');
  const seedUserIds = insertedUsers.map(u => u.id);
  await db.delete(attendance).where(inArray(attendance.employeeId, seedUserIds));
  console.log('   ✅ Đã xóa attendance cũ\n');

  // ══════════════════════════════════════════════════════════════════════════
  // BƯỚC 3: Tạo dữ liệu chấm công 30 ngày
  // ══════════════════════════════════════════════════════════════════════════
  console.log('⏳ [3/4] Đang tạo 30 ngày dữ liệu chấm công...');

  // Ngày bắt đầu: 30 ngày trước (từ hôm nay 2026-08-10)
  const today = new Date('2026-08-10T17:00:00+07:00');
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 29);  // 30 ngày trước

  // Lấy weekday start (thứ Hai đầu tuần)
  const weekStart = new Date(startDate);
  while (weekStart.getDay() !== 1) weekStart.setDate(weekStart.getDate() - 1);

  const workDays = getWorkDays(startDate, 30);

  // ── Bộ đếm để đặt scenario ──────────────────────────────────────────────
  let otCount       = 0;  // Đếm ca OT (mục tiêu: 10)
  let lateCount     = 0;  // Đếm ca muộn (mục tiêu: 5)
  let pendingCount  = 0;  // Đếm PENDING_CHECKOUT (mục tiêu: 2)

  // ── SELF-REVIEW: Duplicate guard — bảo vệ UNIQUE(empId, workDate) ────────
  // Key: "empId:workDate" → không bao giờ insert 2 lần
  const duplicateGuard = new Set<string>();

  // Batch records để insert 1 lần (performance)
  const recordsBatch: typeof attendance.$inferInsert[] = [];

  for (const workDate of workDays) {
    // Xác định tuần thứ mấy (0-indexed) từ weekStart
    const d          = new Date(workDate + 'T00:00:00+07:00');
    const weekIdx    = Math.floor((d.getTime() - weekStart.getTime()) / (7 * 24 * 3600 * 1000));
    const dayInWeek  = workDays.filter(wd => wd < workDate && new Date(wd + 'T00:00:00+07:00').getDay() >= new Date(workDate + 'T00:00:00+07:00').getDay()).length;

    const absentSet = getAbsentIndices(weekIdx, dayInWeek, insertedUsers.length);

    for (const [uIdx, user] of insertedUsers.entries()) {
      const dupKey = `${user.id}:${workDate}`;
      if (duplicateGuard.has(dupKey)) {
        console.warn(`   ⚠️  Duplicate skip: ${dupKey}`);
        continue;
      }
      duplicateGuard.add(dupKey);

      const shift   = SHIFTS[user.shift as keyof typeof SHIFTS];
      const isNight = user.shift === 'NIGHT';

      // ── Xác định có vắng không ──────────────────────────────────────────
      const isAbsent = absentSet.has(uIdx);

      const now = new Date();

      if (isAbsent) {
        // Vắng mặt (không có clock-in)
        recordsBatch.push({
          employeeId:     user.id,
          workDate,
          checkIn:        null,
          checkOut:       null,
          status:         'ABSENT',
          lateMinutes:    0,
          earlyLeaveMinutes: 0,
          totalHours:     0,
          clockInSource:  'MANUAL',
          clockOutSource: 'MANUAL',
          approvalStatus: 'PENDING_MANAGER',
          idempotencyKey: dupKey,
          confirmSources: '[]',
          location:       null,
          createdAt:      now,
          updatedAt:      now,
        });
        continue;
      }

      // ── Ca có mặt: sinh clock_in / clock_out ────────────────────────────
      let clockInTime  = shift.start;   // Default: đúng giờ
      let clockOutTime = shift.end;     // Default: đúng giờ

      // ── Xét scenario đặc biệt ───────────────────────────────────────────

      // PENDING_CHECKOUT: 2 ca đêm gần nhất quên clock out
      const isRecentNight = isNight && (workDate === workDays[workDays.length - 2] || workDate === workDays[workDays.length - 4]);
      const isPendingTarget = pendingCount < 2 && isNight && isRecentNight;

      // LATE (5 ca): tuần 1-2, nhân viên hành chính/xưởng A
      const isLateTarget = lateCount < 5 && weekIdx <= 1 && !isNight && uIdx % 4 === 0;

      // OT (10 ca): tất cả tuần, xen kẽ
      const isOTTarget = otCount < 10 && uIdx % 3 === 0 && (workDate.endsWith('5') || workDate.endsWith('8'));

      if (isPendingTarget) {
        // PENDING_CHECKOUT: có clock_in, không có clock_out
        const clockIn = toVNDate(workDate, shift.start, false);
        recordsBatch.push({
          employeeId:     user.id,
          workDate,
          checkIn:        clockIn,
          checkOut:       null,
          status:         'PENDING_CHECKOUT',
          lateMinutes:    0,
          earlyLeaveMinutes: 0,
          totalHours:     0,
          clockInSource:  'HARDWARE',
          clockOutSource: 'MANUAL',
          deviceId:       'terminal-XB-01',
          approvalStatus: 'PENDING_MANAGER',
          idempotencyKey: dupKey,
          confirmSources: `["HARDWARE@${shift.start}"]`,
          location:       null,
          createdAt:      now,
          updatedAt:      now,
        });
        pendingCount++;
        continue;
      }

      // Điều chỉnh thời gian cho các scenario
      if (isLateTarget && lateCount < 5) {
        const lateVariants = ['08:22', '08:28', '08:35', '08:19', '08:41'];
        const earlyVariants = ['16:42', '16:51', null, '16:38', null];
        const variant = lateCount % lateVariants.length;
        clockInTime  = lateVariants[variant];
        if (earlyVariants[variant]) clockOutTime = earlyVariants[variant]!;
        lateCount++;
      } else if (isOTTarget && otCount < 10) {
        // OT: về muộn hơn 60-120 phút
        const otVariants = ['18:30', '18:45', '19:00', '18:20', '19:15',
                            '18:35', '18:50', '18:25', '19:05', '18:40'];
        clockOutTime = otVariants[otCount % otVariants.length];
        otCount++;
      }

      // ── Build timestamps (SELF-REVIEW: overnight xử lý đúng) ─────────────
      //
      // Ca đêm: clockIn = workDate 22:00+07, clockOut = workDate+1 06:XX+07
      //   → diffMin(clockOut, clockIn) = 480 phút (8 giờ) → LUÔN DƯƠNG ✅
      //
      // Ca hành chính: clockIn = workDate 08:XX+07, clockOut = workDate 17:XX+07
      //   → cùng ngày → diffMin > 0 ✅
      const clockIn  = toVNDate(workDate, clockInTime, false);
      const clockOut = toVNDate(workDate, clockOutTime, isNight);  // addDay = true nếu ca đêm

      // ── Rule Engine mini (tính toán sơ bộ) ─────────────────────────────
      const schedStart = toVNDate(workDate, shift.start, false);
      const schedEnd   = toVNDate(workDate, shift.end, isNight);

      const rawLate    = diffMin(clockIn,  schedStart);     // dương = muộn
      const rawEarly   = diffMin(schedEnd, clockOut);       // dương = về sớm
      const rawOT      = diffMin(clockOut, schedEnd);       // dương = OT
      const rawWorked  = diffMin(clockOut, clockIn);        // luôn dương

      const lateMinutes      = Math.max(0, rawLate  - shift.graceLateMins);
      const earlyLeaveMinutes = Math.max(0, rawEarly - shift.graceEarlyMins);
      const otMinutes        = rawOT >= shift.otThresholdMins ? rawOT : 0;
      const breakDeduct      = rawWorked >= 240 ? shift.breakMinutes : 0;
      const workedMinutes    = Math.max(0, rawWorked - breakDeduct);
      const totalHours       = Math.round((workedMinutes / 60) * 100) / 100;

      // Status
      let status: string;
      const ratio = workedMinutes / (shift.standardHours * 60);
      if (ratio < 0.5)                           status = 'ABSENT';
      else if (ratio < 1.0)                      status = 'HALF_DAY';
      else if (lateMinutes > 0 && earlyLeaveMinutes > 0) status = 'LATE_EARLY_LEAVE';
      else if (lateMinutes > 0)                  status = 'LATE';
      else if (earlyLeaveMinutes > 0)            status = 'EARLY_LEAVE';
      else                                       status = 'PRESENT';

      // ── OT approval status ───────────────────────────────────────────────
      // 7 ca OT APPROVED (otCount 1-7), 3 ca OT PENDING_HR (otCount 8-10)
      const hasOT = otMinutes > 0;
      const approvalStatus = hasOT && otCount > 7  ? 'PENDING_HR'
                           : hasOT && otCount > 0  ? 'APPROVED'
                           :                         'PENDING_MANAGER';

      // Source: Xưởng A/B dùng HARDWARE, Hành chính dùng WEB_GPS
      const isWorkshop   = SEED_EMPLOYEES[user.empIdx]?.department?.startsWith('Xưởng') ?? false;
      const clockInSrc   = isWorkshop ? 'HARDWARE' : 'WEB_GPS';
      const clockOutSrc  = isWorkshop ? 'HARDWARE' : 'WEB_GPS';
      const deviceId     = isWorkshop ? `terminal-${SEED_EMPLOYEES[user.empIdx]?.department?.replace(' ', '')}-01` : null;

      recordsBatch.push({
        employeeId:     user.id,
        workDate,
        checkIn:        clockIn,
        checkOut:       clockOut,
        status,
        lateMinutes,
        earlyLeaveMinutes,
        totalHours,
        clockInSource:  clockInSrc,
        clockOutSource: clockOutSrc,
        deviceId,
        checkInLat:     isWorkshop ? null : DEMO_GPS.lat,
        checkInLng:     isWorkshop ? null : DEMO_GPS.lng,
        checkOutLat:    isWorkshop ? null : DEMO_GPS.lat,
        checkOutLng:    isWorkshop ? null : DEMO_GPS.lng,
        location:       isWorkshop ? null : `${DEMO_GPS.lat},${DEMO_GPS.lng}`,
        approvalStatus,
        idempotencyKey: dupKey,
        confirmSources: hasOT ? `["${clockInSrc}@${clockInTime}","${clockInSrc}_OUT@${clockOutTime}"]`
                              : `["${clockInSrc}@${clockInTime}","${clockInSrc}_OUT@${clockOutTime}"]`,
        createdAt:      now,
        updatedAt:      now,
      });
    }
  }

  // ── Insert theo batch ─────────────────────────────────────────────────────
  const CHUNK = 100;
  let inserted = 0;
  for (let i = 0; i < recordsBatch.length; i += CHUNK) {
    const chunk = recordsBatch.slice(i, i + CHUNK);
    await db.insert(attendance).values(chunk);
    inserted += chunk.length;
    process.stdout.write(`\r   📥 Đã insert: ${inserted}/${recordsBatch.length} bản ghi`);
  }
  console.log(`\n   ✅ Tổng: ${inserted} bản ghi chấm công\n`);

  // ══════════════════════════════════════════════════════════════════════════
  // BƯỚC 4: Summary báo cáo
  // ══════════════════════════════════════════════════════════════════════════
  console.log('⏳ [4/4] Tổng kết dữ liệu đã bơm...\n');

  const presentCount = recordsBatch.filter(r => !['ABSENT', 'PENDING_CHECKOUT'].includes(r.status as string)).length;
  const absentCount  = recordsBatch.filter(r => r.status === 'ABSENT').length;
  const lateRecords  = recordsBatch.filter(r => (r.lateMinutes as number) > 0).length;
  const otRecords    = recordsBatch.filter(r => r.approvalStatus === 'APPROVED' || r.approvalStatus === 'PENDING_HR').length;
  const approvedOT   = recordsBatch.filter(r => r.approvalStatus === 'APPROVED' && !['ABSENT','PENDING_CHECKOUT','PENDING_MANAGER'].includes(r.status as string)).length;
  const pendingHR    = recordsBatch.filter(r => r.approvalStatus === 'PENDING_HR').length;
  const pcRecords    = recordsBatch.filter(r => r.status === 'PENDING_CHECKOUT').length;

  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║              📊 SEED DATA SUMMARY                     ║');
  console.log('╠════════════════════════════════════════════════════════╣');
  console.log(`║  Nhân viên seed:         ${String(insertedUsers.length).padEnd(28)}║`);
  console.log(`║  Ngày làm việc:          ${String(workDays.length).padEnd(28)}║`);
  console.log(`║  Tổng bản ghi:           ${String(recordsBatch.length).padEnd(28)}║`);
  console.log('╠════════════════════════════════════════════════════════╣');
  console.log(`║  ✅ Có mặt (PRESENT):    ${String(presentCount).padEnd(28)}║`);
  console.log(`║  🔴 Vắng mặt (ABSENT):   ${String(absentCount).padEnd(28)}║`);
  console.log(`║  ⚠️  Đi muộn/về sớm:      ${String(lateRecords).padEnd(28)}║`);
  console.log(`║  🕐 PENDING_CHECKOUT:     ${String(pcRecords).padEnd(28)}║`);
  console.log(`║  ⏰ OT ca APPROVED:       ${String(approvedOT).padEnd(28)}║`);
  console.log(`║  📋 OT chờ HR (PENDING):  ${String(pendingHR).padEnd(28)}║`);
  console.log('╠════════════════════════════════════════════════════════╣');
  console.log('║  📈 Trend Tỷ lệ chuyên cần (mục tiêu):               ║');
  console.log('║     Tuần 1: ~80%  Tuần 2: ~88%                       ║');
  console.log('║     Tuần 3: ~93%  Tuần 4: ~98%  ← "Siết kỷ luật"     ║');
  console.log('╠════════════════════════════════════════════════════════╣');
  console.log('║  🔑 Tài khoản demo: seed_emp001 / Homepro@2026        ║');
  console.log('║  📊 Dashboard BGĐ: /hr/executive-dashboard            ║');
  console.log('║  🔍 Duyệt công:    /hr/attendance-review              ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log('\n🎉 Seed hoàn thành! Database sẵn sàng cho demo.\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// Entry point
// ─────────────────────────────────────────────────────────────────────────────
seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n❌ Seed thất bại:', err);
    process.exit(1);
  });
