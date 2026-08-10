// src/lib/hr.ts
// HR Module 01 — shared helpers: audit log writer, time calculations, auto employee code

import { db } from '@/db';
import { hrAuditLogs, attendance, settings, users } from '@/db/schema';
import { eq } from 'drizzle-orm';

// ── Work hours config ─────────────────────────────────────────────────────────
export async function getWorkHours(): Promise<{ start: string; end: string; lateThreshold: number; breakStart: string; breakEnd: string }> {
  try {
    const rows = await db.select().from(settings);
    const get = (key: string, def: string) => rows.find((r) => r.key === key)?.value ?? def;
    return {
      start:         get('hr_work_start',              '08:00'),
      end:           get('hr_work_end',                '17:00'),
      lateThreshold: parseInt(get('hr_late_threshold_minutes', '15')),
      breakStart:    get('hr_break_start',             '12:00'), // Giờ bắt đầu nghỉ trưa
      breakEnd:      get('hr_break_end',               '13:00'), // Giờ kết thúc nghỉ trưa
    };
  } catch {
    return { start: '08:00', end: '17:00', lateThreshold: 15, breakStart: '12:00', breakEnd: '13:00' };
  }
}

// ── Time calculation helpers ──────────────────────────────────────────────────
export function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

// ── Break overlap: số phút nghỉ trùng với ca làm (ISO 8601 interval intersection) ──────
function breakOverlapMinutes(
  workStartMin: number, workEndMin: number,
  breakStartMin: number, breakEndMin: number
): number {
  const overlapStart = Math.max(workStartMin, breakStartMin);
  const overlapEnd   = Math.min(workEndMin,   breakEndMin);
  return Math.max(0, overlapEnd - overlapStart);
}

export function calculateAttendanceStats(
  checkIn: Date,
  checkOut: Date | null,
  workStart: string,
  workEnd: string,
  breakStart = '12:00',   // Giờ bắt đầu nghỉ (cấu hình được, mặc định 12:00)
  breakEnd   = '13:00'    // Giờ kết thúc nghỉ (cấu hình được, mặc định 13:00)
): { lateMinutes: number; earlyLeaveMinutes: number; totalHours: number; status: string } {
  const workStartMin = timeToMinutes(workStart);
  const workEndMin   = timeToMinutes(workEnd);
  const breakStartMin = timeToMinutes(breakStart);
  const breakEndMin   = timeToMinutes(breakEnd);

  // Late calculation based on check-in time
  const checkInMin = checkIn.getHours() * 60 + checkIn.getMinutes();
  const lateMinutes = Math.max(0, checkInMin - workStartMin);

  // Early leave and total hours (if checkout exists)
  let earlyLeaveMinutes = 0;
  let totalHours = 0;

  if (checkOut) {
    const checkOutMin = checkOut.getHours() * 60 + checkOut.getMinutes();
    earlyLeaveMinutes = Math.max(0, workEndMin - checkOutMin);

    // Tổng giờ thực làm = raw diff − thời gian nghỉ trưa trùng với ca làm
    // Ví dụ: 08:00→17:00 − overlap(12:00→13:00) = 9h − 1h = 8h
    const breakMins = breakOverlapMinutes(checkInMin, checkOutMin, breakStartMin, breakEndMin);
    const rawMins   = checkOutMin - checkInMin;
    totalHours = Math.max(0, (rawMins - breakMins) / 60);
  }

  const status = lateMinutes > 0 ? 'LATE' : 'PRESENT';

  return { lateMinutes, earlyLeaveMinutes, totalHours: Math.round(totalHours * 100) / 100, status };
}

// ── Auto-generate employee code ───────────────────────────────────────────────
export async function generateEmployeeCode(): Promise<string> {
  const allUsers = await db
    .select({ code: users.employeeCode })
    .from(users)
    .orderBy(users.id);

  const codes = allUsers
    .map((u) => u.code)
    .filter(Boolean)
    .map((c) => parseInt(c!.replace('NV', '')))
    .filter((n) => !isNaN(n));

  const maxCode = codes.length > 0 ? Math.max(...codes) : 0;
  return `NV${String(maxCode + 1).padStart(3, '0')}`;
}

// ── Audit log writer ──────────────────────────────────────────────────────────
export type AuditLogParams = {
  action:     string;
  entityType: string;
  entityId?:  number;
  actorId?:   number;
  actorName?: string;
  oldValue?:  object;
  newValue?:  object;
  ipAddress?: string;
};

