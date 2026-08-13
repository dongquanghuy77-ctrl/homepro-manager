import { db } from '../src/db/index';
import { leaveRequests } from '../src/db/schema';

async function run() {
  try {
    const [newRequest] = await db.insert(leaveRequests).values({
      employeeId: 11,
      leaveType: 'SICK',
      startDate: '2026-10-10',
      endDate: '2026-10-11',
      totalDays: 2,
      reason: 'Test DB Insert',
      status: 'PENDING',
    }).returning();
    console.log("Success:", newRequest);
  } catch (e) {
    console.error("DB Error:", e);
  }
  process.exit(0);
}

run();
