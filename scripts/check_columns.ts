import { db } from '../src/db/index';

async function run() {
  try {
    const res = await db.execute('SELECT column_name FROM information_schema.columns WHERE table_name = \'leave_requests\'');
    console.log(res.rows);
  } catch (e) {
    console.error(e);
  }
  process.exit(0);
}

run();
