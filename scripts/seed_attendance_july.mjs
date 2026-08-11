// Seed attendance tháng 7/2026 cho tất cả nhân viên HomePro
// Đóng vai từng nhân viên — dữ liệu thực tế như xưởng thật
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

console.log('\n=== CHẤM CÔNG THÁNG 7/2026 — HOMEPRO XƯỞNG NỘI THẤT ===\n');

// ─── Ngày làm việc tháng 7/2026 (Thứ 2 → Thứ 7, nghỉ CN) ─────────────────
// July 1, 2026 = Wednesday
const workDays = [];
for (let d = 1; d <= 31; d++) {
  const date = new Date(2026, 6, d); // month 6 = July (0-indexed)
  const dow = date.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  if (dow !== 0) { // Chỉ nghỉ Chủ nhật
    workDays.push(`2026-07-${String(d).padStart(2, '0')}`);
  }
}
console.log(`📅 Số ngày làm việc tháng 7/2026: ${workDays.length} ngày (T2-T7, nghỉ CN)\n`);

// ─── Nhân viên tham gia chấm công ──────────────────────────────────────────
// id: name, role, department, attendance_pattern
const employees = [
  // Quản lý — ít vắng, không trễ
  { id: 2,  name: 'Huy - QL Xưởng',            lateRate: 0,    absentDays: ['2026-07-14'],               halfDays: [] },
  { id: 9,  name: 'Mai Quốc Quân',              lateRate: 0,    absentDays: ['2026-07-21'],               halfDays: [] },
  // Giám sát — đúng giờ, hiếm vắng
  { id: 3,  name: 'Nguyễn Văn Minh',            lateRate: 0.03, absentDays: [],                           halfDays: ['2026-07-07'] },
  { id: 7,  name: 'Lê Trung Duy',               lateRate: 0.03, absentDays: ['2026-07-28'],               halfDays: [] },
  { id: 8,  name: 'Ngô Anh Tuấn',               lateRate: 0.05, absentDays: [],                           halfDays: [] },
  // Công nhân — đôi khi trễ, đôi khi vắng
  { id: 4,  name: 'Trần Văn Thợ',               lateRate: 0.08, absentDays: ['2026-07-10'],               halfDays: ['2026-07-25'] },
  { id: 11, name: 'Trần Thanh Phúc',            lateRate: 0.06, absentDays: ['2026-07-03','2026-07-17'],  halfDays: [] },
  { id: 12, name: 'Phạm Minh Thương',           lateRate: 0.08, absentDays: ['2026-07-24'],               halfDays: ['2026-07-11'] },
  { id: 13, name: 'Nguyễn Văn Cường (1973)',    lateRate: 0.06, absentDays: ['2026-07-07'],               halfDays: [] },
  { id: 14, name: 'Trần Văn Lũy',               lateRate: 0.10, absentDays: ['2026-07-15','2026-07-22'], halfDays: [] },
  { id: 15, name: 'Huỳnh Thành Vinh',           lateRate: 0.05, absentDays: ['2026-07-29'],               halfDays: ['2026-07-04'] },
  { id: 16, name: 'Nguyễn Viết Hùng',           lateRate: 0.04, absentDays: [],                           halfDays: [] },
  { id: 17, name: 'Lê Văn Sơn',                 lateRate: 0.10, absentDays: ['2026-07-01','2026-07-08'], halfDays: [] },
  { id: 18, name: 'Nguyễn Văn Cường (1970)',    lateRate: 0.05, absentDays: ['2026-07-31'],               halfDays: ['2026-07-18'] },
  { id: 19, name: 'Nguyễn Quốc Tiến',           lateRate: 0.03, absentDays: ['2026-07-14'],               halfDays: [] },
  { id: 20, name: 'Trần Ngọc Minh',             lateRate: 0.08, absentDays: ['2026-07-09','2026-07-23'], halfDays: [] },
];

// ─── Helper: tạo thời gian check-in/out ─────────────────────────────────────
function makeCheckIn(date, isLate) {
  const base = new Date(`${date}T07:30:00+07:00`);
  if (isLate) {
    const lateMin = 30 + Math.floor(Math.random() * 90); // 30-120 phút trễ
    base.setMinutes(base.getMinutes() + lateMin);
    return { time: base, lateMinutes: lateMin };
  }
  // On time: ±8 phút
  const offset = Math.floor(Math.random() * 16) - 8;
  base.setMinutes(base.getMinutes() + offset);
  return { time: base, lateMinutes: 0 };
}

