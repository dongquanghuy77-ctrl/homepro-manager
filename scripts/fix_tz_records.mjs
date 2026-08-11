// Fix bản ghi bị sai timezone (nhập tay qua modal trước khi fix)
// Chỉ ảnh hưởng record 2026-08-09 cho employee có check_in/out bị offset 7h
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

console.log('\n=== KIỂM TRA RECORD 2026-08-09 ===\n');

const records = await sql`
  SELECT a.id, a.employee_id, a.work_date, a.check_in, a.check_out, a.total_hours, a.status, u.name
  FROM attendance a
  JOIN users u ON u.id = a.employee_id
  WHERE a.work_date = '2026-08-09'
  ORDER BY a.id
`;

for (const r of records) {
  const ci = r.check_in;
  const co = r.check_out;
  const ciStr = ci ? new Date(ci).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' }) : 'null';
  const coStr = co ? new Date(co).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' }) : 'null';
  console.log(`  id=${r.id} | NV: ${r.name} | ci_display=${ciStr} | co_display=${coStr} | hours=${r.total_hours} | status=${r.status}`);

  // Nhận diện bản ghi bị sai timezone:
  // Nếu giờ hiển thị >= 15:00 (15h chiều tối hoặc 00:00 sáng), khả năng bị offset +7h sai
  const ciHour = ci ? new Date(ci).getHours() : -1; // local (VN+7 on this machine)
  const coHour = co ? new Date(co).getHours() : -1;

  // Bản ghi hợp lệ: check_in phải là giờ làm việc thực tế (5h-12h VN)
  // Bản ghi bị sai: check_in >= 15h VN (do lưu 8h VN nhưng DB ghi UTC 8h → hiển thị 15h VN)
  if (ciHour >= 13 || coHour === 0) {
    console.log(`  ⚠️  BẢN GHI NÀY CÓ VẤN ĐỀ TIMEZONE — sẽ xóa để nhập lại đúng`);
    await sql`DELETE FROM attendance WHERE id = ${r.id}`;
    console.log(`  🗑️  Đã xóa record id=${r.id}\n`);
  } else {
    console.log(`  ✅ Bản ghi này OK\n`);
  }
}

console.log('=== Hoàn tất ===\n');
process.exit(0);
