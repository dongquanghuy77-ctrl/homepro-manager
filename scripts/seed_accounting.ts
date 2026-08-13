import { Client } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

async function seed() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  console.log('Seeding Accounting Chart of Accounts (Thông tư 200)...');
  
  const defaultAccounts = [
    { code: '111', name: 'Tiền mặt', type: 'ASSET', isGroup: true },
    { code: '1111', name: 'Tiền Việt Nam', type: 'ASSET', isGroup: false },
    { code: '112', name: 'Tiền gửi ngân hàng', type: 'ASSET', isGroup: true },
    { code: '1121', name: 'Tiền Việt Nam (NH)', type: 'ASSET', isGroup: false },
    
    { code: '334', name: 'Phải trả người lao động', type: 'LIABILITY', isGroup: true },
    { code: '3341', name: 'Phải trả công nhân viên', type: 'LIABILITY', isGroup: false },
    
    { code: '338', name: 'Phải trả, phải nộp khác', type: 'LIABILITY', isGroup: true },
    { code: '3383', name: 'Bảo hiểm xã hội', type: 'LIABILITY', isGroup: false },
    { code: '3384', name: 'Bảo hiểm y tế', type: 'LIABILITY', isGroup: false },
    { code: '3386', name: 'Bảo hiểm thất nghiệp', type: 'LIABILITY', isGroup: false },
    { code: '3335', name: 'Thuế thu nhập cá nhân', type: 'LIABILITY', isGroup: false },
    
    { code: '642', name: 'Chi phí quản lý doanh nghiệp', type: 'EXPENSE', isGroup: true },
    { code: '6421', name: 'Chi phí nhân viên quản lý', type: 'EXPENSE', isGroup: false },
    
    { code: '622', name: 'Chi phí nhân công trực tiếp', type: 'EXPENSE', isGroup: false },
    { code: '627', name: 'Chi phí sản xuất chung', type: 'EXPENSE', isGroup: true },
    { code: '6271', name: 'Chi phí nhân viên phân xưởng', type: 'EXPENSE', isGroup: false },
  ];

  for (const acc of defaultAccounts) {
    try {
      await client.query(`
        INSERT INTO accounts (code, name, type, is_group) 
        VALUES ($1, $2, $3, $4) 
        ON CONFLICT (code) DO NOTHING
      `, [acc.code, acc.name, acc.type, acc.isGroup]);
      console.log(`Inserted account: ${acc.code} - ${acc.name}`);
    } catch (e: any) {
      console.error(`Error inserting ${acc.code}:`, e.message);
    }
  }

  console.log('Seeding Period 08-2026...');
  try {
    await client.query(`
      INSERT INTO accounting_periods (name, start_date, end_date, status) 
      VALUES ($1, $2, $3, $4) 
      ON CONFLICT (name) DO NOTHING
    `, ['08-2026', '2026-08-01', '2026-08-31', 'OPEN']);
    console.log('Inserted period 08-2026');
  } catch (e: any) {
    console.error('Error inserting period:', e.message);
  }
  
  await client.end();
  process.exit(0);
}

seed().catch(console.error);
