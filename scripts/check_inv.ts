import * as dotenv from 'dotenv';
dotenv.config();
import { db } from '@/db';
import { inventoryBalances } from '@/db/schema';

db.select().from(inventoryBalances).then(res => {
  console.log(res);
  process.exit(0);
});
