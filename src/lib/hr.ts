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
export async function writeHrAuditLog(params: {
  action: string;
  entityType: string;
  entityId?: number;
  actorId?: number;
  actorName?: string;
  oldValue?: object;
  newValue?: object;
  ipAddress?: string;
}) {
  try {
    await db.insert(hrAuditLogs).values({
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      actorId: params.actorId,
      actorName: params.actorName,
      oldValue: params.oldValue ? JSON.stringify(params.oldValue) : null,
      newValue: params.newValue ? JSON.stringify(params.newValue) : null,
      ipAddress: params.ipAddress,
    });
  } catch (err) {
    // Audit log failure should not break the main operation
    console.error('[HR Audit Log Error]', err);
  }
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
