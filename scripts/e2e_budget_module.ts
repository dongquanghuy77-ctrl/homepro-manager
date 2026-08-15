import * as dotenv from 'dotenv';
dotenv.config();
import { db } from '@/db';
import { projects, budgets, budgetLines, budgetTransactions } from '@/db/schema';
import { BudgetService } from '@/lib/finance/budget_service';
import { eq } from 'drizzle-orm';

async function main() {
  console.log('=== STARTING BUDGET CONTROL E2E TEST ===');

  // 1. Setup Dummy Project
  const [testProj] = await db.insert(projects).values({
    name: 'E2E Budget Test Project',
    code: `PRJ-BUDGET-${Date.now()}`,
    status: 'ACTIVE'
  }).returning();

  console.log(`✅ Setup complete. Project created.`);

  // 2. Initialize Budget
  const budget = await BudgetService.createBudget({
    projectId: testProj.id,
    totalBudget: 1000000, // 1,000,000 VND
    notes: 'Initial Project Budget',
    lines: [
      { category: 'MATERIAL', budgetedAmount: 700000 },
      { category: 'LABOR', budgetedAmount: 300000 }
    ]
  });
  console.log(`✅ Budget Created. Total: 1,000,000 VND`);

  // ==========================================
  // PATH 1: HAPPY PATH (Under Budget)
  // ==========================================
  console.log(`\n--- Testing Path 1: Commit Under Budget ---`);
  await BudgetService.commitCost(testProj.id, 'MATERIAL', 500000, 'PO', 101);
  console.log(`✅ Committed 500,000 VND for MATERIAL (PO-101)`);

  const forecastAfterCommit = await BudgetService.forecastCost(testProj.id);
  console.log(`📊 Current Utilization: EAC = ${forecastAfterCommit.estimateAtCompletion}`);
  if (forecastAfterCommit.estimateAtCompletion !== 500000) {
      console.error(`❌ EAC Mismatch! Expected 500000, got ${forecastAfterCommit.estimateAtCompletion}`);
      process.exit(1);
  }

  // Record Actual Cost
  await BudgetService.recordActualCost(testProj.id, 'LABOR', 200000, 'PAYROLL', 201);
  console.log(`✅ Recorded Actual 200,000 VND for LABOR`);

  // ==========================================
  // PATH 2: OVER BUDGET HARD GATE
  // ==========================================
  console.log(`\n--- Testing Path 2: Over Budget Hard Gate ---`);
  // Current Utilized = 500k (committed) + 200k (actual) = 700k
  // Remaining Budget = 300k. 
  // Let's try to commit 400k for Material
  let blocked = false;
  try {
    await BudgetService.commitCost(testProj.id, 'MATERIAL', 400000, 'PO', 102);
  } catch (error: any) {
    if (error.message.includes('BUDGET HARD GATE BLOCKED')) {
      blocked = true;
      console.log(`✅ HARD GATE VERIFIED: Blocked committing 400,000 VND. ${error.message}`);
    }
  }

  if (!blocked) {
    console.error(`❌ HARD GATE FAILED: System allowed exceeding the total budget!`);
    process.exit(1);
  }

  // ==========================================
  // FINAL VERIFICATION
  // ==========================================
  const finalForecast = await BudgetService.forecastCost(testProj.id);
  console.log(`\n📊 Final Forecast:`);
  console.log(`  - Total Budget: ${finalForecast.totalBudget}`);
  console.log(`  - Committed Cost: ${finalForecast.committedCost}`);
  console.log(`  - Actual Cost: ${finalForecast.actualCost}`);
  console.log(`  - Estimate At Completion (EAC): ${finalForecast.estimateAtCompletion}`);
  console.log(`  - Projected Variance: ${finalForecast.projectedVariance}`);

  // Check Transactions
  const txs = await db.select().from(budgetTransactions).where(eq(budgetTransactions.budgetId, budget.id));
  console.log(`\n📝 Budget Transactions Audit Trail:`);
  for (const t of txs) {
    console.log(`  - [${t.type}] ${t.category}: ${t.amount} (Ref: ${t.referenceType}-${t.referenceId})`);
  }

  if (txs.length === 2 && finalForecast.estimateAtCompletion === 700000) {
    console.log(`\n🎉 E2E TEST PASSED: Budget Control, Hard Gates, and Cost Tracking fully operational!`);
    process.exit(0);
  } else {
    console.error(`\n❌ E2E TEST FAILED: Data mismatch or missing transactions.`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("❌ E2E TEST FAILED UNEXPECTEDLY:", err);
  process.exit(1);
});