export async function writeHrAuditLog(params: AuditLogParams) {
  try {
    await db.insert(hrAuditLogs).values({
      action:     params.action,
      entityType: params.entityType,
      entityId:   params.entityId,
      actorId:    params.actorId,
      actorName:  params.actorName,
      oldValue:   params.oldValue ? JSON.stringify(params.oldValue) : null,
      newValue:   params.newValue ? JSON.stringify(params.newValue) : null,
      ipAddress:  params.ipAddress,
    });
  } catch (err) {
    // Audit log failure must NEVER break the main operation
    console.error('[HR Audit Log Error]', err);
  }
}

// ── Fire-and-forget variant ────────────────────────────────────────────────────
// Dùng khi KHÔNG muốn cộng latency vào main request (import hàng loạt, etc.)
// Promise được tách ra khỏi luồng chính → main flow hoàn thành tức thì.
// Lỗi vẫn được catch bên trong writeHrAuditLog → không bao giờ UnhandledPromiseRejection.
export function writeHrAuditLogAsync(params: AuditLogParams): void {
  // Tách Promise ra khỏi await chain → fire-and-forget
  // void: ESLint/TS biết đây là intentional (không phải forgot-to-await)
  void writeHrAuditLog(params);
}

// ── TRANSACTIONAL variant (dùng trong db.transaction()) ────────────────────────────────
// Đảm bảo STATUS UPDATE + AUDIT LOG là một đơn vị nguyên tử (atomic).
// Không có try/catch → lỗi propagate lên → PostgreSQL tự ROLLBACK cả 2 statements.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function writeHrAuditLogInTx(tx: { insert: (t: any) => any }, params: AuditLogParams): Promise<void> {
  await tx.insert(hrAuditLogs).values({
    action:     params.action,
    entityType: params.entityType,
    entityId:   params.entityId,
    actorId:    params.actorId,
    actorName:  params.actorName,
    oldValue:   params.oldValue ? JSON.stringify(params.oldValue) : null,
    newValue:   params.newValue ? JSON.stringify(params.newValue) : null,
    ipAddress:  params.ipAddress,
  });
}

// ── Today's date in Vietnam timezone (YYYY-MM-DD) ─────────────────────────────
export function getTodayVN(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' });
}

// ── Format minutes to HH:MM ───────────────────────────────────────────────────
export function minutesToHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// ── Calculate total days between two dates (inclusive) ────────────────────────
export function calculateLeaveDays(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = end.getTime() - start.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
}

// ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// BƯỚC 4: INTERVAL SPLITTING ALGORITHM (Tính OT theo Luật Lao Động VN)
// Tham chiếu: Bộ Luật Lao động 2019, Điều 97-98 và Nghị định 12/2022/NĐ-CP
// ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

export type DayType = 'WEEKDAY' | 'SUNDAY' | 'HOLIDAY';

export interface OTBreakdown {
  regularHours:  number;  // Giờ hành chính (x1.0)
  otDayHours:    number;  // Tăng ca ban ngày (x1.5)
  otNightHours:  number;  // Tăng ca ban đêm (x2.1)
  regularPay:    number;  // VNĐ
  otDayPay:      number;  // VNĐ
  otNightPay:    number;  // VNĐ
  totalPay:      number;  // VNĐ
  dayType:       DayType;
  breakMinutes:  number;  // Phút nghỉ đã trừ
}

// Cấu hình ca làm đặc trưng ngành nội thất:
//   - Ca cơ bản: 08:00 – 17:30 (9.5h đồng hồ), nghỉ 12:00–13:30 (1.5h) = 8h làm thực tế
//   - OT ngày: 17:30 – 22:00 (4.5h)  × 1.5
//   - OT đêm: 22:00 trở đi    × 2.1 (150% OT + 30% đêm + 30% OT đêm)
//   - Chủ nhật:                   × 2.0 áp dụng cho tất cả giờ
//   - Ngày lễ quốc gia:             × 3.0

const OT_SHIFT = {
  regularStart:  8 * 60,       // 08:00 = 480 phút
  regularEnd:    17 * 60 + 30, // 17:30 = 1050 phút
  breakStart:    12 * 60,      // 12:00 = 720 phút
  breakEnd:      13 * 60 + 30, // 13:30 = 810 phút  (1.5h nghỉ trưa)
  otNightStart:  22 * 60,      // 22:00 = 1320 phút
  coefRegular:   1.0,
  coefOTDay:     1.5,
  coefOTNight:   2.1,          // Bao gồm OT thường 150% + PC đêm 30% + PC OT đêm 30%
  coefSunday:    2.0,
  coefHoliday:   3.0,
} as const;

