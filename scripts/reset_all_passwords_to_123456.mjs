import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

console.log('🔄 Setting default password "123456" for ALL users in DB...');

await sql`UPDATE users SET password = '123456'`;

console.log('✅ Success! All users now have password "123456".');

const list = await sql`SELECT id, username, name, password, role FROM users ORDER BY id`;
console.log('📋 Updated Users:', list);