function makeCheckOut(date, isHalfDay, checkInTime) {
  if (isHalfDay) {
    const out = new Date(`${date}T12:00:00+07:00`);
    out.setMinutes(out.getMinutes() + Math.floor(Math.random() * 15));
    return out;
  }
  const base = new Date(`${date}T17:00:00+07:00`);
  // Overtime: đôi khi ở lại
  const overtime = Math.random() < 0.2 ? Math.floor(Math.random() * 60) : Math.floor(Math.random() * 20);
  base.setMinutes(base.getMinutes() + overtime);
  return base;
}

// ─── Xóa dữ liệu tháng 7 cũ (nếu có) ────────────────────────────────────────
await sql`DELETE FROM attendance WHERE work_date >= '2026-07-01' AND work_date <= '2026-07-31'`;
console.log('🗑️  Đã xóa dữ liệu tháng 7 cũ (nếu có)\n');

// ─── Nhập chấm công ───────────────────────────────────────────────────────────
let totalInserted = 0;
const summary = { PRESENT: 0, LATE: 0, ABSENT: 0, HALF_DAY: 0 };

for (const emp of employees) {
  let empPresent = 0, empLate = 0, empAbsent = 0, empHalf = 0;

  for (const date of workDays) {
    // Xác định trạng thái ngày này
    const isAbsent   = emp.absentDays.includes(date);
    const isHalfDay  = emp.halfDays.includes(date);
    const isLate     = !isAbsent && !isHalfDay && Math.random() < emp.lateRate;

    if (isAbsent) {
      await sql`
        INSERT INTO attendance (employee_id, work_date, status, late_minutes, total_hours, note, created_at, updated_at)
        VALUES (${emp.id}, ${date}, 'ABSENT', 0, 0, 'Vắng mặt', NOW(), NOW())
      `;
      empAbsent++; summary.ABSENT++;
    } else if (isHalfDay) {
      const ci = makeCheckIn(date, false);
      const co = makeCheckOut(date, true, ci.time);
      const hours = parseFloat(((co - ci.time) / 3600000).toFixed(1));
      await sql`
        INSERT INTO attendance (employee_id, work_date, check_in, check_out, status, late_minutes, total_hours, note, created_at, updated_at)
        VALUES (${emp.id}, ${date}, ${ci.time}, ${co}, 'HALF_DAY', 0, ${hours}, 'Nghỉ nửa ngày', NOW(), NOW())
      `;
      empHalf++; summary.HALF_DAY++;
    } else if (isLate) {
      const ci = makeCheckIn(date, true);
      const co = makeCheckOut(date, false, ci.time);
      const hours = parseFloat(((co - ci.time) / 3600000).toFixed(1));
      await sql`
        INSERT INTO attendance (employee_id, work_date, check_in, check_out, status, late_minutes, total_hours, created_at, updated_at)
        VALUES (${emp.id}, ${date}, ${ci.time}, ${co}, 'LATE', ${ci.lateMinutes}, ${hours}, NOW(), NOW())
      `;
      empLate++; summary.LATE++;
    } else {
      const ci = makeCheckIn(date, false);
      const co = makeCheckOut(date, false, ci.time);
      const hours = parseFloat(((co - ci.time) / 3600000).toFixed(1));
      await sql`
        INSERT INTO attendance (employee_id, work_date, check_in, check_out, status, late_minutes, total_hours, created_at, updated_at)
        VALUES (${emp.id}, ${date}, ${ci.time}, ${co}, 'PRESENT', 0, ${hours}, NOW(), NOW())
      `;
      empPresent++; summary.PRESENT++;
    }
    totalInserted++;
  }

  const icon = empAbsent === 0 && empLate === 0 ? '🟢' : empAbsent >= 2 ? '🔴' : '🟡';
  console.log(
    `  ${icon} ${emp.name.padEnd(28)} | ✅${String(empPresent).padStart(2)} ngày | ⚡${String(empLate).padStart(2)} trễ | 🌓${String(empHalf).padStart(2)} nửa ngày | ❌${String(empAbsent).padStart(2)} vắng`
  );
}

// ─── Thống kê tổng hợp ────────────────────────────────────────────────────────
console.log('\n=== TỔNG KẾT THÁNG 7/2026 ===');
console.log(`  📋 Tổng bản ghi: ${totalInserted} (${employees.length} NV × ${workDays.length} ngày)`);
console.log(`  ✅ Có mặt:       ${summary.PRESENT} lượt`);
console.log(`  ⚡ Đi trễ:       ${summary.LATE} lượt`);
console.log(`  🌓 Nửa ngày:     ${summary.HALF_DAY} lượt`);
console.log(`  ❌ Vắng mặt:     ${summary.ABSENT} lượt`);
const attendanceRate = ((summary.PRESENT + summary.LATE + summary.HALF_DAY) / totalInserted * 100).toFixed(1);
console.log(`  📊 Tỷ lệ đi làm: ${attendanceRate}%`);
console.log('\n✅ Hoàn tất! Vào /attendance để xem kết quả.\n');
