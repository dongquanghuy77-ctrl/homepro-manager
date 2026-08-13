import { db } from '../src/db/index';

async function run() {
  try {
    await db.execute("ALTER TABLE leave_requests ADD COLUMN leave_type text NOT NULL DEFAULT 'ANNUAL'");
    console.log("Added column leave_type");
  } catch (e) {
    console.error(e);
  }
  process.exit(0);
}

run();
