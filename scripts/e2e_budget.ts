import 'dotenv/config';
import { db } from '../src/db';
import { projects, budgets, budgetLines } from '../src/db/schema';
import { eq, sql } from 'drizzle-orm';
import { BudgetService } from '../src/lib/finance/budget_service';

async function main() {
  console.log("=== BẮT ĐẦU E2E BUDGET TEST ===");

  try {
    // 1. Setup Data
    let proj = await db.select().from(projects).limit(1);
    if (!proj.length) {
      throw new Error("Missing project data");
    }
    const testProj = proj[0];

    console.log("⏳ Cleanup old E2E data...");
    await db.delete(budgetLines).where(sql`budget_id IN (SELECT id FROM budgets WHERE notes = 'E2E_BUDGET')`);
    await db.delete(budgets).where(eq(budgets.notes, 'E2E_BUDGET'));

    console.log("✅ Test 01: Create Budget");
    const budget = await BudgetService.createBudget({
      projectId: testProj.id,
      totalBudget: 15000000000, // 15 tỷ
      notes: "E2E_BUDGET",
      lines: [
        { category: "MATERIAL", budgetedAmount: 8000000000 }, // 8 tỷ
        { category: "LABOR", budgetedAmount: 4000000000 },    // 4 tỷ
        { category: "MACHINE", budgetedAmount: 2000000000 },   // 2 tỷ
        { category: "OVERHEAD", budgetedAmount: 1000000000 }   // 1 tỷ
      ]
    });
    console.log(`   -> Created Budget ID: ${budget.id}`);

    console.log("✅ Test 02: Commit Cost (PO)");
    await BudgetService.commitCost(testProj.id, "MATERIAL", 500000000); // 500 triệu
    console.log(`   -> Committed 500M to MATERIAL`);

    console.log("✅ Test 03: Actual Cost & Threshold Warning");
    // This will print warning if > 70% or 85%
    // Let's use 6 tỷ (75% of 8 tỷ material budget) to trigger the 70% warning
    await BudgetService.recordActualCost(testProj.id, "MATERIAL", 6000000000);
    console.log(`   -> Logged 6B Actual Cost to MATERIAL`);

    console.log("✅ Test 04: Over-Budget Blocking");
    try {
      // Total budget is 15 tỷ. We already recorded 6 tỷ.
      // Let's record another 10 tỷ, total 16 tỷ > 15 tỷ -> Should throw error!
      await BudgetService.recordActualCost(testProj.id, "LABOR", 10000000000);
      throw new Error("Should have blocked Over-budget!");
    } catch (e: any) {
      if (!e.message.includes('OVER BUDGET BLOCK')) throw e;
      console.log(`   -> Successfully blocked Over-budget transaction`);
    }

    console.log("✅ Test 05: Variance Check");
    const bQuery = await db.execute(sql`SELECT * FROM budgets WHERE id = ${budget.id}`);
    const updatedBudget = bQuery.rows[0] as any;
    // 15B - 6B = 9B
    if (Number(updatedBudget.variance) !== 9000000000) {
      throw new Error(`Variance incorrect. Expected 9000000000, got ${updatedBudget.variance}`);
    }
    console.log(`   -> Master Variance correctly calculated: ${updatedBudget.variance}`);

    console.log("🎉 ALL BUDGET TESTS PASSED");
    process.exit(0);

  } catch (error) {
    console.error("❌ E2E Failed:", error);
    process.exit(1);
  }
}

main();
