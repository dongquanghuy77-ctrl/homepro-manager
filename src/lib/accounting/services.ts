import { db } from '@/db';
import { journalEntries, journalEntryLines, accountingPeriods, accounts } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export interface JournalEntryLineDto {
  accountId: number;
  departmentId?: number | null;
  partyType?: string | null;
  partyId?: number | null;
  debit: number;
  credit: number;
  description?: string;
}

export interface CreateJournalEntryDto {
  entryNo: string;
  postingDate: string;
  periodId: number;
  referenceType?: string;
  referenceId?: number;
  description?: string;
  lines: JournalEntryLineDto[];
}

export class AccountingService {
  /**
   * Creates a new Journal Entry with strict double-entry validation.
   */
  static async createJournalEntry(data: CreateJournalEntryDto) {
    // 1. Double-Entry Validation
    let totalDebit = 0;
    let totalCredit = 0;
    
    for (const line of data.lines) {
      if (line.debit < 0 || line.credit < 0) {
        throw new Error('Debit and Credit cannot be negative.');
      }
      if (line.debit > 0 && line.credit > 0) {
        throw new Error('A single line cannot have both Debit and Credit.');
      }
      totalDebit += line.debit;
      totalCredit += line.credit;
    }

    // Floating point precision fix
    totalDebit = Math.round(totalDebit * 100) / 100;
    totalCredit = Math.round(totalCredit * 100) / 100;

    if (totalDebit !== totalCredit) {
      throw new Error(`Double-entry violation: Total Debit (${totalDebit}) does not equal Total Credit (${totalCredit}).`);
    }
    
    if (totalDebit === 0) {
      throw new Error('Journal Entry must have a non-zero value.');
    }

    // 2. Period Validation
    const period = await db.query.accountingPeriods.findFirst({
      where: eq(accountingPeriods.id, data.periodId)
    });

    if (!period) {
      throw new Error('Accounting Period not found.');
    }
    if (period.status !== 'OPEN') {
      throw new Error(`Cannot post into a ${period.status} period.`);
    }

    // 3. Database Transaction
    return await db.transaction(async (tx) => {
      // Insert Header
      const [je] = await tx.insert(journalEntries).values({
        entryNo: data.entryNo,
        postingDate: data.postingDate,
        periodId: data.periodId,
        referenceType: data.referenceType,
        referenceId: data.referenceId,
        totalDebit,
        totalCredit,
        description: data.description,
        status: 'DRAFT', // Always start as DRAFT
      }).returning();

      // Insert Lines
      const linesToInsert = data.lines.map(line => ({
        journalEntryId: je.id,
        ...line
      }));

      await tx.insert(journalEntryLines).values(linesToInsert);

      return je;
    });
  }

  /**
   * Posts a Draft Journal Entry to the general ledger.
   */
  static async postJournalEntry(id: number) {
    const je = await db.query.journalEntries.findFirst({
      where: eq(journalEntries.id, id)
    });

    if (!je) throw new Error('Journal Entry not found');
    if (je.status !== 'DRAFT') throw new Error(`Cannot post entry with status ${je.status}`);

    const [updated] = await db.update(journalEntries)
      .set({ status: 'POSTED', updatedAt: new Date() })
      .where(eq(journalEntries.id, id))
      .returning();
      
    return updated;
  }

  /**
   * Cancels a Journal Entry (soft delete / reversal logic).
   */
  static async cancelJournalEntry(id: number) {
    const je = await db.query.journalEntries.findFirst({
      where: eq(journalEntries.id, id)
    });

    if (!je) throw new Error('Journal Entry not found');
    if (je.status === 'CANCELLED') throw new Error('Entry is already cancelled');

    // In a strict system, POSTED entries should be reversed via a Reversal Entry,
    // but for simplicity, we allow cancelling if the period is still open.
    const period = await db.query.accountingPeriods.findFirst({
      where: eq(accountingPeriods.id, je.periodId)
    });

    if (period?.status !== 'OPEN') {
      throw new Error('Cannot cancel an entry in a closed period. A reversal entry is required.');
    }

    const [updated] = await db.update(journalEntries)
      .set({ status: 'CANCELLED', updatedAt: new Date() })
      .where(eq(journalEntries.id, id))
      .returning();
      
    return updated;
  }
}
