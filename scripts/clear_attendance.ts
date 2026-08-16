import 'dotenv/config';
import { db } from '../src/db/index';
import { attendance } from '../src/db/schema';
import { eq } from 'drizzle-orm';

async function deleteAtt() {
  await db.delete(attendance);
  console.log('✅ Deleted all attendance records');
  process.exit(0);
}
deleteAtt();
