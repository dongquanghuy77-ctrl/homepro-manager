// src/lib/ruleEngine.ts
// ══════════════════════════════════════════════════════════════════════════════
// RULE ENGINE — calculateDailyAttendance()
//
// Service thuần TypeScript, không phụ thuộc DB, không side effects.
// Nhận Input → tính toán → trả Output.
// DB insert/update do caller (API route hoặc Cronjob) thực hiện.
//
// Triết lý thiết kế:
//   - Pure function: cùng input → luôn cùng output (dễ test, dễ audit)
//   - Fail-safe: mọi phép tính đều clamp về 0 (không bao giờ số âm)
//   - Explicit over implicit: mỗi biến trung gian đều có tên rõ ràng
// ══════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// INPUT TYPES
// ─────────────────────────────────────────────────────────────────────────────

/** Record từ bảng attendance_records (chỉ các field Rule Engine cần) */
export interface AttendanceInput {
  employeeId:  number;
  workDate:    string;          // "YYYY-MM-DD" — ngày bắt đầu ca (anchor)
  clockIn:     Date | null;     // Timestamp tuyệt đối (có timezone)
  clockOut:    Date | null;     // Timestamp tuyệt đối — NULL nếu chưa clock out
  shiftRuleId: number | null;
}

/** Cấu hình ca từ bảng shift_rules */
export interface ShiftRuleInput {
  id:               number;
  code:             string;     // "MORNING" | "AFTERNOON" | "NIGHT"
  name:             string;
  shiftStart:       string;     // "HH:MM" — giờ bắt đầu ca
  shiftEnd:         string;     // "HH:MM" — giờ kết thúc ca
  isOvernight:      boolean;    // true nếu ca qua ngày (shiftEnd < shiftStart)
  graceLateMins:    number;     // Dung sai muộn (phút)
  graceEarlyMins:   number;     // Dung sai về sớm (phút)
  standardHours:    number;     // Giờ chuẩn (thường = 8)
  breakMinutes:     number;     // Phút nghỉ giải lao (thường = 60)
  otThresholdMins:  number;     // Ngưỡng tối thiểu để tính OT (phút)
  otMultiplier:     number;     // Hệ số lương OT (1.5 hoặc 2.0)
}

// ─────────────────────────────────────────────────────────────────────────────
// OUTPUT TYPES
// ─────────────────────────────────────────────────────────────────────────────

/** Trạng thái chấm công cuối cùng */
export type AttendanceStatus =
  | 'PRESENT'           // Đủ giờ, đúng giờ
  | 'LATE'              // Đủ giờ nhưng vào muộn (sau grace period)
  | 'EARLY_LEAVE'       // Đủ giờ nhưng về sớm (sau grace period)
  | 'LATE_EARLY_LEAVE'  // Vào muộn VÀ về sớm
  | 'HALF_DAY'          // Chỉ làm ≥ 50% nhưng < 100% giờ chuẩn
  | 'ABSENT'            // Không đến hoặc làm quá ít (< 50% giờ chuẩn)
  | 'PENDING_CHECKOUT'  // Đã clock-in, CHƯA clock-out ← Critical warning
  | 'NO_SHIFT';         // Không có ca được gán

/** Kết quả sau khi Engine tính toán — dùng để INSERT/UPDATE daily_calculations */
export interface DailyCalculationResult {
  // ── Input tracking ──────────────────────────────────────────────
  employeeId:   number;
  workDate:     string;
  shiftRuleId:  number | null;

  // ── Scheduled timestamps (được tính từ workDate + ShiftRule) ────
  scheduledStart: Date | null;  // Giờ vào dự kiến (full timestamp)
  scheduledEnd:   Date | null;  // Giờ ra dự kiến (full timestamp)

  // ── Kết quả tính toán (đơn vị: PHÚT) ───────────────────────────
  workedMinutes:      number;   // Phút đã làm thực tế (đã trừ break nếu đủ điều kiện)
  standardMinutes:    number;   // Phút chuẩn = standardHours × 60
  lateMinutes:        number;   // Phút đi muộn sau grace period (≥ 0)
  earlyLeaveMinutes:  number;   // Phút về sớm sau grace period (≥ 0)
  otMinutes:          number;   // Phút OT (chỉ tính nếu vượt otThreshold, ≥ 0)
  absentMinutes:      number;   // Phút vắng = max(0, standardMinutes - workedMinutes)

