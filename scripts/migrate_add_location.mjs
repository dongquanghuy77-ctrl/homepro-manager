// Migration: thêm cột location vào bảng attendance
// Cột nullable → không ảnh hưởng 529 bản ghi cũ
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

console.log('\n=== MIGRATION: ADD location TO attendance ===\n');

// Kiểm tra cột đã tồn tại chưa (an toàn khi chạy lại)
const exists = await sql`
  SELECT column_name FROM information_schema.columns
  WHERE table_name = 'attendance' AND column_name = 'location'
`;

if (exists.length > 0) {
  console.log('✅ Cột location đã tồn tại — bỏ qua migration');
} else {
  await sql`ALTER TABLE attendance ADD COLUMN location TEXT`;
  console.log('✅ Đã thêm cột location (TEXT, nullable)');
}

// Xác nhận
const cols = await sql`
  SELECT column_name, data_type, is_nullable
  FROM information_schema.columns
  WHERE table_name = 'attendance'
  ORDER BY ordinal_position
`;
console.log('\n--- Cấu trúc bảng attendance sau migration ---');
cols.forEach(c => console.log(`  ${c.column_name}: ${c.data_type} (nullable=${c.is_nullable})`));

process.exit(0);
