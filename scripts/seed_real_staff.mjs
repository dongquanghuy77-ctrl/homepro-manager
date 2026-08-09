import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

console.log('🚀 Migrating Users schema and seeding real staff list...');

// 1. Alter table to add position and birth_date columns if not exist
await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS position TEXT`;
await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS birth_date TEXT`;

console.log('✅ Added position and birth_date columns to users table.');

// 2. Real staff data from user document
const realStaff = [
  { name: 'ĐỒNG QUANG HUY', username: 'huy.dong', birthDate: '05/05/1992', position: 'Kỹ thuật xưởng', role: 'ADMIN' },
  { name: 'LÊ TRUNG DUY', username: 'duy.le', birthDate: '20/04/1990', position: 'Kỹ thuật', role: 'SUPERVISOR' },
  { name: 'NGÔ ANH TUẤN', username: 'tuan.ngo', birthDate: '28/09/1997', position: 'Kỹ thuật', role: 'SUPERVISOR' },
  { name: 'MAI QUỐC QUÂN', username: 'quan.mai', birthDate: '23/06/1990', position: 'Kỹ thuật Xưởng', role: 'MANAGER' },
  { name: 'TRẦN VĂN MINH', username: 'minh.tran', birthDate: '03/12/1991', position: 'Kỹ thuật xưởng', role: 'MANAGER' },
  { name: 'TRẦN THANH PHÚC', username: 'phuc.tran', birthDate: '22/12/1991', position: 'Công nhân', role: 'WORKER' },
  { name: 'PHẠM MINH THƯƠNG', username: 'thuong.pham', birthDate: '28/03/1992', position: 'Công nhân', role: 'WORKER' },
  { name: 'NGUYỄN VĂN CƯỜNG (1973)', username: 'cuong.nguyen73', birthDate: '23/03/1973', position: 'Công nhân', role: 'WORKER' },
  { name: 'TRẦN VĂN LŨY', username: 'luy.tran', birthDate: '01/04/1974', position: 'Công nhân', role: 'WORKER' },
  { name: 'HUỲNH THÀNH VINH', username: 'vinh.huynh', birthDate: '28/09/2003', position: 'Công nhân', role: 'WORKER' },
  { name: 'NGUYỄN VIẾT HÙNG', username: 'hung.nguyen', birthDate: '13/03/1987', position: 'Công nhân', role: 'WORKER' },
  { name: 'LÊ VĂN SƠN', username: 'son.le', birthDate: '19/04/2000', position: 'Công nhân', role: 'WORKER' },
  { name: 'NGUYỄN VĂN CƯỜNG (1970)', username: 'cuong.nguyen70', birthDate: '15/12/1970', position: 'Công nhân', role: 'WORKER' },
  { name: 'NGUYỄN QUỐC TIẾN', username: 'tien.nguyen', birthDate: '02/02/1992', position: 'Công nhân', role: 'WORKER' },
];

for (const staff of realStaff) {
  // Upsert user
  await sql`
    INSERT INTO users (username, password, name, position, birth_date, role)
    VALUES (${staff.username}, '123456', ${staff.name}, ${staff.position}, ${staff.birthDate}, ${staff.role})
    ON CONFLICT (username) 
    DO UPDATE SET 
      name = EXCLUDED.name,
      position = EXCLUDED.position,
      birth_date = EXCLUDED.birth_date,
      role = EXCLUDED.role;
  `;
}

console.log('✅ All 14 real staff members inserted/updated in database!');

const allUsers = await sql`
  SELECT id, username, name, position, birth_date, role 
  FROM users 
  ORDER BY id
`;

console.log('📋 Staff List in DB:', allUsers);
