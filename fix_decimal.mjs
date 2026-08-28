import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

async function fix() {
  console.log("🔧 Fixing INTEGER → NUMERIC for decimal quantities...\n");

  await sql`ALTER TABLE pwr_materials ALTER COLUMN stock_level TYPE NUMERIC(12,2) USING stock_level::NUMERIC(12,2)`;
  console.log("✓ stock_level → NUMERIC(12,2)");

  await sql`ALTER TABLE pwr_materials ALTER COLUMN reserved_level TYPE NUMERIC(12,2) USING reserved_level::NUMERIC(12,2)`;
  console.log("✓ reserved_level → NUMERIC(12,2)");

  await sql`ALTER TABLE pwr_materials ALTER COLUMN min_stock_level TYPE NUMERIC(12,2) USING min_stock_level::NUMERIC(12,2)`;
  console.log("✓ min_stock_level → NUMERIC(12,2)");

  await sql`ALTER TABLE pwr_material_transactions ALTER COLUMN quantity TYPE NUMERIC(12,2) USING quantity::NUMERIC(12,2)`;
  console.log("✓ pwr_material_transactions.quantity → NUMERIC(12,2)");

  await sql`ALTER TABLE pwr_material_transactions ALTER COLUMN balance_after TYPE NUMERIC(12,2) USING balance_after::NUMERIC(12,2)`;
  console.log("✓ pwr_material_transactions.balance_after → NUMERIC(12,2)");

  console.log("\n🎉 ALL COLUMNS FIXED! Decimal quantities (39.05m nẹp) are now supported.");
}

fix().catch(e => { console.error("FIX ERROR:", e); process.exit(1); });
