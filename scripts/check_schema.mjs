import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

const cols = await sql`
  SELECT column_name, data_type, is_nullable
  FROM information_schema.columns
  WHERE table_name = 'users'
  ORDER BY ordinal_position
`;
console.log('\n=== users TABLE COLUMNS ===');
cols.forEach(c => console.log(
  String(c.column_name).padEnd(22),
  String(c.data_type).padEnd(15),
  c.is_nullable
));

// Check if email column exists
const hasEmail = cols.some(c => c.column_name === 'email');
console.log('\nHas email column:', hasEmail);
process.exit(0);
