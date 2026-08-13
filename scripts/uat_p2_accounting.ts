import * as dotenv from 'dotenv';
dotenv.config();

import { db } from '../src/db';
import { monthlyPayroll, journalEntries, accountingPeriods, accounts } from '../src/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { AccountingService } from '../src/lib/accounting/services';

async function runUat() {
  console.log('--- STARTING P2 ACCOUNTING UAT ---');
  let passCount = 0;
  let failCount = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`✅ PASS: ${msg}`);
      passCount++;
    } else {
      console.error(`❌ FAIL: ${msg}`);
      failCount++;
    }
  }

  const period = await db.query.accountingPeriods.findFirst({
    where: eq(accountingPeriods.name, '08-2026')
  });

  if (!period) {
    console.error('❌ Period 08-2026 not found!');
    process.exit(1);
  }

  const accs = await db.query.accounts.findMany({ limit: 2 });
  if (accs.length < 2) {
    console.error('Not enough accounts to test');
    process.exit(1);
  }

  console.log('\n--- 1. Double Entry & Atomicity ---');
  try {
    await AccountingService.createJournalEntry({
      entryNo: `JV-ERR-${Date.now()}`,
      postingDate: '2026-08-14',
      periodId: period.id,
      lines: [
        { accountId: accs[0].id, debit: 100, credit: 0 }, 
        { accountId: accs[1].id, debit: 0, credit: 90 }, 
      ]
    });
    assert(false, 'Allowed unbalanced journal');
  } catch (e: any) {
    assert(e.message.includes('Double-entry violation'), 'Rejected unbalanced entry correctly');
  }

  console.log('\n--- 2. Idempotency ---');
  const refId = Math.floor(Math.random() * 1000000);
  try {
    const je1 = await AccountingService.createJournalEntry({
      entryNo: `JV-IDEM-${Date.now()}-1`,
      postingDate: '2026-08-14',
      periodId: period.id,
      referenceType: 'PAYROLL',
      referenceId: refId,
      lines: [
        { accountId: accs[0].id, debit: 100, credit: 0 }, 
        { accountId: accs[1].id, debit: 0, credit: 100 }, 
      ]
    });
    assert(true, 'Created first JV successfully');

    await AccountingService.createJournalEntry({
      entryNo: `JV-IDEM-${Date.now()}-2`,
      postingDate: '2026-08-14',
      periodId: period.id,
      referenceType: 'PAYROLL',
      referenceId: refId,
      lines: [
        { accountId: accs[0].id, debit: 100, credit: 0 }, 
        { accountId: accs[1].id, debit: 0, credit: 100 }, 
      ]
    });
    assert(false, 'Allowed duplicate JV for same reference');
  } catch (e: any) {
    if (e.message.includes('IDEMPOTENCY_ERROR')) {
      assert(true, 'Idempotency prevented duplicate JV');
    } else {
      console.error(e);
      assert(false, `Unexpected error during idempotency: ${e.message}`);
    }
  }

  console.log('\n--- 3. Immutable Journal & Reversal ---');
  try {
    const je = await AccountingService.createJournalEntry({
      entryNo: `JV-REV-${Date.now()}`,
      postingDate: '2026-08-14',
      periodId: period.id,
      lines: [
        { accountId: accs[0].id, debit: 500, credit: 0 }, 
        { accountId: accs[1].id, debit: 0, credit: 500 }, 
      ]
    });
    await AccountingService.postJournalEntry(je.id, 1);
    
    // Reverse it
    const reversal = await AccountingService.reverseJournalEntry(je.id, 1, period.id, '2026-08-15', `JV-REVO-${Date.now()}`);
    assert(reversal.reversalOf === je.id, 'Reversal created and linked correctly');
    
    const orig = await db.query.journalEntries.findFirst({ where: eq(journalEntries.id, je.id) });
    assert(orig?.status === 'REVERSED', 'Original journal status changed to REVERSED');

  } catch (e: any) {
    console.error(e);
    assert(false, 'Reversal workflow failed');
  }

  console.log(`\n=== UAT RESULTS: ${passCount} PASS | ${failCount} FAIL ===`);
  process.exit(failCount === 0 ? 0 : 1);
}

runUat().catch(e => {
  console.error(e);
  process.exit(1);
});
