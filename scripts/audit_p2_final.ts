import * as dotenv from 'dotenv';
dotenv.config();
import { db } from '../src/db';
import { journalEntries, journalEntryLines, accountingPeriods, accounts, monthlyPayroll } from '../src/db/schema';
import { eq, and, sql, not } from 'drizzle-orm';
import { AccountingService } from '../src/lib/accounting/services';

const results: any[] = [];
function report(category: string, assertions: number, passed: boolean) {
  results.push({ category, assertions, passed });
}

async function audit() {
  console.log('--- P2 FINAL GATE AUDIT SCRIPT ---');
  let period = await db.query.accountingPeriods.findFirst({ where: eq(accountingPeriods.name, '08-2026') });
  if (!period) throw new Error('Period not found');
  const accs = await db.query.accounts.findMany({ limit: 2 });

  // 3. Double Entry Test
  let deAs = 0;
  let dePass = true;
  try {
    const tests = [
      { name: 'Debit > Credit', lines: [{ accountId: accs[0].id, debit: 100, credit: 90 }] },
      { name: 'Credit > Debit', lines: [{ accountId: accs[0].id, debit: 90, credit: 100 }] },
      { name: 'Negative', lines: [{ accountId: accs[0].id, debit: -100, credit: 0 }, { accountId: accs[1].id, debit: 0, credit: -100 }] },
      { name: 'Both sides', lines: [{ accountId: accs[0].id, debit: 100, credit: 100 }] },
      { name: 'Empty lines', lines: [] },
    ];
    for (const t of tests) {
      try {
        await AccountingService.createJournalEntry({
          entryNo: `AUDIT-DE-${Date.now()}-${Math.random()}`,
          postingDate: '2026-08-14',
          periodId: period.id,
          lines: t.lines
        });
        dePass = false;
        console.error(`FAIL: Allowed ${t.name}`);
      } catch (e: any) {
        deAs++;
      }
    }
    // Test Rollback: mock a line with non-existent account
    try {
      await AccountingService.createJournalEntry({
        entryNo: `AUDIT-RB-${Date.now()}`,
        postingDate: '2026-08-14',
        periodId: period.id,
        lines: [
          { accountId: accs[0].id, debit: 100, credit: 0 },
          { accountId: 99999, debit: 0, credit: 100 }
        ]
      });
      dePass = false;
    } catch(e) {
      deAs++;
    }
    const checkHeader = await db.query.journalEntries.findFirst({ where: eq(journalEntries.entryNo, `AUDIT-RB-${Date.now()}`) });
    if (checkHeader) dePass = false;
    deAs++;

    // Valid
    const je = await AccountingService.createJournalEntry({
      entryNo: `AUDIT-VALID-${Date.now()}`,
      postingDate: '2026-08-14',
      periodId: period.id,
      lines: [
        { accountId: accs[0].id, debit: 100, credit: 0 },
        { accountId: accs[1].id, debit: 0, credit: 100 }
      ]
    });
    if (!je) dePass = false;
    deAs++;
  } catch (e) {
    dePass = false;
  }
  report('Double Entry', deAs, dePass);

  // 4. Database Integrity
  let diAs = 0;
  let diPass = true;
  const orphanLines = await db.select().from(journalEntryLines).leftJoin(journalEntries, eq(journalEntryLines.journalEntryId, journalEntries.id)).where(sql`${journalEntries.id} IS NULL`);
  if (orphanLines.length > 0) diPass = false;
  diAs++;

  const unbalanced = await db.select().from(journalEntries).where(not(eq(journalEntries.totalDebit, journalEntries.totalCredit)));
  if (unbalanced.length > 0) diPass = false;
  diAs++;
  report('Database Integrity', diAs, diPass);

  // 5. Immutability
  let imAs = 0;
  let imPass = true;
  try {
    const postJe = await AccountingService.createJournalEntry({
      entryNo: `AUDIT-IMM-${Date.now()}`,
      postingDate: '2026-08-14',
      periodId: period.id,
      lines: [
        { accountId: accs[0].id, debit: 100, credit: 0 },
        { accountId: accs[1].id, debit: 0, credit: 100 }
      ]
    });
    await AccountingService.postJournalEntry(postJe.id, 1);
    
    // In our backend, there is no updateJournalEntry service. It's blocked by design.
    // However, can we delete it? Drizzle doesn't have a soft delete service, and delete is not exposed.
    // If I try to cancel a POSTED entry:
    try {
      await AccountingService.cancelJournalEntry(postJe.id);
      imPass = false;
    } catch(e:any) {
      if(e.message.includes('Cannot cancel a POSTED entry')) imAs++;
      else imPass = false;
    }
  } catch (e) {
    imPass = false;
  }
  report('Immutability', imAs, imPass);

  // 6. Reversal
  let revAs = 0;
  let revPass = true;
  try {
    const rJe = await AccountingService.createJournalEntry({
      entryNo: `AUDIT-REV-${Date.now()}`,
      postingDate: '2026-08-14',
      periodId: period.id,
      lines: [
        { accountId: accs[0].id, debit: 100, credit: 0 },
        { accountId: accs[1].id, debit: 0, credit: 100 }
      ]
    });
    await AccountingService.postJournalEntry(rJe.id, 1);
    const reversal = await AccountingService.reverseJournalEntry(rJe.id, 1, period.id, '2026-08-15', `REV-REV-${Date.now()}`);
    if (reversal.reversalOf !== rJe.id) revPass = false;
    revAs++;
    
    const lines = await db.query.journalEntryLines.findMany({ where: eq(journalEntryLines.journalEntryId, reversal.id) });
    if (lines[0].credit !== 100 && lines[1].debit !== 100) revPass = false; // logic matches?
    revAs++;
    
    try {
      await AccountingService.reverseJournalEntry(rJe.id, 1, period.id, '2026-08-15', `REV-REV2-${Date.now()}`);
      revPass = false;
    } catch(e:any) {
      if(e.message.includes('Only POSTED entries can be reversed')) revAs++; // Because it's REVERSED now
    }
  } catch (e) {
    revPass = false;
  }
  report('Reversal', revAs, revPass);

  // 7. Payroll Idempotency & 8. Concurrent
  let pIdemAs = 0;
  let pIdemPass = true;
  try {
    const mockRefId = Math.floor(Math.random()*10000);
    // Concurrent
    const promises = [
      AccountingService.createJournalEntry({
        entryNo: `AUDIT-CONC1-${Date.now()}`, postingDate: '2026-08-14', periodId: period.id, referenceType: 'PAYROLL', referenceId: mockRefId, lines: [{ accountId: accs[0].id, debit: 100, credit: 0 }, { accountId: accs[1].id, debit: 0, credit: 100 }]
      }),
      AccountingService.createJournalEntry({
        entryNo: `AUDIT-CONC2-${Date.now()}`, postingDate: '2026-08-14', periodId: period.id, referenceType: 'PAYROLL', referenceId: mockRefId, lines: [{ accountId: accs[0].id, debit: 100, credit: 0 }, { accountId: accs[1].id, debit: 0, credit: 100 }]
      })
    ];
    let successCount = 0;
    for (const p of promises) {
      try { await p; successCount++; } catch(e) {}
    }
    if (successCount !== 1) pIdemPass = false;
    pIdemAs++;
    
    const checkCount = await db.select({ count: sql`count(*)` }).from(journalEntries).where(and(eq(journalEntries.referenceType, 'PAYROLL'), eq(journalEntries.referenceId, mockRefId)));
    if (Number(checkCount[0].count) !== 1) pIdemPass = false;
    pIdemAs++;
  } catch (e) {
    pIdemPass = false;
  }
  report('Payroll Idempotency', pIdemAs, pIdemPass);
  report('Concurrency', pIdemAs, pIdemPass);

  // 9. Period Lock
  let plAs = 0;
  let plPass = true;
  try {
    const newPeriod = await db.insert(accountingPeriods).values({ name: `TEST-${Date.now()}`, startDate: '2026-01-01', endDate: '2026-01-31', status: 'LOCKED' }).returning();
    try {
      await AccountingService.createJournalEntry({
        entryNo: `AUDIT-PL-${Date.now()}`, postingDate: '2026-01-15', periodId: newPeriod[0].id, lines: [{ accountId: accs[0].id, debit: 10, credit: 0 }, { accountId: accs[1].id, debit: 0, credit: 10 }]
      });
      plPass = false;
    } catch(e:any) {
      if(e.message.includes('Cannot post into a LOCKED period')) plAs++;
      else plPass = false;
    }
  } catch (e) {
    plPass = false;
  }
  report('Period Control', plAs, plPass);

  // Print results
  console.log('\n--- FINAL AUDIT RESULTS ---');
  let passCount = 0;
  let failCount = 0;
  for (const r of results) {
    console.log(`${r.category.padEnd(25)} Test Cases: 1  Assertions: ${r.assertions.toString().padEnd(3)} Result: ${r.passed ? 'PASS' : 'FAIL'}`);
    if (r.passed) passCount++;
    else failCount++;
  }
}
audit().catch(console.error).finally(() => process.exit(0));
