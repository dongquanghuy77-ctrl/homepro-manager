import { Client } from '@neondatabase/serverless';

const connectionString = 'postgresql://neondb_owner:npg_dbPWisDQA8F6@ep-floral-union-az31v0st.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

async function run() {
  const client = new Client({ connectionString });
  await client.connect();
  
  try {
    const res = await client.query(`
      SELECT username, name as "fullName", role, department, active, employee_status 
      FROM users 
      WHERE active = true
    `);
    
    const users = res.rows;
    const roles = [...new Set(users.map(u => u.role))];
    const departments = [...new Set(users.map(u => u.department))];
    
    console.log("ROLES IN DB:", roles);
    console.log("DEPARTMENTS IN DB:", departments);
    
    const accountants = users.filter(u => u.department === 'Kế toán' || u.role === 'ACCOUNTANT');
    console.log("Kế toán Users:", accountants);

    const directors = users.filter(u => u.role === 'VIEWER' || u.role === 'DIRECTOR' || u.department?.toLowerCase().includes('giám đốc'));
    console.log("Director Users:", directors);
    
    const admins = users.filter(u => u.role === 'ADMIN');
    console.log("Admin Users:", admins);
  } finally {
    await client.end();
  }
}
run();
