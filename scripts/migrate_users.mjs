import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

console.log('🚀 Migration users table to Neon PostgreSQL...');

await sql`
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'WORKER',
    phone TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )
`;

console.log('✅ Table users created successfully!');

// Seed default users if empty
const countResult = await sql`SELECT COUNT(*) FROM users`;
const count = parseInt(countResult[0].count);

if (count === 0) {
  console.log('🌱 Seeding default users...');
  
  await sql`
    INSERT INTO users (username, password, name, role, phone)
    VALUES 
      ('admin', 'admin123', 'Quản trị viên', 'ADMIN', '0901234567'),
      ('manager', 'manager123', 'Huy - Quản lý xưởng', 'MANAGER', '0909876543'),
      ('supervisor', 'sup123', 'Nguyễn Văn Minh - Giám sát công trình', 'SUPERVISOR', '0912345678'),
      ('worker', 'worker123', 'Trần Văn Thợ - Công nhân thi công', 'WORKER', '0987654321'),
      ('viewer', 'viewer123', 'Ban Giám Đốc (Xem)', 'VIEWER', '0933333333')
  `;
  
  console.log('✅ Default users seeded!');
} else {
  console.log(`ℹ️ Users table already has ${count} records.`);
}

const usersList = await sql`SELECT id, username, name, role FROM users ORDER BY id`;
console.log('📋 Existing users:', usersList);
