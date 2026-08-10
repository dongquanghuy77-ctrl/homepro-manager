// src/lib/payroll.ts
// ══════════════════════════════════════════════════════════════════════════════
// SPRINT 3 — Payroll Engine: calculateMonthlyPayroll()
//
// Cơ sở pháp lý:
//   • Bộ luật Lao động 2019 (Luật 45/2019/QH14)
//   • Nghị định 145/2020/NĐ-CP (hướng dẫn tính lương làm thêm giờ)
//   • Thông tư 23/2015/TT-BLĐTBXH (chia 26 ngày/tháng)
//
// ══════════════════════════════════════════════════════════════════════════════
// BẢNG RÀ SOÁT THUẬT TOÁN — PHÂN TÍCH ĐƠN GIÁ GỐC
// ══════════════════════════════════════════════════════════════════════════════
//
// official_salary = Lương chính thức (VND/tháng) — bao gồm phụ cấp
// basic_salary    = Lương cơ bản (VND/tháng) — mức BHXH đóng
//
// ┌──────────────────────────────────────────────────────────────────────────┐
// │  ĐƠN GIÁ GỐC (Derived Rates)                                            │
// ├──────────────────────────┬───────────────────────────────────────────────┤
// │  dailyOfficialRate       │ official_salary / 26                          │
// │  dailyBasicRate          │ basic_salary / 26                             │
// │  hourlyBasicRate         │ basic_salary / 26 / 8  ← VÌ SAO CHIA 8?      │
// │                          │ 1 ngày chuẩn = 8 tiếng làm việc              │
// │                          │ (Điều 105 Bộ luật Lao động 2019)             │
// │                          │ Khi tính OT theo giờ → phải quy đổi ngày→giờ │
// ├──────────────────────────┴───────────────────────────────────────────────┤
// │  Tại sao chia 26 (không phải 30, 31, 22)?                               │
// │  26 = số ngày làm việc chuẩn/tháng tại VN (T2-T7)                       │
// │  Thông tư 23/2015 quy định cố định = 26 (không phụ thuộc tháng thực)   │
// └──────────────────────────────────────────────────────────────────────────┘
//
// ┌──────────────────────────────────────────────────────────────────────────┐
// │  BẢNG CÔNG THỨC ĐẦY ĐỦ                                                  │
// ├────────────┬─────────────────────────────────────────────────────────────┤
// │  Loại      │  Công thức                                                  │
// ├────────────┼─────────────────────────────────────────────────────────────┤
// │  T2-T7     │  (official_salary / 26) × worked_days                       │
// ├────────────┼─────────────────────────────────────────────────────────────┤
// │  OT Eve    │  (basic_salary / 26 / 8) × evening_ot_hours × 1.5          │
// │  (17-22h)  │                                                             │
// ├────────────┼─────────────────────────────────────────────────────────────┤
// │  OT Night  │  (basic_salary / 26 / 8) × night_ot_hours × 2.0            │
// │  (>22h)    │                                                             │
// ├────────────┼─────────────────────────────────────────────────────────────┤
// │  CN bình   │  (basic_salary / 26 / 8) × sunday_hours × 2.0              │
// │  thường    │                                                             │
// ├────────────┼─────────────────────────────────────────────────────────────┤
// │  CN đêm    │  (basic_salary / 26 / 8) × sunday_night_hours × 4.0        │
// │  (>22h)    │                                                             │
// ├────────────┼─────────────────────────────────────────────────────────────┤
// │  Lễ nghỉ  │  (basic_salary / 26) × holiday_days_off                     │
// │  (không LV)│                                                             │
// ├────────────┼─────────────────────────────────────────────────────────────┤
// │  Lễ có LV  │  (official_salary / 26) × holiday_worked_weekday × 2.0     │
// │  (T2-T7)   │                                                             │
// ├────────────┼─────────────────────────────────────────────────────────────┤
// │  Lễ CN LV  │  (basic_salary / 26) × holiday_worked_sunday × 2.0         │
// └────────────┴─────────────────────────────────────────────────────────────┘
//
// ══════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

/** Số ngày chuẩn/tháng theo Thông tư 23/2015 — KHÔNG đổi theo tháng thực tế */
export const STANDARD_DAYS_PER_MONTH = 26;

/** Số giờ chuẩn/ngày — Điều 105 Bộ luật Lao động 2019 */
export const STANDARD_HOURS_PER_DAY = 8;

