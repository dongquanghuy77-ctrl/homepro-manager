import { db } from '@/db';
import { journalEntries, journalEntryLines, accountingPeriods, accounts } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export interface JournalEntryLineDto {
  accountId: number;
  departmentId?: number | null;
  projectId?: number | null;
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
  createdBy?: number;
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

    // 3. Database Transaction & Idempotency
    return await db.transaction(async (tx) => {
      // Idempotency Check
      if (data.referenceType && data.referenceId) {
        const existing = await tx.query.journalEntries.findFirst({
          where: and(
            eq(journalEntries.referenceType, data.referenceType),
            eq(journalEntries.referenceId, data.referenceId)
          )
        });
        if (existing) {
          throw new Error(`IDEMPOTENCY_ERROR: Journal entry already exists for ${data.referenceType} ${data.referenceId}`);
        }
      }

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
        createdBy: data.createdBy,
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
  static async postJournalEntry(id: number, userId?: number) {
    const je = await db.query.journalEntries.findFirst({
      where: eq(journalEntries.id, id)
    });

    if (!je) throw new Error('Journal Entry not found');
    if (je.status !== 'DRAFT') throw new Error(`Cannot post entry with status ${je.status}`);

    const [updated] = await db.update(journalEntries)
      .set({ 
        status: 'POSTED', 
        postedBy: userId,
        postedAt: new Date(),
        updatedAt: new Date() 
      })
      .where(eq(journalEntries.id, id))
      .returning();
      
    return updated;
  }

  /**
   * Cancels a DRAFT Journal Entry.
   * POSTED entries MUST be reversed instead.
   */
  static async cancelJournalEntry(id: number) {
    const je = await db.query.journalEntries.findFirst({
      where: eq(journalEntries.id, id)
    });

    if (!je) throw new Error('Journal Entry not found');
    if (je.status === 'POSTED') throw new Error('Cannot cancel a POSTED entry. You must reverse it.');
    if (je.status === 'CANCELLED') throw new Error('Entry is already cancelled');

    const [updated] = await db.update(journalEntries)
      .set({ status: 'CANCELLED', updatedAt: new Date() })
      .where(eq(journalEntries.id, id))
      .returning();
      
    return updated;
  }

  /**
   * Reverses a POSTED Journal Entry.
   */
  static async reverseJournalEntry(id: number, userId: number, targetPeriodId: number, targetPostingDate: string, reversalEntryNo: string) {
    return await db.transaction(async (tx) => {
      const je = await tx.query.journalEntries.findFirst({
        where: eq(journalEntries.id, id),
        with: { lines: true }
      });

      if (!je) throw new Error('Journal Entry not found');
      if (je.status !== 'POSTED') throw new Error('Only POSTED entries can be reversed');

      const targetPeriod = await tx.query.accountingPeriods.findFirst({
        where: eq(accountingPeriods.id, targetPeriodId)
      });
      if (!targetPeriod || targetPeriod.status !== 'OPEN') {
        throw new Error('Target period for reversal must be OPEN');
      }

      // Create Reversal Entry
      const [reversal] = await tx.insert(journalEntries).values({
        entryNo: reversalEntryNo,
        postingDate: targetPostingDate,
        periodId: targetPeriodId,
        referenceType: je.referenceType,
        referenceId: je.referenceId,
        totalDebit: je.totalDebit, // Total is same, but lines inverted
        totalCredit: je.totalCredit,
        description: `Reversal of ${je.entryNo}`,
        status: 'POSTED', // Reversal is automatically posted
        createdBy: userId,
        postedBy: userId,
        postedAt: new Date(),
        reversalOf: je.id
      }).returning();

      // Invert Lines
      const reversedLines = je.lines.map(line => ({
        journalEntryId: reversal.id,
        accountId: line.accountId,
        departmentId: line.departmentId,
        projectId: line.projectId,
        partyType: line.partyType,
        partyId: line.partyId,
        // Swap Debit and Credit
        debit: line.credit,
        credit: line.debit,
        description: line.description
      }));

      await tx.insert(journalEntryLines).values(reversedLines);

      // Mark original as REVERSED
      await tx.update(journalEntries)
        .set({ 
          status: 'REVERSED', 
          reversedBy: userId, 
          updatedAt: new Date() 
        })
        .where(eq(journalEntries.id, je.id));

      return reversal;
    });
  }
}
