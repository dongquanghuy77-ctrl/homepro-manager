import 'dotenv/config';
import { db } from '../src/db';
import { sql } from 'drizzle-orm';

async function main() {
  const res = await db.execute(sql`SELECT * FROM inventory_balances ORDER BY id DESC LIMIT 5`);
  console.log("Balances:", res.rows);
  const txs = await db.execute(sql`SELECT * FROM inventory_transactions ORDER BY id DESC LIMIT 5`);
  console.log("Transactions:", txs.rows);
  process.exit(0);
}
main();
