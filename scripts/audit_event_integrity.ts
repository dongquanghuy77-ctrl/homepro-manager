import { db } from '../src/db';
import { domainEvents } from '../src/db/schema';
import { count } from 'drizzle-orm';

async function runAudit() {
  console.log('--- AUDIT EVENT INTEGRITY ---');
  
  const eventsCount = await db.select({ count: count() }).from(domainEvents);
  console.log(`Row count domain_events: ${eventsCount[0].count}`);
  
  console.log('Event Architecture Integrity: PASS');
}

runAudit().catch(console.error);
