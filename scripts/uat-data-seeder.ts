import 'dotenv/config';
import { db } from '../src/db';
import {
  projects, materials, suppliers, inventoryTransactions, warehouses,
  productionOrders, workOrders, jobCards, qcInspections, attendance,
  monthlyPayroll, users
} from '../src/db/schema';

async function seedDataVolume() {
  console.log('--- PHASE 8: REALISTIC DATA VOLUME SEEDING ---');

  // Generate 5+ Projects
  const now = Date.now();
  const projs = [];
  for (let i = 1; i <= 5; i++) {
    projs.push({
      code: `DA-SIM-${now}-0${i}`,
      name: `Dự án nội thất mô phỏng ${i}`,
      status: 'IN_PROGRESS',
      budget: 1000000000 + i * 500000000,
    });
  }
  const insertedProjs = await db.insert(projects).values(projs).returning();
  console.log(`✅ Seeded ${insertedProjs.length} projects`);

  // Generate 20 Suppliers
  const sups = [];
  for (let i = 1; i <= 20; i++) {
    sups.push({
      name: `Nhà Cung Cấp Vật Tư ${i} Co., Ltd`,
      code: `SUP-SIM-${now}-${i}`,
      phone: `09${Math.floor(Math.random() * 100000000)}`,
    });
  }
  const insertedSups = await db.insert(suppliers).values(sups).returning();
  console.log(`✅ Seeded ${insertedSups.length} suppliers`);

  // Generate 100 Materials
  const mats = [];
  for (let i = 1; i <= 100; i++) {
    mats.push({
      code: `MAT-SIM-${now}-${i}`,
      name: `Vật tư gỗ/nhựa/kim loại ${i}`,
      unit: 'Cái',
      type: 'RAW_MATERIAL',
      standardPrice: 50000 + (i * 1000),
    });
  }
  const insertedMats = await db.insert(materials).values(mats).returning();
  console.log(`✅ Seeded ${insertedMats.length} materials`);

  // Generate 5 Warehouses
  const whs = [];
  for (let i = 1; i <= 5; i++) {
    whs.push({
      code: `WH-SIM-${now}-${i}`,
      name: `Kho Vật Tư / Thành Phẩm ${i}`,
      address: `Khu công nghiệp ${i}`, // Notice it's address instead of location based on schema? Wait, previous error showed "insert into warehouses (id, code, name, type, address...)". Let me just use address.
    });
  }
  const insertedWhs = await db.insert(warehouses).values(whs).returning();
  console.log(`✅ Seeded ${insertedWhs.length} warehouses`);

  // Check if we have an admin user for tracking
  let adminRes = await db.select().from(users).limit(1);
  let adminId = adminRes.length > 0 ? adminRes[0].id : null;

  // Generate 500 Inventory Transactions
  const txs = [];
  for (let i = 1; i <= 500; i++) {
    const mat = insertedMats[i % insertedMats.length];
    const wh = insertedWhs[i % insertedWhs.length];
    const proj = insertedProjs[i % insertedProjs.length];
    txs.push({
      movementNumber: `TX-SIM-${Date.now()}-${i}`,
      movementType: i % 2 === 0 ? 'RECEIPT' : 'RECEIPT', // Force receipt to avoid negative stock logic
      materialId: mat.id,
      warehouseId: wh.id,
      quantity: 10 + (i % 50),
      unitCost: mat.standardPrice || 0,
      totalCost: (10 + (i % 50)) * (mat.standardPrice || 0),
      projectId: proj.id,
    });
  }
  await db.insert(inventoryTransactions).values(txs);
  console.log(`✅ Seeded ${txs.length} inventory transactions`);

  // Generate 100 Production Orders
  const pos = [];
  for (let i = 1; i <= 100; i++) {
    const proj = insertedProjs[i % insertedProjs.length];
    const mat = insertedMats[i % insertedMats.length];
    pos.push({
      code: `PO-SIM-${Date.now()}-${i}`,
      projectId: proj.id,
      productId: mat.id,
      plannedQuantity: 100,
      plannedStartDate: new Date(),
      status: 'IN_PROGRESS',
    });
  }
  const insertedPOs = await db.insert(productionOrders).values(pos).returning();
  console.log(`✅ Seeded ${insertedPOs.length} production orders`);

  // Generate 100 Work Orders
  const wos = [];
  for (let i = 1; i <= 100; i++) {
    const po = insertedPOs[i % insertedPOs.length];
    wos.push({
      productionOrderId: po.id,
      operation: `Cắt/Dán cạnh ${i}`,
      sequence: 1,
      plannedQuantity: 10,
      status: 'IN_PROGRESS',
    });
  }
  const insertedWOs = await db.insert(workOrders).values(wos).returning();
  console.log(`✅ Seeded ${insertedWOs.length} work orders`);

  if (adminId) {
    // Generate 300 Job Cards
    const jcs = [];
    for (let i = 1; i <= 300; i++) {
      const wo = insertedWOs[i % insertedWOs.length];
      jcs.push({
        workOrderId: wo.id,
        employeeId: adminId,
        startTime: new Date(),
        completedQuantity: 2,
        status: 'IN_PROGRESS',
      });
    }
    await db.insert(jobCards).values(jcs);
    console.log(`✅ Seeded ${jcs.length} job cards`);
  }

  // Generate 100 QC Records
  const qcs = [];
  for (let i = 1; i <= 100; i++) {
    const po = insertedPOs[i % insertedPOs.length];
    qcs.push({
      code: `QC-SIM-${Date.now()}-${i}`,
      productionOrderId: po.id,
      inspectionTime: new Date(),
      inspectorId: adminId,
      result: i % 3 === 0 ? 'FAIL' : 'PASS',
    });
  }
  await db.insert(qcInspections).values(qcs);
  console.log(`✅ Seeded ${qcs.length} QC records`);

  console.log('✅ PHASE 8: REALISTIC DATA VOLUME SEEDED SUCCESSFULLY!');
  process.exit(0);
}

seedDataVolume().catch((e) => {
  console.error('Data volume seed failed', e);
  process.exit(1);
});
