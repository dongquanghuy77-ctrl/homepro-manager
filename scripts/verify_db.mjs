// scripts/verify_db.mjs — Xác minh cấu trúc DB trên Neon
import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';

const env = readFileSync('.env.local', 'utf8');
for (const line of env.split('\n')) {
  const [k, ...v] = line.split('=');
  if (k && v.length) process.env[k.trim()] = v.join('=').trim();
}

const sql = neon(process.env.DATABASE_URL);

console.log('\n=== KIỂM TRA DB NEON ===\n');

// 1. Kiểm tra bảng (tagged template — trả về array trực tiếp)
const tables = await sql`
  SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'public'
  ORDER BY table_name
`;

console.log('📋 Danh sách bảng:');
tables.forEach(r => console.log(' ✅', r.table_name));

// 2. Kiểm tra cột mới của projects
const projCols = await sql`
  SELECT column_name, data_type
  FROM information_schema.columns
  WHERE table_name = 'projects'
    AND column_name IN ('target_material_cost', 'target_labor_cost')
`;
console.log('\n📦 Cột mới trong projects:');
if (projCols.length === 0) console.log('  ⚠️  Chưa có — cần chạy migration');
projCols.forEach(r => console.log(` ✅ ${r.column_name}: ${r.data_type}`));

// 3. Kiểm tra trigger
const triggers = await sql`
  SELECT trigger_name, event_object_table
  FROM information_schema.triggers
  WHERE trigger_schema = 'public'
`;
console.log('\n⚡ Triggers:');
if (triggers.length === 0) console.log('  ⚠️  Chưa có trigger nào');
triggers.forEach(r => console.log(` ✅ ${r.trigger_name} ON ${r.event_object_table}`));

// 4. Đếm dữ liệu — kiểm tra từng bảng riêng để tránh lỗi
const checkTable = async (name) => {
  try {
    const r = await sql.query(`SELECT COUNT(*) as cnt FROM ${name}`);
    return r[0]?.cnt ?? r?.rows?.[0]?.cnt ?? '?';
  } catch { return 'N/A (bảng chưa tồn tại)'; }
};

console.log('\n📊 Số dòng dữ liệu:');
const tbls = ['users','employees','attendance','production_bom_lines','material_tracking_logs','projects'];
for (const t of tbls) {
  const cnt = await checkTable(t);
  console.log(` • ${t}: ${cnt} dòng`);
}

console.log('\n✅ Xác minh hoàn tất\n');
