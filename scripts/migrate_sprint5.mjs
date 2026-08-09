import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

console.log('🚀 Migrating Sprint 5 tables (costs, customers, settings) to Neon DB...');

// 1. Create COSTS table
await sql`
  CREATE TABLE IF NOT EXISTS costs (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    amount REAL NOT NULL DEFAULT 0,
    category TEXT DEFAULT 'Vật tư mua ngoài',
    cost_date TEXT NOT NULL,
    notes TEXT,
    created_by_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )
`;
console.log('✅ Table costs created!');

// 2. Create CUSTOMERS table
await sql`
  CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )
`;
console.log('✅ Table customers created!');

// 3. Create SETTINGS table
await sql`
  CREATE TABLE IF NOT EXISTS settings (
    id SERIAL PRIMARY KEY,
    key TEXT NOT NULL UNIQUE,
    value TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )
`;
console.log('✅ Table settings created!');

// Seed default settings
const defaultSettings = [
  { key: 'company_name', value: 'XƯỞNG NỘI THẤT HOMEPRO' },
  { key: 'hotline', value: '0905 123 456' },
  { key: 'address', value: 'Khu công nghiệp / Xưởng thi công HomePro' },
  { key: 'bank_account', value: 'Vietcombank - 9999888866 - DONG QUANG HUY' },
];

for (const s of defaultSettings) {
  await sql`
    INSERT INTO settings (key, value)
    VALUES (${s.key}, ${s.value})
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
  `;
}

console.log('✅ Default settings seeded successfully!');