export function calculateOTEarnings(
  checkIn:     Date,
  checkOut:    Date,
  hourlyRate:  number,          // VNĐ/giờ (ví dụ: lương ngày 600k / 8h = 75,000)
  dayType:     DayType = 'WEEKDAY'
): OTBreakdown {
  const cinMin  = checkIn.getHours()  * 60 + checkIn.getMinutes();
  const coutMin = checkOut.getHours() * 60 + checkOut.getMinutes();

  const { regularStart, regularEnd, breakStart, breakEnd, otNightStart } = OT_SHIFT;

  // ─ Giờ hành chính (regular) ─
  const regS = Math.max(cinMin,  regularStart);
  const regE = Math.min(coutMin, regularEnd);
  let regularRawMin = Math.max(0, regE - regS);

  // Trừ nghỉ trưa nếu trung với ca làm
  const breakMin = Math.max(0, Math.min(regE, breakEnd) - Math.max(regS, breakStart));
  regularRawMin  = Math.max(0, regularRawMin - breakMin);
  const regularHours = regularRawMin / 60;

  // ─ OT ban ngày: regularEnd → otNightStart ─
  let otDayHours = 0;
  if (coutMin > regularEnd) {
    otDayHours = (Math.min(coutMin, otNightStart) - regularEnd) / 60;
    otDayHours = Math.max(0, otDayHours);
  }

  // ─ OT ban đêm: otNightStart trở đi ─
  let otNightHours = 0;
  if (coutMin > otNightStart) {
    otNightHours = (coutMin - otNightStart) / 60;
  }

  // ─ Hệ số theo loại ngày ─
  const regCoef   = dayType === 'HOLIDAY' ? OT_SHIFT.coefHoliday
                  : dayType === 'SUNDAY'  ? OT_SHIFT.coefSunday
                  : OT_SHIFT.coefRegular;

  const otDayCoef = dayType === 'HOLIDAY' ? OT_SHIFT.coefHoliday
                  : dayType === 'SUNDAY'  ? OT_SHIFT.coefSunday
                  : OT_SHIFT.coefOTDay;

  // OT Night luôn x2.1 (phân biệt với hệ số ngày chủ nhật/lễ ở giờ hành chính)
  const otNightCoef = OT_SHIFT.coefOTNight;

  const regularPay  = Math.round(regularHours  * hourlyRate * regCoef);
  const otDayPay    = Math.round(otDayHours    * hourlyRate * otDayCoef);
  const otNightPay  = Math.round(otNightHours  * hourlyRate * otNightCoef);

  return {
    regularHours:  Math.round(regularHours  * 100) / 100,
    otDayHours:    Math.round(otDayHours    * 100) / 100,
    otNightHours:  Math.round(otNightHours  * 100) / 100,
    regularPay,
    otDayPay,
    otNightPay,
    totalPay:      regularPay + otDayPay + otNightPay,
    dayType,
    breakMinutes:  breakMin,
  };
}

// ── Unit Test BƯỚC 4 (kiểm tra chính xác tới từng đồng) ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// Test-case: Lương ngày 600,000 VNĐ (75,000/h), làm 08:00–23:00 ngày thường
// Expected output: 1,263,750 VNĐ
export function runOTUnitTest(): { passed: boolean; results: string[]; breakdown: OTBreakdown } {
  const HOURLY = 75_000;    // 600k / 8h

  // Ngày 2000-01-03 (thứ 2, ngày thường)
  const checkIn  = new Date(2000, 0, 3, 8,  0, 0);
  const checkOut = new Date(2000, 0, 3, 23, 0, 0);

  const bd = calculateOTEarnings(checkIn, checkOut, HOURLY, 'WEEKDAY');
  const results: string[] = [];

  results.push(`Regular: ${bd.regularHours}h × ${HOURLY} × 1.0 = ${bd.regularPay.toLocaleString()} VNĐ`);
  results.push(`OT Day:  ${bd.otDayHours}h × ${HOURLY} × 1.5 = ${bd.otDayPay.toLocaleString()} VNĐ`);
  results.push(`OT Night:${bd.otNightHours}h × ${HOURLY} × 2.1 = ${bd.otNightPay.toLocaleString()} VNĐ`);
  results.push(`──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────`);
  results.push(`Tổng: ${bd.totalPay.toLocaleString()} VNĐ`);
  results.push(`Expected: 1,263,750 VNĐ`);

  const passed = bd.totalPay === 1_263_750
    && bd.regularHours  === 8
    && bd.otDayHours    === 4.5
    && bd.otNightHours  === 1;

  results.push(`[${passed ? 'PASS ✅' : 'FAIL ❌'}] Kiểm tra đầu ra`);
  return { passed, results, breakdown: bd };
}
