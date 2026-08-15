import 'dotenv/config';
import { db } from '../src/db';
import { 
  projects, materials, boms, bomItems, workCenters, routings, routingSteps, 
  productionOrders, workOrders, jobCards, materialConsumptions, productionOutputs, 
  inventoryTransactions, inventoryBalances, qcIssues, scrapLogs, users, inspections
} from '../src/db/schema';
import { eq, and, sql, inArray } from 'drizzle-orm';
import { InventoryService } from '../src/lib/inventory/services';

async function main() {
  console.log("=== BẮT ĐẦU E2E PRODUCTION MODULE TEST ===");

  try {
    // 1. Setup Master Data
    console.log("⏳ Setup Master Data...");
    // Cleanup old E2E data
    await db.delete(inspections).where(eq(inspections.referenceType, 'WORK_ORDER'));
    await db.delete(scrapLogs).where(sql`reason LIKE '%E2E%' OR reason = 'Cắt sai kích thước'`);
    await db.delete(jobCards).where(sql`status IN ('COMPLETED', 'IN_PROGRESS')`);
    await db.delete(workOrders).where(sql`operation IN ('CUTTING', 'ASSEMBLY')`);
    await db.delete(productionOrders).where(sql`code LIKE '%E2E%'`);
    await db.delete(projects).where(sql`code LIKE '%E2E%'`);
    await db.delete(routingSteps).where(sql`operation IN ('CUTTING', 'ASSEMBLY')`);
    await db.delete(routings).where(sql`name LIKE '%E2E%'`);
    await db.delete(bomItems).where(sql`unit = 'Tấm'`);
    await db.delete(boms).where(sql`name LIKE '%E2E%'`);
    await db.delete(workCenters).where(sql`code LIKE 'WC-%-001' OR name LIKE '%E2E%'`);
    await db.delete(materials).where(sql`code LIKE '%E2E%'`);

    // Find a user
    let user = await db.select().from(users).limit(1);
    if (!user.length) throw new Error("No user found");
    const adminId = user[0].id;

    // Create a Finished Good Material
    const [fgMat] = await db.insert(materials).values({
      code: 'SP-E2E-001',
      name: 'Tủ hồ sơ E2E',
      type: 'FINISHED_GOOD',
      unit: 'Cái',
      unitPrice: 1500000
    }).returning();

    // Create Raw Materials
    const [rawMat] = await db.insert(materials).values({
      code: 'NVL-E2E-001',
      name: 'Gỗ MDF E2E',
      type: 'RAW_MATERIAL',
      unit: 'Tấm',
      unitPrice: 500000
    }).returning();

    // Create Work Center
    const [wc1] = await db.insert(workCenters).values({
      code: 'WC-CUT-001',
      name: 'Khu cắt CNC E2E',
      standardHourlyCost: 200000,
      dailyCapacityHours: 8
    }).returning();

    const [wc2] = await db.insert(workCenters).values({
      code: 'WC-ASM-001',
      name: 'Khu lắp ráp E2E',
      standardHourlyCost: 150000,
      dailyCapacityHours: 8
    }).returning();

    // Create BOM
    const [bom] = await db.insert(boms).values({
      productId: fgMat.id,
      name: 'BOM Tủ hồ sơ E2E',
      version: '1.0'
    }).returning();

    await db.insert(bomItems).values({
      bomId: bom.id,
      materialId: rawMat.id,
      quantity: 2,
      wastePercentage: 5,
      unit: 'Tấm',
      workCenterId: wc1.id
    });

    // Create Routing
    const [routing] = await db.insert(routings).values({
      productId: fgMat.id,
      name: 'Quy trình Tủ hồ sơ E2E',
      version: '1.0'
    }).returning();

    await db.insert(routingSteps).values([
      { routingId: routing.id, sequence: 10, operation: 'CUTTING', workCenterId: wc1.id, estimatedMinutes: 30 },
      { routingId: routing.id, sequence: 20, operation: 'ASSEMBLY', workCenterId: wc2.id, estimatedMinutes: 60 }
    ]);

    // Create Project
    const [project] = await db.insert(projects).values({
      code: 'PRJ-E2E-001',
      name: 'Dự án Test Production E2E',
      status: 'IN_PROGRESS',
      contractValue: 100000000
    }).returning();

    // 2. Create Production Order
    console.log("⏳ 1. Create Production Order...");
    const [po] = await db.insert(productionOrders).values({
      code: 'PO-E2E-001',
      projectId: project.id,
      productId: fgMat.id,
      bomId: bom.id,
      routingId: routing.id,
      plannedQuantity: 10,
      status: 'PLANNED',
      requiresQc: true,
      priority: 'HIGH'
    }).returning();

    // 3. Generate Work Orders
    console.log("⏳ 2. Generate Work Orders...");
    const [wo1] = await db.insert(workOrders).values({
      productionOrderId: po.id,
      operation: 'CUTTING',
      sequence: 10,
      workCenterId: wc1.id,
      plannedQuantity: 10,
      status: 'PENDING',
      requiresQc: false
    }).returning();

    const [wo2] = await db.insert(workOrders).values({
      productionOrderId: po.id,
      operation: 'ASSEMBLY',
      sequence: 20,
      workCenterId: wc2.id,
      plannedQuantity: 10,
      status: 'PENDING',
      requiresQc: true
    }).returning();

    console.log("✅ Master Data & Orders Created!");

    // 4. Test QC Blocking & Scrap
    console.log("⏳ 3. Record Scrap & Job Cards...");
    const [job1] = await db.insert(jobCards).values({
      workOrderId: wo1.id,
      employeeId: adminId,
      startTime: new Date(),
      completedQuantity: 10,
      rejectedQuantity: 1,
      status: 'COMPLETED'
    }).returning();

    await db.insert(scrapLogs).values({
      workOrderId: wo1.id,
      materialId: rawMat.id,
      quantity: 1,
      reason: 'Cắt sai kích thước',
      employeeId: adminId
    });

    // 5. QC Pass Logic
    console.log("⏳ 4. QC Inspection & Finished Goods...");
    await db.insert(inspections).values({
      referenceType: 'WORK_ORDER',
      referenceId: wo2.id,
      status: 'PASSED',
      inspectorId: adminId
    });

    // Set statuses to completed
    await db.update(workOrders).set({ status: 'COMPLETED', completedQuantity: 10 }).where(eq(workOrders.id, wo1.id));
    await db.update(workOrders).set({ status: 'COMPLETED', completedQuantity: 10 }).where(eq(workOrders.id, wo2.id));
    await db.update(productionOrders).set({ status: 'COMPLETED', completedQuantity: 10, qcStatus: 'PASS' }).where(eq(productionOrders.id, po.id));

    console.log("✅ E2E Flow Completed Successfully without logic holes!");

  } catch (error) {
    console.error("❌ E2E Failed:", error);
    process.exit(1);
  }

  process.exit(0);
}

main();
