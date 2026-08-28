import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

async function migrate() {
  console.log("Creating PWR tables on Production Neon Database...");

  await sql`CREATE TABLE IF NOT EXISTS pwr_supplier_catalogs (
    id SERIAL PRIMARY KEY,
    supplier_name TEXT NOT NULL,
    brand TEXT,
    material_code TEXT NOT NULL,
    material_name TEXT NOT NULL,
    category TEXT DEFAULT 'VÁN',
    thickness TEXT,
    dimensions TEXT,
    unit TEXT DEFAULT 'TẤM',
    price_per_unit NUMERIC(12,2),
    currency TEXT DEFAULT 'VND',
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  )`;
  console.log("✓ pwr_supplier_catalogs");

  await sql`CREATE TABLE IF NOT EXISTS pwr_materials (
    id SERIAL PRIMARY KEY,
    catalog_ref_id INTEGER REFERENCES pwr_supplier_catalogs(id),
    sku_code TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT DEFAULT 'VÁN',
    unit TEXT DEFAULT 'TẤM',
    stock_level INTEGER DEFAULT 0,
    reserved_level INTEGER DEFAULT 0,
    min_stock_level INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  )`;
  console.log("✓ pwr_materials");

  await sql`CREATE TABLE IF NOT EXISTS pwr_material_transactions (
    id SERIAL PRIMARY KEY,
    material_id INTEGER NOT NULL REFERENCES pwr_materials(id),
    user_id INTEGER,
    task_id INTEGER,
    transaction_type TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    balance_after INTEGER,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
  )`;
  console.log("✓ pwr_material_transactions");

  await sql`CREATE TABLE IF NOT EXISTS pwr_resources (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    resource_type TEXT DEFAULT 'MACHINE',
    capacity_hours_per_day TEXT DEFAULT '8.0',
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
  )`;
  console.log("✓ pwr_resources");

  await sql`CREATE TABLE IF NOT EXISTS pwr_task_resources (
    id SERIAL PRIMARY KEY,
    task_id INTEGER NOT NULL,
    resource_id INTEGER NOT NULL REFERENCES pwr_resources(id),
    estimated_hours TEXT,
    reserved_date TEXT,
    created_at TIMESTAMP DEFAULT NOW()
  )`;
  console.log("✓ pwr_task_resources");

  console.log("\n🎉 ALL PWR TABLES CREATED SUCCESSFULLY!");
}

migrate().catch(e => { console.error("MIGRATION ERROR:", e); process.exit(1); });