/** Hệ số OT theo Nghị định 145/2020 */
export const OT_MULTIPLIER = {
  WEEKDAY_EVENING:   1.5,  // T2-T7, 17h-22h
  WEEKDAY_NIGHT:     2.0,  // T2-T7, sau 22h
  SUNDAY:            2.0,  // Chủ nhật, giờ thường
  SUNDAY_NIGHT:      4.0,  // Chủ nhật, sau 22h
  HOLIDAY_WEEKDAY:   2.0,  // Lễ đi làm (T2-T7)
  HOLIDAY_SUNDAY:    2.0,  // Lễ rơi vào CN (dùng basic_salary)
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// ATTENDANCE ALLOWANCE — Phụ cấp chuyên cần
// ─────────────────────────────────────────────────────────────────────────────

/**
 * AllowanceTier — Cấu hình mức phụ cấp theo tổng phút vi phạm
 *
 * NGUYÊN TẮC: Đi muộn/về sớm KHÔNG phạt trừ lương gốc.
 *             Hình phạt duy nhất: cắt giảm Phụ cấp chuyên cần.
 *
 * Thuật toán:
 *   Sắp xếp tiers tăng dần theo maxViolationMins
 *   → Tìm tier đầu tiên có totalViolationMins <= maxViolationMins
 *   → Áp dụng pct đó vào maxAttendanceAllowance
 */
export interface AllowanceTier {
  maxViolationMins: number;  // Nếu tổng vi phạm <= giá trị này → áp dụng pct
  pct:              number;  // 0.0 (mất hết) đến 1.0 (100% phụ cấp)
  label:            string;  // Mô tả để hiển thị trên phiếu lương
}

/**
 * DEFAULT_ALLOWANCE_TIERS — Bộ cấu hình mặc định của xưởng
 *
 * Tier 0: 0 phút vi phạm  → 100% phụ cấp (chuyên cần hoàn hảo)
 * Tier 1: 1-30 phút       → 50%  phụ cấp (nhắc nhở lần đầu)
 * Tier 2: >30 phút         → 0%   phụ cấp (mất toàn bộ)
 *
 * Override bằng cách truyền customTiers vào calcAttendanceAllowance()
 */
export const DEFAULT_ALLOWANCE_TIERS: AllowanceTier[] = [
  { maxViolationMins: 0,    pct: 1.0, label: 'Không vi phạm — 100% phụ cấp' },
  { maxViolationMins: 30,   pct: 0.5, label: 'Vi phạm ≤30 phút — 50% phụ cấp' },
  { maxViolationMins: 9999, pct: 0.0, label: 'Vi phạm >30 phút — mất toàn bộ phụ cấp' },
];

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

/** Dữ liệu đầu vào từ tổng hợp DailyCalculations + LeaveBalances */
export interface PayrollInput {
  // ── Thông tin nhân viên ────────────────────────────────────────────────────
  employeeId:     number;
  employeeCode:   string;
  employeeName:   string;
  month:          number;   // 1-12
  year:           number;

  // ── Mức lương (từ users.official_salary, users.basic_salary) ──────────────
  officialSalary: number;   // Lương chính thức (VND/tháng)
  basicSalary:    number;   // Lương cơ bản - mức BHXH (VND/tháng)

  // ── Ngày công (T2-T7, không tính CN và ngày Lễ) ───────────────────────────
  regularWorkedDays: number; // Số ngày thực tế có mặt (PRESENT + LATE)

  // ── OT (T2-T7 only) — tính theo giờ ──────────────────────────────────────
  eveningOtHours:    number;  // OT trong khung 17h-22h (T2-T7)
  nightOtHours:      number;  // OT sau 22h (T2-T7)

  // ── Chủ nhật — tính theo giờ ──────────────────────────────────────────────
  sundayHours:       number;  // Giờ làm bình thường trong CN (<22h)
  sundayNightHours:  number;  // Giờ làm sau 22h trong CN

  // ── Ngày Lễ ───────────────────────────────────────────────────────────────
  holidayDaysOff:              number; // Ngày Lễ không đi làm (vẫn hưởng lương basic)
  holidayWorkedWeekdayDays:    number; // Ngày Lễ rơi vào T2-T7, có đi làm
  holidayWorkedSundayDays:     number; // Ngày Lễ rơi vào CN, có đi làm

  // ── Phép & Vắng ───────────────────────────────────────────────────────────
  paidLeaveDays:    number;   // Phép năm được duyệt (ON_LEAVE = vẫn hưởng lương)
  unpaidLeaveDays:  number;   // Nghỉ không lương (UNPAID → trừ lương)
  absentDays:       number;   // Vắng không phép (→ trừ lương + kỷ luật)

  // ── Phụ cấp chuyên cần (Attendance Allowance) ────────────────────────────
  // NGUYÊN TẮC: Đi muộn / về sớm KHÔNG trừ vào lương gốc.
  //             Hình phạt duy nhất là cắt giảm khoản phụ cấp chuyên cần này.
  attendanceAllowance:    number;         // Mức phụ cấp tối đa/tháng (VND) — từ SalaryContract
  totalLateEarlyMins:     number;         // Tổng phút đi muộn + về sớm trong tháng
  allowanceTiers?:        AllowanceTier[]; // Override tiers (mặc định: DEFAULT_ALLOWANCE_TIERS)

  // ── Khấu trừ khác ─────────────────────────────────────────────────────────
  advanceDeduction: number;   // Tạm ứng đã lĩnh trong tháng (VND)
  otherDeductions:  number;   // Các khoản trừ khác (VND)

  // ── BHXH (tính tự động từ basic_salary nếu isPaidBhxh = true) ─────────────
  isPaidBhxh:       boolean;  // true = đóng BHXH (NV thực hiện)
  // BHXH NV đóng: 8% + BHYT: 1.5% + BHTN: 1% = 10.5% basic_salary
  // BHXH chủ sử dụng: 17.5% (hiển thị tham khảo, không trừ vào lương NV)
}

/** Chi tiết từng khoản trong phiếu lương */
export interface PayrollLineItem {
  code:        string;   // Mã khoản (VD: 'REGULAR', 'OT_EVENING', ...)
  label:       string;   // Nhãn hiển thị
  formula:     string;   // Công thức dạng text (để audit/kiểm tra)
  unit:        string;   // 'ngày' | 'giờ' | 'lần'
  quantity:    number;   // Số lượng (ngày/giờ)
  rate:        number;   // Đơn giá (VND)
  multiplier:  number;   // Hệ số (1.0, 1.5, 2.0, 4.0)
  amount:      number;   // Thành tiền (VND) = quantity × rate × multiplier
  isDeduction: boolean;  // true = khoản trừ
}

/** Kết quả tính lương hoàn chỉnh */
export interface PayrollResult {
  // ── Input snapshot (để audit) ─────────────────────────────────────────────
  input:          PayrollInput;

  // ── Derived rates (đơn giá gốc) ───────────────────────────────────────────
  dailyOfficialRate: number;  // official_salary / 26
  dailyBasicRate:    number;  // basic_salary / 26
  hourlyBasicRate:   number;  // basic_salary / 26 / 8

  // ── Chi tiết từng khoản ───────────────────────────────────────────────────
  lineItems:      PayrollLineItem[];

  // ── Tổng hợp ──────────────────────────────────────────────────────────────
  grossEarnings:     number;  // Tổng thu nhập (trước khấu trừ)
  totalDeductions:   number;  // Tổng khấu trừ
  netSalary:         number;  // Lương thực nhận = grossEarnings - totalDeductions

  // ── BHXH (tham khảo) ──────────────────────────────────────────────────────
  bhxhEmployee:      number;  // NV đóng 10.5% basic_salary
  bhxhEmployer:      number;  // Chủ sử dụng đóng 17.5% (chi phí doanh nghiệp)

  // ── Meta ──────────────────────────────────────────────────────────────────
  calculatedAt:   Date;
  warnings:       string[];   // Cảnh báo (VD: "Vượt 200h OT/năm", ...)
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS — Tách nhỏ để dễ test và bảo trì
// ─────────────────────────────────────────────────────────────────────────────

/**
 * dailyOfficialRate — Đơn giá 1 ngày công chính thức (T2-T7)
 *
 * Cơ sở: official_salary / 26
 * official_salary bao gồm: lương căn bản + phụ cấp (Điều 90 BLLĐ)
 * 26 = số ngày chuẩn/tháng (cố định, Thông tư 23/2015)
 */
export function dailyOfficialRate(officialSalary: number): number {
  return officialSalary / STANDARD_DAYS_PER_MONTH;
}

/**
 * dailyBasicRate — Đơn giá 1 ngày BHXH
 *
 * Cơ sở: basic_salary / 26
 * Dùng cho: lương ngày Lễ (kể cả không đi làm), lương CN theo ngày
 */
export function dailyBasicRate(basicSalary: number): number {
  return basicSalary / STANDARD_DAYS_PER_MONTH;
}

/**
 * hourlyBasicRate — Đơn giá 1 giờ làm thêm
 *
 * Cơ sở: basic_salary / 26 / 8
 *
 * ── TẠI SAO CHIA 8? ──────────────────────────────────────────────────────────
 * 1. basic_salary / 26 → đơn giá 1 ngày chuẩn
 * 2. 1 ngày chuẩn = 8 tiếng (Điều 105, BLLĐ 2019)
 * 3. → đơn giá 1 giờ = đơn giá ngày ÷ 8
 *
 * Ví dụ: basic_salary = 10.000.000 VND
 *   dailyBasicRate  = 10.000.000 / 26 = 384.615 VND/ngày
 *   hourlyBasicRate = 384.615   /  8 = 48.077  VND/giờ
 *   OT evening (1.5x) = 48.077 × 1.5 = 72.115 VND/giờ OT
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function hourlyBasicRate(basicSalary: number): number {
  return basicSalary / STANDARD_DAYS_PER_MONTH / STANDARD_HOURS_PER_DAY;
}

/**
 * round2 — Làm tròn đến VND (không có xu)
 */
function round2(n: number): number {
  return Math.round(n);
}

// ─────────────────────────────────────────────────────────────────────────────
// EARNINGS HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * calcRegularPay — Lương ngày thường (T2-T7)
 *
 * Công thức: (official_salary / 26) × regularWorkedDays
 *
 * regularWorkedDays: số ngày có mặt thực tế (bao gồm đi muộn nhưng không tính CN, Lễ)
 * Ngày phép năm đã duyệt (ON_LEAVE, isPaid=true) cũng ĐƯỢC tính vào đây.
 */
export function calcRegularPay(
  officialSalary:    number,
  regularWorkedDays: number,
  paidLeaveDays:     number,
): PayrollLineItem[] {
  const dayRate    = dailyOfficialRate(officialSalary);
  const totalDays  = regularWorkedDays + paidLeaveDays;
  const lines: PayrollLineItem[] = [];

  if (regularWorkedDays > 0) {
    lines.push({
      code:        'REGULAR',
      label:       'Lương ngày công (T2-T7)',
      formula:     `(${officialSalary.toLocaleString('vi-VN')} / 26) × ${regularWorkedDays} ngày`,
      unit:        'ngày',
      quantity:    regularWorkedDays,
      rate:        round2(dayRate),
      multiplier:  1.0,
      amount:      round2(dayRate * regularWorkedDays),
      isDeduction: false,
    });
  }

  if (paidLeaveDays > 0) {
    lines.push({
      code:        'PAID_LEAVE',
      label:       'Lương phép năm (ON_LEAVE)',
      formula:     `(${officialSalary.toLocaleString('vi-VN')} / 26) × ${paidLeaveDays} ngày phép`,
      unit:        'ngày',
      quantity:    paidLeaveDays,
      rate:        round2(dayRate),
      multiplier:  1.0,
      amount:      round2(dayRate * paidLeaveDays),
      isDeduction: false,
    });
  }

  return lines;
}

/**
 * calcOtPay — Lương làm thêm giờ (T2-T7)
 *
 * OT chiều/tối (17h-22h): (basic_salary / 26 / 8) × eveningOtHours × 1.5
 * OT đêm (sau 22h):       (basic_salary / 26 / 8) × nightOtHours   × 2.0
 *
 * Lưu ý pháp lý: Tổng OT không được vượt 40h/tháng (trừ ngoại lệ theo Điều 107 BLLĐ)
 */
export function calcOtPay(
  basicSalary:    number,
  eveningOtHours: number,
  nightOtHours:   number,
): PayrollLineItem[] {
  const hrRate = hourlyBasicRate(basicSalary);
  const lines: PayrollLineItem[] = [];

  if (eveningOtHours > 0) {
    lines.push({
      code:        'OT_EVENING',
      label:       'Lương OT chiều/tối T2-T7 (17h-22h) × 1.5',
      formula:     `(${basicSalary.toLocaleString('vi-VN')} / 26 / 8) × ${eveningOtHours}h × 1.5`,
      unit:        'giờ',
      quantity:    eveningOtHours,
      rate:        round2(hrRate),
      multiplier:  OT_MULTIPLIER.WEEKDAY_EVENING,
      amount:      round2(hrRate * eveningOtHours * OT_MULTIPLIER.WEEKDAY_EVENING),
      isDeduction: false,
    });
  }

  if (nightOtHours > 0) {
    lines.push({
      code:        'OT_NIGHT',
      label:       'Lương OT đêm T2-T7 (sau 22h) × 2.0',
      formula:     `(${basicSalary.toLocaleString('vi-VN')} / 26 / 8) × ${nightOtHours}h × 2.0`,
      unit:        'giờ',
      quantity:    nightOtHours,
      rate:        round2(hrRate),
      multiplier:  OT_MULTIPLIER.WEEKDAY_NIGHT,
      amount:      round2(hrRate * nightOtHours * OT_MULTIPLIER.WEEKDAY_NIGHT),
      isDeduction: false,
    });
  }

  return lines;
}

/**
 * calcSundayPay — Lương Chủ Nhật
 *
 * Giờ thường CN (<22h):  (basic_salary / 26 / 8) × sundayHours      × 2.0
 * Giờ đêm CN  (>22h):   (basic_salary / 26 / 8) × sundayNightHours  × 4.0
 *
 * Lưu ý: CN tính theo basic_salary (không phải official_salary)
 * Vì CN là ngày ngoài lịch làm việc chuẩn → áp dụng luật làm thêm
 */
export function calcSundayPay(
  basicSalary:       number,
  sundayHours:       number,
  sundayNightHours:  number,
): PayrollLineItem[] {
  const hrRate = hourlyBasicRate(basicSalary);
  const lines: PayrollLineItem[] = [];

  if (sundayHours > 0) {
    lines.push({
      code:        'SUNDAY',
      label:       'Lương Chủ Nhật (<22h) × 2.0',
      formula:     `(${basicSalary.toLocaleString('vi-VN')} / 26 / 8) × ${sundayHours}h × 2.0`,
      unit:        'giờ',
      quantity:    sundayHours,
      rate:        round2(hrRate),
      multiplier:  OT_MULTIPLIER.SUNDAY,
      amount:      round2(hrRate * sundayHours * OT_MULTIPLIER.SUNDAY),
      isDeduction: false,
    });
  }

  if (sundayNightHours > 0) {
    lines.push({
      code:        'SUNDAY_NIGHT',
      label:       'Lương Chủ Nhật đêm (>22h) × 4.0',
      formula:     `(${basicSalary.toLocaleString('vi-VN')} / 26 / 8) × ${sundayNightHours}h × 4.0`,
      unit:        'giờ',
      quantity:    sundayNightHours,
      rate:        round2(hrRate),
      multiplier:  OT_MULTIPLIER.SUNDAY_NIGHT,
      amount:      round2(hrRate * sundayNightHours * OT_MULTIPLIER.SUNDAY_NIGHT),
      isDeduction: false,
    });
  }

  return lines;
}

/**
 * calcHolidayPay — Lương Ngày Lễ (3 kịch bản)
 *
 * ① Lễ KHÔNG đi làm:
 *    (basic_salary / 26) × holidayDaysOff
 *    → Hưởng lương basic (không phải official!) vì NV không tạo ra giá trị
 *    → Đây là quyền lợi tối thiểu theo Điều 112 BLLĐ
 *
 * ② Lễ ĐI LÀM (T2-T7):
 *    (official_salary / 26) × holidayWorkedWeekdayDays × 2.0
 *    → Dùng official (NV đang trong lịch làm việc), hệ số x2
 *
 * ③ Lễ ĐI LÀM rơi vào Chủ Nhật:
 *    (basic_salary / 26) × holidayWorkedSundayDays × 2.0
 *    → CN không nằm trong lịch chuẩn → dùng basic (tương tự luật CN)
 *
 * Lưu ý: Công thức ① dùng dailyBasicRate (ngày, không chia 8)
 *         vì nghỉ lễ tính theo ngày, không theo giờ
 */
export function calcHolidayPay(
  officialSalary:           number,
  basicSalary:              number,
  holidayDaysOff:           number,
  holidayWorkedWeekdayDays: number,
  holidayWorkedSundayDays:  number,
): PayrollLineItem[] {
  const dayOfficial = dailyOfficialRate(officialSalary);
  const dayBasic    = dailyBasicRate(basicSalary);
  const lines: PayrollLineItem[] = [];

  // ① Lễ nghỉ — hưởng lương basic
  if (holidayDaysOff > 0) {
    lines.push({
      code:        'HOLIDAY_OFF',
      label:       'Lương ngày Lễ (nghỉ có hưởng lương)',
      formula:     `(${basicSalary.toLocaleString('vi-VN')} / 26) × ${holidayDaysOff} ngày`,
      unit:        'ngày',
      quantity:    holidayDaysOff,
      rate:        round2(dayBasic),
      multiplier:  1.0,
      amount:      round2(dayBasic * holidayDaysOff),
      isDeduction: false,
    });
  }

  // ② Lễ có đi làm (T2-T7) — official × 2.0
  if (holidayWorkedWeekdayDays > 0) {
    lines.push({
      code:        'HOLIDAY_WORK_WEEKDAY',
      label:       'Lương làm việc ngày Lễ (T2-T7) × 2.0',
      formula:     `(${officialSalary.toLocaleString('vi-VN')} / 26) × ${holidayWorkedWeekdayDays} ngày × 2.0`,
      unit:        'ngày',
      quantity:    holidayWorkedWeekdayDays,
      rate:        round2(dayOfficial),
      multiplier:  OT_MULTIPLIER.HOLIDAY_WEEKDAY,
      amount:      round2(dayOfficial * holidayWorkedWeekdayDays * OT_MULTIPLIER.HOLIDAY_WEEKDAY),
      isDeduction: false,
    });
  }

  // ③ Lễ có đi làm (CN) — basic × 2.0
  if (holidayWorkedSundayDays > 0) {
    lines.push({
      code:        'HOLIDAY_WORK_SUNDAY',
      label:       'Lương làm việc ngày Lễ (Chủ Nhật) × 2.0',
      formula:     `(${basicSalary.toLocaleString('vi-VN')} / 26) × ${holidayWorkedSundayDays} ngày × 2.0`,
      unit:        'ngày',
      quantity:    holidayWorkedSundayDays,
      rate:        round2(dayBasic),
      multiplier:  OT_MULTIPLIER.HOLIDAY_SUNDAY,
      amount:      round2(dayBasic * holidayWorkedSundayDays * OT_MULTIPLIER.HOLIDAY_SUNDAY),
      isDeduction: false,
    });
  }

  return lines;
}

/**
 * calcAttendanceAllowance — Phụ cấp chuyên cần (sau khi xét vi phạm)
 *
 * ─── NGUYÊN TẮC THEN CHỐT ────────────────────────────────────────────────────
 * Đi muộn / về sớm KHÔNG trừ vào lương chính (lương T2-T7, OT, Lễ, CN).
 * Lương lao động thực tế phải được bảo toàn 100%.
 *
 * Hình phạt DUY NHẤT cho vi phạm chuyên cần:
 *   → Cắt giảm khoản "Phụ cấp chuyên cần" (attendance_allowance)
 *   → Lương gốc KHÔNG bị động đến
 *
 * Thuật toán Tier:
 *   Sắp tiers tăng dần theo maxViolationMins
 *   Tìm tier đầu tiên: totalViolationMins <= tier.maxViolationMins
 *   Áp dụng tier.pct × maxAllowance = allowance thực nhận
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * @param maxAllowance      Mức phụ cấp tối đa/tháng (từ salary_contracts)
 * @param totalViolationMins Tổng phút đi muộn + về sớm trong tháng
 * @param tiers             Bộ tiers cấu hình (mặc định: DEFAULT_ALLOWANCE_TIERS)
 */
export function calcAttendanceAllowance(
  maxAllowance:       number,
  totalViolationMins: number,
  tiers:              AllowanceTier[] = DEFAULT_ALLOWANCE_TIERS,
): PayrollLineItem {
  if (maxAllowance <= 0) {
    // Không có phụ cấp → trả line item bằng 0 (vẫn hiển thị để audit)
    return {
      code:        'ALLOWANCE_ATTENDANCE',
      label:       'Phụ cấp chuyên cần',
      formula:     'Không áp dụng (maxAllowance = 0)',
      unit:        'tháng',
      quantity:    1,
      rate:        0,
      multiplier:  0,
      amount:      0,
      isDeduction: false,
    };
  }

  // Sắp tăng dần để tìm tier phù hợp
  const sorted = [...tiers].sort((a, b) => a.maxViolationMins - b.maxViolationMins);
  const tier   = sorted.find(t => totalViolationMins <= t.maxViolationMins)
               ?? sorted[sorted.length - 1]; // fallback: tier cuối (thường pct=0)

  const actualAllowance = round2(maxAllowance * tier.pct);
  const fmt = (n: number) => n.toLocaleString('vi-VN');

  let formula: string;
  if (totalViolationMins === 0) {
    formula = `${fmt(maxAllowance)} × 100% (không vi phạm)`;
  } else if (tier.pct === 0) {
    formula = `${fmt(maxAllowance)} × 0% (${totalViolationMins} phút vi phạm > ${sorted[sorted.length - 2]?.maxViolationMins ?? 0} phút → mất toàn bộ)`;
  } else {
    formula = `${fmt(maxAllowance)} × ${tier.pct * 100}% (${totalViolationMins} phút vi phạm — ${tier.label})`;
  }

  return {
    code:        'ALLOWANCE_ATTENDANCE',
    label:       `Phụ cấp chuyên cần (${tier.label})`,
    formula,
    unit:        'tháng',
    quantity:    1,
    rate:        actualAllowance,
    multiplier:  tier.pct,
    amount:      actualAllowance,
    isDeduction: false,
  };
}

/**
 * calcDeductions — Tổng hợp các khoản khấu trừ
 *
 * LƯU Ý: KHÔNG còn DEDUCT_LATE ở đây.
 *         Đi muộn/về sớm chỉ ảnh hưởng calcAttendanceAllowance().
 *         Lương gốc (T2-T7, OT, Lễ, CN) được bảo toàn 100%.
 */
export function calcDeductions(
  officialSalary:   number,
  basicSalary:      number,
  unpaidLeaveDays:  number,
  absentDays:       number,
  advanceDeduction: number,
  otherDeductions:  number,
  isPaidBhxh:       boolean,
): PayrollLineItem[] {
  const dayOfficial = dailyOfficialRate(officialSalary);
  const lines: PayrollLineItem[] = [];

  // Nghỉ không lương (UNPAID LEAVE)
  if (unpaidLeaveDays > 0) {
    lines.push({
      code:        'DEDUCT_UNPAID',
      label:       'Trừ: Nghỉ không lương',
      formula:     `(${officialSalary.toLocaleString('vi-VN')} / 26) × ${unpaidLeaveDays} ngày`,
      unit:        'ngày',
      quantity:    unpaidLeaveDays,
      rate:        round2(dayOfficial),
      multiplier:  1.0,
      amount:      round2(dayOfficial * unpaidLeaveDays),
      isDeduction: true,
    });
  }

  // Vắng không phép (ABSENT — mất lương cả ngày)
  if (absentDays > 0) {
    lines.push({
      code:        'DEDUCT_ABSENT',
      label:       'Trừ: Vắng mặt không phép',
      formula:     `(${officialSalary.toLocaleString('vi-VN')} / 26) × ${absentDays} ngày`,
      unit:        'ngày',
      quantity:    absentDays,
      rate:        round2(dayOfficial),
      multiplier:  1.0,
      amount:      round2(dayOfficial * absentDays),
      isDeduction: true,
    });
  }

  // BHXH nhân viên đóng: 8% + BHYT 1.5% + BHTN 1% = 10.5% basic_salary
  if (isPaidBhxh) {
    const bhxh = round2(basicSalary * 0.105);
    lines.push({
      code:        'DEDUCT_BHXH',
      label:       'Trừ: BHXH + BHYT + BHTN nhân viên (10.5%)',
      formula:     `${basicSalary.toLocaleString('vi-VN')} × 10.5% (BHXH 8% + BHYT 1.5% + BHTN 1%)`,
      unit:        'tháng',
      quantity:    1,
      rate:        bhxh,
      multiplier:  1.0,
      amount:      bhxh,
      isDeduction: true,
    });
  }

  // Tạm ứng
  if (advanceDeduction > 0) {
    lines.push({
      code:        'DEDUCT_ADVANCE',
      label:       'Trừ: Tạm ứng trong tháng',
      formula:     `${advanceDeduction.toLocaleString('vi-VN')} VND`,
      unit:        'lần',
      quantity:    1,
      rate:        advanceDeduction,
      multiplier:  1.0,
      amount:      advanceDeduction,
      isDeduction: true,
    });
  }

  // Khấu trừ khác
  if (otherDeductions > 0) {
    lines.push({
      code:        'DEDUCT_OTHER',
      label:       'Trừ: Khấu trừ khác',
      formula:     `${otherDeductions.toLocaleString('vi-VN')} VND`,
      unit:        'lần',
      quantity:    1,
      rate:        otherDeductions,
      multiplier:  1.0,
      amount:      otherDeductions,
      isDeduction: true,
    });
  }

  return lines;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN FUNCTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * calculateMonthlyPayroll — Hàm tính lương tháng chính
 *
 * THUẦN FUNCTION: không có side effects, không gọi DB.
 * Caller (API route hoặc Cronjob) chịu trách nhiệm:
 *   1. Lấy input từ DailyCalculations aggregate
 *   2. Gọi hàm này
 *   3. Lưu kết quả vào bảng monthly_payroll
 */
export function calculateMonthlyPayroll(input: PayrollInput): PayrollResult {
  const {
    officialSalary, basicSalary,
    regularWorkedDays, paidLeaveDays,
    eveningOtHours, nightOtHours,
    sundayHours, sundayNightHours,
    holidayDaysOff, holidayWorkedWeekdayDays, holidayWorkedSundayDays,
    unpaidLeaveDays, absentDays,
    // Allowance fields (thay thế latePenaltyMins cũ)
    attendanceAllowance, totalLateEarlyMins,
    allowanceTiers,
    advanceDeduction, otherDeductions,
    isPaidBhxh,
  } = input;

  const warnings: string[] = [];

  // ── Validation ──────────────────────────────────────────────────────────────
  if (officialSalary <= 0) warnings.push('officialSalary = 0 — lương không thể tính');
  if (basicSalary   <= 0) warnings.push('basicSalary = 0 — OT/Lễ/CN sẽ = 0');
  if (basicSalary > officialSalary) {
    warnings.push('basicSalary > officialSalary — bất thường (basic thường ≤ official)');
  }
  const totalOtHours = eveningOtHours + nightOtHours + sundayHours + sundayNightHours;
  if (totalOtHours > 40) {
    warnings.push(`Tổng OT ${totalOtHours}h/tháng — vượt ngưỡng 40h/tháng (Điều 107 BLLĐ 2019)`);
  }
  if (totalLateEarlyMins > 0 && attendanceAllowance > 0) {
    warnings.push(
      `Vi phạm chuyên cần ${totalLateEarlyMins} phút — phụ cấp chuyên cần sẽ bị điều chỉnh theo tier`
    );
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // CÔNG THỨC LƯƠNG TỔNG CUỐI CÙNG (Final Salary Formula)
  // ──────────────────────────────────────────────────────────────────────────────
  // final_salary =
  //   ① calcRegularPay()            → Lương T2-T7 + Phép năm
  //   ② calcOtPay()                 → OT chiều/đêm T2-T7
  //   ③ calcSundayPay()             → Chủ Nhật (giờ thường + đêm)
  //   ④ calcHolidayPay()            → Ngày Lễ (nghỉ/làm T2-T7/làm CN)
  //   ⑤ calcAttendanceAllowance()   → Phụ cấp chuyên cần (đã xét vi phạm)
  //   - calcDeductions()            → Nghỉ KL + Vắng + BHXH + Tạm ứng
  //
  // ⚠️  Đi muộn/về sớm KHÔNG xuất hiện trong calcDeductions()
  //     → Chỉ ảnh hưởng đến ⑤ (cắt phụ cấp chuyên cần)
  //     → Lương gốc ①②③④ được bảo toàn tuyệt đối
  // ──────────────────────────────────────────────────────────────────────────────

  const earningLines: PayrollLineItem[] = [
    // ①
    ...calcRegularPay(officialSalary, regularWorkedDays, paidLeaveDays),
    // ②
    ...calcOtPay(basicSalary, eveningOtHours, nightOtHours),
    // ③
    ...calcSundayPay(basicSalary, sundayHours, sundayNightHours),
    // ④
    ...calcHolidayPay(
      officialSalary, basicSalary,
      holidayDaysOff, holidayWorkedWeekdayDays, holidayWorkedSundayDays
    ),
    // ⑤ Phụ cấp chuyên cần — bị giảm/cắt nếu có vi phạm muộn/về sớm
    calcAttendanceAllowance(
      attendanceAllowance,
      totalLateEarlyMins,
      allowanceTiers ?? DEFAULT_ALLOWANCE_TIERS,
    ),
  ];

  const deductionLines = calcDeductions(
    officialSalary, basicSalary,
    unpaidLeaveDays, absentDays,
    // latePenaltyMins đã bị loại bỏ — không còn trừ phút muộn vào lương gốc
    advanceDeduction, otherDeductions,
    isPaidBhxh,
  );

  const allLines = [...earningLines, ...deductionLines];

  // ── Tổng hợp ─────────────────────────────────────────────────────────────────
  const grossEarnings   = earningLines.reduce((s, l) => s + l.amount, 0);
  const totalDeductions = deductionLines.reduce((s, l) => s + l.amount, 0);
  const netSalary       = Math.max(0, grossEarnings - totalDeductions);

  // ── BHXH tham khảo ───────────────────────────────────────────────────────────
  const bhxhEmployee = isPaidBhxh ? round2(basicSalary * 0.105) : 0;
  const bhxhEmployer = round2(basicSalary * 0.175);  // Chi phí doanh nghiệp (tham khảo)

  return {
    input,
    dailyOfficialRate: round2(dailyOfficialRate(officialSalary)),
    dailyBasicRate:    round2(dailyBasicRate(basicSalary)),
    hourlyBasicRate:   round2(hourlyBasicRate(basicSalary)),
    lineItems:         allLines,
    grossEarnings:     round2(grossEarnings),
    totalDeductions:   round2(totalDeductions),
    netSalary:         round2(netSalary),
    bhxhEmployee,
    bhxhEmployer,
    calculatedAt:      new Date(),
    warnings,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY: formatPayrollSummary — Text tóm tắt cho log/audit
// ─────────────────────────────────────────────────────────────────────────────
export function formatPayrollSummary(result: PayrollResult): string {
  const { input, grossEarnings, totalDeductions, netSalary, warnings } = result;
  const fmt = (n: number) => n.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });

  const lines = [
    `═══ PHIẾU LƯƠNG ${input.month}/${input.year} — ${input.employeeName} (${input.employeeCode}) ═══`,
    `Lương chính thức: ${fmt(input.officialSalary)} | Lương cơ bản: ${fmt(input.basicSalary)}`,
    `Đơn giá ngày:     ${fmt(result.dailyOfficialRate)}/ngày (official)`,
    `Đơn giá giờ OT:   ${fmt(result.hourlyBasicRate)}/giờ (basic/26/8)`,
    ``,
    ...result.lineItems.map(l =>
      `${l.isDeduction ? '(-) ' : '(+) '}${l.label.padEnd(45)} ${fmt(l.amount).padStart(15)}`
    ),
    `${'─'.repeat(65)}`,
    `    ${'Tổng thu nhập'.padEnd(41)} ${fmt(grossEarnings).padStart(15)}`,
    `    ${'Tổng khấu trừ'.padEnd(41)} ${fmt(totalDeductions).padStart(15)}`,
    `${'═'.repeat(65)}`,
    `    ${'LƯƠNG THỰC NHẬN'.padEnd(41)} ${fmt(netSalary).padStart(15)}`,
  ];

  if (warnings.length > 0) {
    lines.push('', '⚠️  CẢNH BÁO:', ...warnings.map(w => `   • ${w}`));
  }

  return lines.join('\n');
}
