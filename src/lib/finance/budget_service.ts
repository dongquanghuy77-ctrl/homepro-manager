import { db } from '@/db';
import { budgets, budgetLines, budgetTransactions } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';

export class BudgetService {
  /**
   * Initializes a budget for a project
   */
  static async createBudget(data: {
    projectId: number;
    totalBudget: number;
    notes?: string;
    lines: { category: string; budgetedAmount: number; notes?: string }[];
  }) {
    return await db.transaction(async (tx) => {
      // Create master budget
      const [budget] = await tx.insert(budgets).values({
        projectId: data.projectId,
        totalBudget: data.totalBudget,
        notes: data.notes,
        status: 'APPROVED' // For simplicity in this demo, auto-approve
      }).returning();

      // Create lines
      if (data.lines && data.lines.length > 0) {
        const lineValues = data.lines.map(line => ({
          budgetId: budget.id,
          category: line.category,
          budgetedAmount: line.budgetedAmount,
          variance: line.budgetedAmount // Variance = Budget - Actual (initially same as budget)
        }));
        await tx.insert(budgetLines).values(lineValues);
      }

      return budget;
    });
  }

  /**
   * Records committed cost (e.g. from a Purchase Order)
   * Enforces HARD GATE: Blocks PR/PO if budget is exceeded.
   */
  static async commitCost(projectId: number, category: string, amount: number, refType?: string, refId?: number, _tx?: any) {
    return await this.updateBudgetCost(projectId, category, amount, 'COMMITTED', refType, refId, _tx);
  }

  /**
   * Records actual cost (e.g. Material Consumption, Payroll, Invoice paid)
   */
  static async recordActualCost(projectId: number, category: string, amount: number, refType?: string, refId?: number, _tx?: any) {
    // Note: In real life, Actuals relieve (reverse) the Committed costs. 
    // For this implementation, we will just track them concurrently for simplicity, or we could explicitly reduce committed.
    return await this.updateBudgetCost(projectId, category, amount, 'ACTUAL', refType, refId, _tx);
  }

  /**
   * Forecast calculation based on Variance
   */
  static async forecastCost(projectId: number) {
    const bQuery = await db.execute(sql`SELECT * FROM budgets WHERE project_id = ${projectId} AND status = 'APPROVED' LIMIT 1`);
    const budget = bQuery.rows[0] as any;
    if (!budget) return { forecast: 0, variance: 0 };

    // Simple Forecast = Actual + Committed (assuming committed hasn't been realized yet)
    // Or Estimate to Complete (ETC) based on remaining planned activities.
    // Let's use Actual + Committed for a conservative Estimate at Completion (EAC)
    const eac = Number(budget.actual_cost) + Number(budget.committed_cost);
    const variance = Number(budget.total_budget) - eac;

    return {
      totalBudget: Number(budget.total_budget),
      actualCost: Number(budget.actual_cost),
      committedCost: Number(budget.committed_cost),
      estimateAtCompletion: eac,
      projectedVariance: variance,
      isOverBudget: eac > Number(budget.total_budget)
    };
  }

  /**
   * Core logic to update costs, evaluate threshold rules, and insert transactions
   */
  private static async updateBudgetCost(
    projectId: number, 
    category: string, 
    amount: number, 
    type: 'COMMITTED' | 'ACTUAL', 
    refType?: string, 
    refId?: number,
    _tx?: any
  ) {
    const doUpdate = async (tx: any) => {
      // 1. Find active budget
      const bQuery = await tx.execute(sql`SELECT * FROM budgets WHERE project_id = ${projectId} AND status = 'APPROVED' LIMIT 1 FOR UPDATE`);
      const budget = bQuery.rows[0] as any;
      if (!budget) {
        console.warn(`No approved budget found for project ${projectId}. Cost tracking skipped.`);
        return { success: false, reason: 'No budget' };
      }

      // 2. Find corresponding line
      const lQuery = await tx.execute(sql`SELECT * FROM budget_lines WHERE budget_id = ${budget.id} AND category = ${category} FOR UPDATE`);
      const line = lQuery.rows[0] as any;

      let lineId = null;

      if (!line) {
        // Create line if it doesn't exist (Unplanned cost)
        const [newLine] = await tx.insert(budgetLines).values({
          budgetId: budget.id,
          category: category,
          budgetedAmount: 0, // Unplanned!
          committedAmount: type === 'COMMITTED' ? amount : 0,
          actualAmount: type === 'ACTUAL' ? amount : 0,
          variance: -amount // Because budgeted is 0
        }).returning();
        lineId = newLine.id;
      } else {
        lineId = line.id;
        const newCommitted = type === 'COMMITTED' ? Number(line.committed_amount) + amount : Number(line.committed_amount);
        const newActual = type === 'ACTUAL' ? Number(line.actual_amount) + amount : Number(line.actual_amount);
        const newVariance = Number(line.budgeted_amount) - newActual;

        // HARD GATE AT LINE LEVEL (Optional, usually gate is at total level, but let's check total line utilization)
        const totalLineUtilized = newActual + newCommitted;
        if (totalLineUtilized > Number(line.budgeted_amount)) {
            console.warn(`⚠️ OVER BUDGET on category ${category}. Total Utilized: ${totalLineUtilized} / ${line.budgeted_amount}`);
        }

        await tx.execute(sql`
          UPDATE budget_lines 
          SET committed_amount = ${newCommitted}, actual_amount = ${newActual}, variance = ${newVariance}
          WHERE id = ${line.id}
        `);
      }

      // 3. Update Master Budget Totals
      const newTotalCommitted = type === 'COMMITTED' ? Number(budget.committed_cost) + amount : Number(budget.committed_cost);
      const newTotalActual = type === 'ACTUAL' ? Number(budget.actual_cost) + amount : Number(budget.actual_cost);
      const newTotalVariance = Number(budget.total_budget) - newTotalActual;

      const totalUtilized = newTotalActual + newTotalCommitted;

      // HARD GATE AT TOTAL BUDGET LEVEL
      if (totalUtilized > Number(budget.total_budget)) {
        throw new Error(`BUDGET HARD GATE BLOCKED: Transaction of ${amount} exceeds the Total Approved Budget of ${budget.total_budget}. Current Utilized (Actual + Committed) is ${totalUtilized}.`);
      }

      await tx.execute(sql`
        UPDATE budgets 
        SET committed_cost = ${newTotalCommitted}, actual_cost = ${newTotalActual}, variance = ${newTotalVariance}
        WHERE id = ${budget.id}
      `);

      // 4. Record Transaction Audit Trail
      await tx.insert(budgetTransactions).values({
        budgetId: budget.id,
        budgetLineId: lineId,
        type: type,
        category: category,
        amount: amount,
        referenceType: refType,
        referenceId: refId,
        notes: `Auto-generated ${type} transaction`
      });

      return { success: true };
    };

    if (_tx) {
      return await doUpdate(_tx);
    } else {
      return await db.transaction(doUpdate);
    }
  }
}
