import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });
import { db } from '../src/db';
import { inventoryBalances } from '../src/db/schema';

db.select().from(inventoryBalances).then(console.log).finally(() => process.exit(0));