  // ── Hệ số lương ─────────────────────────────────────────────────
  workCoefficient:  number;     // 0.0 → 1.0  (tỷ lệ ngày công)
  otCoefficient:    number;     // Công OT = (otMinutes / 60) × otMultiplier

  // ── Trạng thái ──────────────────────────────────────────────────
  status: AttendanceStatus;

  // ── Meta ────────────────────────────────────────────────────────
  calculatedAt:       Date;
  calculationNote:    string;   // Mô tả tóm tắt kết quả (dùng cho UI)
  isPreliminary:      boolean;  // true = real-time (chưa finalize), false = Cronjob đã chốt
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const HALF_DAY_THRESHOLD = 0.5;  // Làm ≥ 50% giờ chuẩn = HALF_DAY (không phải ABSENT)
const MIN_BREAK_THRESHOLD = 240; // Làm ≥ 4 giờ mới áp dụng trừ giờ nghỉ
const VN_TIMEZONE = 'Asia/Ho_Chi_Minh';

// ─────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Tính hiệu 2 timestamps theo phút.
 * CONVENTION: diffMinutes(later, earlier) → kết quả dương nếu later > earlier.
 *
 * ⚠️  CẢNH BÁO NEGATIVE BUG: Tuyệt đối KHÔNG đảo thứ tự tham số!
 *     diffMinutes(a, b) = (a - b) / 60000
 *     Nếu a < b → kết quả âm → caller phải clamp bằng clampMin0().
 */
function diffMinutes(later: Date, earlier: Date): number {
  return (later.getTime() - earlier.getTime()) / 60_000;
}

/**
 * Clamp giá trị về 0 nếu âm — phòng vệ cuối cùng chống negative minutes.
 * Tất cả output phút (late, early, OT, worked) đều phải đi qua hàm này.
 */
function clampMin0(n: number): number {
  return Math.max(0, n);
}

/**
 * Làm tròn phút về số nguyên gần nhất.
 * Phép tính timestamp có thể ra số thập phân nhỏ (do milliseconds).
 */
function roundMinutes(n: number): number {
  return Math.round(n);
}

/**
 * Xây dựng timestamp đầy đủ từ workDate (YYYY-MM-DD) + giờ ca (HH:MM).
 *
 * @param workDate  "2026-08-11"
 * @param timeStr   "22:00"
 * @param addDay    true nếu ca qua đêm và đây là scheduledEnd (sang ngày hôm sau)
 * @returns         Date object theo múi giờ Việt Nam
 *
 * OVERNIGHT EDGE CASE:
 *   workDate="2026-08-11", shiftEnd="06:00", isOvernight=true
 *   → addDay=true → Date = 2026-08-12T06:00:00+07:00
 *   → scheduledEnd (08/12 06:00) > scheduledStart (08/11 22:00) ✓
 */
function buildScheduledDatetime(
  workDate: string,
  timeStr:  string,
  addDay:   boolean = false
): Date {
  const [yearStr, monthStr, dayStr] = workDate.split('-');
  const [hourStr, minuteStr]        = timeStr.split(':');

  const year   = parseInt(yearStr,   10);
  const month  = parseInt(monthStr,  10) - 1;  // JS months: 0-indexed
  const day    = parseInt(dayStr,    10) + (addDay ? 1 : 0);
  const hours  = parseInt(hourStr,   10);
  const mins   = parseInt(minuteStr, 10);

  // new Date(y, m, d, h, min) → local time (Vietnam timezone trên server VN)
  // Nếu server chạy múi giờ UTC: cần convert. Dùng Intl API hoặc dayjs/date-fns.
  // Hiện tại: giả định server chạy Asia/Ho_Chi_Minh hoặc TZ env được set.
  return new Date(year, month, day, hours, mins, 0, 0);
}

/**
 * Tính số phút break thực sự áp dụng.
 * Chỉ trừ giờ nghỉ nếu nhân viên làm đủ ngưỡng tối thiểu (4 giờ).
 * → Tránh trường hợp: làm 2 tiếng nhưng bị trừ 1 tiếng break → workedMin = 60 (vô lý).
 */
function effectiveBreakMinutes(
  rawWorkedMinutes: number,
  breakMinutes:     number
): number {
  return rawWorkedMinutes >= MIN_BREAK_THRESHOLD ? breakMinutes : 0;
}

/**
 * Phân loại trạng thái cuối dựa trên kết quả tính toán.
 * Thứ tự kiểm tra rất quan trọng — ưu tiên trạng thái nghiêm trọng hơn.
 */
function classifyStatus(params: {
  hasClockIn:         boolean;
  hasClockOut:        boolean;
  workedMinutes:      number;
  standardMinutes:    number;
  lateMinutes:        number;
  earlyLeaveMinutes:  number;
}): AttendanceStatus {
  const { hasClockIn, hasClockOut, workedMinutes,
          standardMinutes, lateMinutes, earlyLeaveMinutes } = params;

  // Chưa có ca → không thể tính
  if (standardMinutes === 0) return 'ABSENT';

  // Không có clock-in → Vắng mặt
  if (!hasClockIn) return 'ABSENT';

  // Đã clock-in nhưng CHƯA clock-out → Cảnh báo đặc biệt
  if (!hasClockOut) return 'PENDING_CHECKOUT';

  const ratio = workedMinutes / standardMinutes;

  // Làm < 50% giờ chuẩn → Tính là Vắng (về mặt lương)
  if (ratio < HALF_DAY_THRESHOLD) return 'ABSENT';

  // Làm ≥ 50% nhưng < 100% → Nửa ngày
  if (ratio < 1.0) return 'HALF_DAY';

  // Làm đủ → phân loại theo muộn/sớm
  const isLate       = lateMinutes       > 0;
  const isEarlyLeave = earlyLeaveMinutes > 0;

  if (isLate && isEarlyLeave) return 'LATE_EARLY_LEAVE';
  if (isLate)                  return 'LATE';
  if (isEarlyLeave)            return 'EARLY_LEAVE';
  return 'PRESENT';
}

/**
 * Tạo ghi chú mô tả kết quả để hiển thị trên UI.
 * VD: "Đủ giờ | Vào muộn 7 phút | OT 35 phút"
 */
function buildCalcNote(params: {
  status:            AttendanceStatus;
  lateMinutes:       number;
  earlyLeaveMinutes: number;
  otMinutes:         number;
  workedMinutes:     number;
  standardMinutes:   number;
}): string {
  const { status, lateMinutes, earlyLeaveMinutes, otMinutes,
          workedMinutes, standardMinutes } = params;

  const parts: string[] = [];

  switch (status) {
    case 'PRESENT':           parts.push('✅ Đủ giờ'); break;
    case 'LATE':              parts.push(`⚠️ Vào muộn ${lateMinutes} phút`); break;
    case 'EARLY_LEAVE':       parts.push(`⚠️ Về sớm ${earlyLeaveMinutes} phút`); break;
    case 'LATE_EARLY_LEAVE':  parts.push(`⚠️ Muộn ${lateMinutes}p, sớm ${earlyLeaveMinutes}p`); break;
    case 'HALF_DAY':          parts.push(`🔶 Nửa ngày (${workedMinutes}/${standardMinutes}p)`); break;
    case 'ABSENT':            parts.push('🔴 Vắng mặt'); break;
    case 'PENDING_CHECKOUT':  parts.push('🕐 Chưa clock-out — cần kiểm tra'); break;
    case 'NO_SHIFT':          parts.push('— Không có ca'); break;
  }

  if (otMinutes > 0) parts.push(`⏰ OT ${otMinutes} phút`);

  return parts.join(' | ');
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN FUNCTION — calculateDailyAttendance()
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hàm tính toán cốt lõi của Rule Engine.
 *
 * PURE FUNCTION:
 *   - Không truy cập DB
 *   - Không ghi log
 *   - Không có side effect
 *   → Caller (API route / Cronjob) chịu trách nhiệm persist kết quả.
 *
 * @param record    Dữ liệu chấm công từ attendance_records
 * @param rule      Cấu hình ca từ shift_rules (null = không có ca)
 * @param options   Tùy chọn (isPreliminary: từ real-time hay Cronjob)
 *
 * @returns         DailyCalculationResult — dữ liệu để upsert daily_calculations
 */
export function calculateDailyAttendance(
  record:  AttendanceInput,
  rule:    ShiftRuleInput | null,
  options: { isPreliminary: boolean } = { isPreliminary: true }
): DailyCalculationResult {

  const calculatedAt = new Date();

  // ── Trường hợp đặc biệt: Không có ca ──────────────────────────────────────
  if (!rule) {
    return {
      employeeId:        record.employeeId,
      workDate:          record.workDate,
      shiftRuleId:       null,
      scheduledStart:    null,
      scheduledEnd:      null,
      workedMinutes:     0,
      standardMinutes:   0,
      lateMinutes:       0,
      earlyLeaveMinutes: 0,
      otMinutes:         0,
      absentMinutes:     0,
      workCoefficient:   0,
      otCoefficient:     0,
      status:            'NO_SHIFT',
      calculatedAt,
      calculationNote:   '— Chưa được gán ca làm việc',
      isPreliminary:     options.isPreliminary,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // BƯỚC 1: Xây dựng Scheduled Timestamps từ workDate + ShiftRule
  // ═══════════════════════════════════════════════════════════════════════════

  const scheduledStart = buildScheduledDatetime(
    record.workDate,
    rule.shiftStart,
    false               // scheduledStart luôn là workDate (anchor)
  );

  const scheduledEnd = buildScheduledDatetime(
    record.workDate,
    rule.shiftEnd,
    rule.isOvernight    // ← OVERNIGHT KEY: nếu ca đêm, scheduledEnd = workDate+1
  );

  // Sanity check: scheduledEnd phải luôn > scheduledStart
  // Nếu isOvernight=true và logic đúng, hiệu này luôn dương (~8h = 480 phút)
  const scheduledDuration = diffMinutes(scheduledEnd, scheduledStart);
  // scheduledDuration âm = BUG trong cấu hình ShiftRule → log cảnh báo
  if (scheduledDuration <= 0) {
    console.error(
      `[RuleEngine] BUG: scheduledEnd (${scheduledEnd.toISOString()}) ` +
      `<= scheduledStart (${scheduledStart.toISOString()}) ` +
      `— Check ShiftRule#${rule.id} isOvernight flag!`
    );
  }

  const standardMinutes = roundMinutes(rule.standardHours * 60); // 8h = 480

  // ═══════════════════════════════════════════════════════════════════════════
  // BƯỚC 2: PENDING_CHECKOUT — Nhân viên chưa clock-out
  // ═══════════════════════════════════════════════════════════════════════════

  if (!record.clockOut) {
    // Nếu cũng không có clock-in → Vắng mặt hoàn toàn
    if (!record.clockIn) {
      return {
        employeeId:        record.employeeId,
        workDate:          record.workDate,
        shiftRuleId:       rule.id,
        scheduledStart,
        scheduledEnd,
        workedMinutes:     0,
        standardMinutes,
        lateMinutes:       0,
        earlyLeaveMinutes: 0,
        otMinutes:         0,
        absentMinutes:     standardMinutes,
        workCoefficient:   0,
        otCoefficient:     0,
        status:            'ABSENT',
        calculatedAt,
        calculationNote:   '🔴 Vắng mặt — không có dữ liệu chấm công',
        isPreliminary:     options.isPreliminary,
      };
    }

    // Có clock-in nhưng KHÔNG có clock-out
    // → PENDING_CHECKOUT: nhân viên đang trong ca hoặc quên quẹt ra
    // → Tính lateMinutes sơ bộ (đã vào được rồi), nhưng không tính worked/OT
    const rawLate = diffMinutes(record.clockIn, scheduledStart);
    const lateMinutes = clampMin0(roundMinutes(rawLate - rule.graceLateMins));

    return {
      employeeId:        record.employeeId,
      workDate:          record.workDate,
      shiftRuleId:       rule.id,
      scheduledStart,
      scheduledEnd,
      workedMinutes:     0,      // Chưa tính được — chưa clock-out
      standardMinutes,
      lateMinutes,               // Có thể đã muộn từ lúc vào
      earlyLeaveMinutes: 0,
      otMinutes:         0,
      absentMinutes:     standardMinutes,
      workCoefficient:   0,
      otCoefficient:     0,
      status:            'PENDING_CHECKOUT',
      calculatedAt,
      calculationNote:   `🕐 Chưa clock-out${lateMinutes > 0 ? ` | Vào muộn ${lateMinutes}p` : ''}`,
      isPreliminary:     true,   // Luôn là preliminary khi chưa có clock-out
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // BƯỚC 3: Tính toán khi có đủ clock_in VÀ clock_out
  // ═══════════════════════════════════════════════════════════════════════════

  const clockIn  = record.clockIn!;
  const clockOut = record.clockOut;

  // ── 3A: Tổng phút đã có mặt (raw, chưa trừ break) ─────────────────────────
  // clockOut - clockIn: LUÔN dương vì cả 2 đều là timestamp tuyệt đối
  // Timestamp của clockOut (ngày D+1 nếu overnight) > clockIn (ngày D) ✓
  const rawWorkedMinutes = roundMinutes(diffMinutes(clockOut, clockIn));

  // Guard: nếu clockOut < clockIn (dữ liệu bẩn từ DB) → fallback về 0
  if (rawWorkedMinutes < 0) {
    console.error(
      `[RuleEngine] DATA ERROR: clockOut < clockIn for employee ${record.employeeId} ` +
      `on ${record.workDate}. clockIn=${clockIn.toISOString()}, clockOut=${clockOut.toISOString()}`
    );
    // Trả về ABSENT với note lỗi thay vì crash
    return buildErrorResult(record, rule, scheduledStart, scheduledEnd, standardMinutes,
      'LỖI DỮ LIỆU: Giờ ra trước giờ vào — cần admin kiểm tra', calculatedAt);
  }

  // ── 3B: Trừ giờ nghỉ giải lao (chỉ khi đã làm đủ ngưỡng) ─────────────────
  const breakDeduction   = effectiveBreakMinutes(rawWorkedMinutes, rule.breakMinutes);
  const workedMinutes    = clampMin0(rawWorkedMinutes - breakDeduction);

  // ── 3C: Tính LATE MINUTES ──────────────────────────────────────────────────
  //
  // rawLate = clockIn - scheduledStart
  //   Dương  → nhân viên vào SAU giờ quy định (muộn)
  //   Âm     → nhân viên vào TRƯỚC giờ quy định (sớm) → clamp về 0
  //
  // Áp dụng grace: chỉ phạt phần VỐT QUÁ grace period
  //   VD: rawLate=8, grace=5 → penalized=3 (chỉ phạt 3 phút)
  //   VD: rawLate=3, grace=5 → penalized=-2 → clamp → 0 (không phạt)
  const rawLate      = diffMinutes(clockIn, scheduledStart);  // dương = muộn
  const lateMinutes  = clampMin0(roundMinutes(rawLate - rule.graceLateMins));

  // ── 3D: Tính EARLY LEAVE MINUTES ──────────────────────────────────────────
  //
  // rawEarly = scheduledEnd - clockOut
  //   Dương  → nhân viên ra TRƯỚC giờ kết thúc ca (sớm)
  //   Âm     → nhân viên ra SAU giờ kết thúc ca (OT) → clamp về 0
  //
  // Logic đối xứng hoàn toàn với lateMinutes.
  const rawEarly          = diffMinutes(scheduledEnd, clockOut);  // dương = sớm
  const earlyLeaveMinutes = clampMin0(roundMinutes(rawEarly - rule.graceEarlyMins));

  // ── 3E: Tính OT MINUTES ────────────────────────────────────────────────────
  //
  // rawOT = clockOut - scheduledEnd
  //   Dương  → nhân viên ra SAU giờ kết thúc ca (làm thêm)
  //   Âm     → nhân viên ra TRƯỚC giờ kết thúc ca (sớm) → clamp về 0
  //
  // Áp dụng Threshold: chỉ tính OT nếu làm thêm ĐỦ ngưỡng (không phải từng phút)
  //   VD: threshold=30, rawOT=25 → 25 < 30 → otMinutes = 0 (không đủ ngưỡng)
  //   VD: threshold=30, rawOT=45 → 45 >= 30 → otMinutes = 45 (tính toàn bộ)
  const rawOT     = diffMinutes(clockOut, scheduledEnd);  // dương = OT
  const otMinutes = clampMin0(rawOT) >= rule.otThresholdMins
    ? roundMinutes(rawOT)
    : 0;

  // ── 3F: Tính phút vắng ────────────────────────────────────────────────────
  const absentMinutes = clampMin0(standardMinutes - workedMinutes);

  // ═══════════════════════════════════════════════════════════════════════════
  // BƯỚC 4: Hệ số lương
  // ═══════════════════════════════════════════════════════════════════════════

  // workCoefficient: 0.0 → 1.0 (không vượt quá 1.0 dù làm nhiều hơn)
  // OT được tính riêng qua otCoefficient
  const workCoefficient = standardMinutes > 0
    ? Math.min(1.0, workedMinutes / standardMinutes)
    : 0;

  // otCoefficient: số công OT = (số giờ OT) × hệ số lương OT
  const otCoefficient = (otMinutes / 60) * rule.otMultiplier;

  // ═══════════════════════════════════════════════════════════════════════════
  // BƯỚC 5: Phân loại trạng thái
  // ═══════════════════════════════════════════════════════════════════════════

  const status = classifyStatus({
    hasClockIn:  true,
    hasClockOut: true,
    workedMinutes,
    standardMinutes,
    lateMinutes,
    earlyLeaveMinutes,
  });

  const calculationNote = buildCalcNote({
    status, lateMinutes, earlyLeaveMinutes,
    otMinutes, workedMinutes, standardMinutes,
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // OUTPUT
  // ═══════════════════════════════════════════════════════════════════════════

  return {
    employeeId:        record.employeeId,
    workDate:          record.workDate,
    shiftRuleId:       rule.id,
    scheduledStart,
    scheduledEnd,
    workedMinutes,
    standardMinutes,
    lateMinutes,
    earlyLeaveMinutes,
    otMinutes,
    absentMinutes,
    workCoefficient,
    otCoefficient,
    status,
    calculatedAt,
    calculationNote,
    isPreliminary:     options.isPreliminary,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Kết quả khi gặp data error (không crash, graceful fallback)
// ─────────────────────────────────────────────────────────────────────────────
function buildErrorResult(
  record:       AttendanceInput,
  rule:         ShiftRuleInput,
  scheduledStart: Date,
  scheduledEnd:   Date,
  standardMinutes: number,
  errorNote:    string,
  calculatedAt: Date
): DailyCalculationResult {
  return {
    employeeId:        record.employeeId,
    workDate:          record.workDate,
    shiftRuleId:       rule.id,
    scheduledStart,
    scheduledEnd,
    workedMinutes:     0,
    standardMinutes,
    lateMinutes:       0,
    earlyLeaveMinutes: 0,
    otMinutes:         0,
    absentMinutes:     standardMinutes,
    workCoefficient:   0,
    otCoefficient:     0,
    status:            'ABSENT',
    calculatedAt,
    calculationNote:   `🚨 ${errorNote}`,
    isPreliminary:     true,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// BATCH HELPER: Tính toán nhiều records cùng lúc (dùng cho Cronjob)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Tính toán batch cho nhiều nhân viên trong 1 ngày.
 * Dùng cho Cronjob 07:00 sáng — không await riêng lẻ, process tuần tự.
 *
 * @param records   Danh sách attendance records của ngày cần tính
 * @param ruleMap   Map<shiftRuleId, ShiftRuleInput> để lookup nhanh
 */
export function calculateBatch(
  records: AttendanceInput[],
  ruleMap:  Map<number, ShiftRuleInput>
): DailyCalculationResult[] {
  return records.map((record) => {
    const rule = record.shiftRuleId != null
      ? (ruleMap.get(record.shiftRuleId) ?? null)
      : null;
    return calculateDailyAttendance(record, rule, { isPreliminary: false });
  });
}
