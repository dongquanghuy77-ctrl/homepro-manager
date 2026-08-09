import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name`;
console.log('DB TABLES:', tables.map(t => t.table_name).join(', '));

// Check leave_requests
try {
  const cols = await sql`SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name='leave_requests' ORDER BY ordinal_position`;
  if (cols.length === 0) {
    console.log('\nleave_requests: TABLE DOES NOT EXIST IN DB');
  } else {
    console.log('\nleave_requests columns:');
    cols.forEach(c => console.log(' ', String(c.column_name).padEnd(20), c.data_type, c.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'));
    const [{ n }] = await sql`SELECT COUNT(*) as n FROM leave_requests`;
    console.log('Existing rows:', n);
  }
} catch (e) {
  console.log('leave_requests ERROR:', e.message);
}

// Check constraints on leave_requests
try {
  const constraints = await sql`
    SELECT tc.constraint_name, tc.constraint_type, kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'leave_requests'
    ORDER BY tc.constraint_name, kcu.ordinal_position
  `;
  console.log('\nConstraints:', constraints.map(c => `${c.constraint_name}(${c.column_name})`).join(', '));
} catch (e) {
  console.log('Constraints error:', e.message);
}

process.exit(0);
