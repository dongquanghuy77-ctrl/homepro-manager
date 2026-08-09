// scripts/create_demo_user.mjs
import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';

const sql = neon(process.env.DATABASE_URL);
const hash = await bcrypt.hash('HomePro@2026', 10);

await sql`
  INSERT INTO users (username, password, name, role, position, active)
  VALUES ('demo', ${hash}, 'Tài khoản Demo', 'VIEWER', 'Khách tham quan', true)
  ON CONFLICT (username) DO UPDATE SET password = ${hash}, active = true
`;

console.log('✅ Tài khoản demo đã được tạo thành công!');
console.log('   Username: demo');
console.log('   Password: HomePro@2026');
console.log('   Role: VIEWER (chỉ xem)');
process.exit(0);
