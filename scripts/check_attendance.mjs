import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

const cols = await sql`
  SELECT column_name, data_type, is_nullable
  FROM information_schema.columns
  WHERE table_name = 'attendance'
  ORDER BY ordinal_position
`;
console.log('=== attendance TABLE ===');
cols.forEach(c => console.log(' ', String(c.column_name).padEnd(25), c.data_type));

// Check unique constraints
const constraints = await sql`
  SELECT tc.constraint_name, kcu.column_name
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
  WHERE tc.table_name = 'attendance'
  ORDER BY tc.constraint_name, kcu.ordinal_position
`;
console.log('\n=== CONSTRAINTS ===');
constraints.forEach(c => console.log(' ', c.constraint_name, '->', c.column_name));

// Check row count
const [count] = await sql`SELECT COUNT(*) as n FROM attendance`;
console.log('\nExisting rows:', count.n);
process.exit(0);
