import 'dotenv/config';
import { db } from '../src/db';
import { 
  projects, customers, materials, boqItems, tasks, 
  users, departments, suppliers, purchaseOrders, purchaseOrderItems,
  goodsReceipts, goodsReceiptItems, inventoryBalances, inventoryTransactions,
  warehouses, productionOrders, productionOutputs, qcIssues,
  attendance, leaveRequests, monthlyPayroll, costs
} from '../src/db/schema';
import { eq, sql } from 'drizzle-orm';

// Helper for generating deterministic random numbers
function pseudoRandom(seed: number) {
  let x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

async function simulate() {
  console.log("🚀 BẮT ĐẦU SIMULATION DỰ ÁN BỆNH VIỆN HUẾ...");
  console.log("Cleaning up old simulation data...");
  await db.execute(sql`DELETE FROM costs WHERE title = 'Chi phí mua vật tư đợt 1'`);
  await db.execute(sql`DELETE FROM monthly_payroll WHERE idempotency_key = 'pr-bv-001'`);
  await db.execute(sql`DELETE FROM leave_requests WHERE idempotency_key = 'lv-bv-001'`);
  await db.execute(sql`DELETE FROM attendance WHERE idempotency_key = 'att-bv-001'`);
  await db.execute(sql`DELETE FROM users WHERE username = 'worker.bv'`);
  await db.execute(sql`DELETE FROM qc_issues WHERE code = 'QC-BVHUE-001'`);
  await db.execute(sql`DELETE FROM production_outputs WHERE output_number = 'OUT-BVHUE-001'`);
  await db.execute(sql`DELETE FROM production_orders WHERE code = 'PROD-BVHUE-001'`);
  await db.execute(sql`DELETE FROM inventory_transactions WHERE movement_number LIKE 'TX-%'`);
  await db.execute(sql`DELETE FROM inventory_balances WHERE quantity = 100 OR quantity = -50`);
  await db.execute(sql`DELETE FROM goods_receipts WHERE receipt_number LIKE 'GR-BVHUE-%'`);
  await db.execute(sql`DELETE FROM purchase_orders WHERE po_number LIKE 'PO-BVHUE-%'`);
  await db.execute(sql`DELETE FROM suppliers WHERE code = 'SUP-ANC'`);
  await db.execute(sql`DELETE FROM boq_items WHERE notes LIKE 'Mã không dấu: BV-%'`);
  await db.execute(sql`DELETE FROM materials WHERE code LIKE 'MAT-BV-%'`);
  await db.execute(sql`DELETE FROM warehouses WHERE code = 'WH-HUE-01'`);
  await db.execute(sql`DELETE FROM projects WHERE code = 'BV-HUE-2025'`);
  await db.execute(sql`DELETE FROM customers WHERE email = 'contact@sythue.gov.vn'`);

  // 1. CREATE CUSTOMER
  const [customer] = await db.insert(customers).values({
    name: 'Sở Y tế Thừa Thiên Huế',
    phone: '02343822111',
    email: 'contact@sythue.gov.vn',
    address: 'Huế, Việt Nam',
    notes: 'Chủ đầu tư dự án Bệnh viện đa khoa'
  }).returning();
  console.log(`✅ Đã tạo Customer: ${customer.name}`);

  // 2. CREATE PROJECT
  const [project] = await db.insert(projects).values({
    code: 'BV-HUE-2025',
    name: 'Bệnh viện Huế — Nội thất & Hoàn thiện',
    customer: customer.name,
    manager: 'Nguyen Van A',
    location: 'Huế, Việt Nam',
    contractValue: 15000000000, // 15 tỷ VND
    targetMaterialCost: 8000000000,
    targetLaborCost: 3000000000,
    status: 'ACTIVE',
    startDate: '2025-07-01',
    deadline: '2026-04-30',
  }).returning();
  console.log(`✅ Đã tạo Project: ${project.code}`);

  // 3. CREATE WAREHOUSE
  const [warehouse] = await db.insert(warehouses).values({
    code: 'WH-HUE-01',
    name: 'Kho Công Trình Bệnh Viện Huế',
    type: 'PROJECT_SITE',
    address: 'Huế, Việt Nam'
  }).returning();

  // 4. CREATE MATERIALS (100+)
  console.log("⏳ Đang tạo 100+ Materials...");
  const materialList = [];
  const categories = ['Ván công nghiệp', 'Gỗ tự nhiên', 'Đá', 'Kính', 'Phụ kiện', 'Vật tư phụ'];
  
  for (let i = 1; i <= 120; i++) {
    const cat = categories[i % categories.length];
    let name = '';
    let unit = 'cái';
    let unitPrice = 0;

    if (cat === 'Ván công nghiệp') {
      name = `MDF chống ẩm An Cường, dày 18mm, mã AC-${100+i} phủ Melamine hai mặt`;
      unit = 'tấm';
      unitPrice = 450000 + pseudoRandom(i)*100000;
    } else if (cat === 'Phụ kiện') {
      name = `Bản lề giảm chấn Hafele, mã HF-${1000+i}`;
      unit = 'bộ';
      unitPrice = 35000 + pseudoRandom(i)*20000;
    } else {
      name = `Vật tư ${cat} loại ${i}`;
      unit = 'kg';
      unitPrice = 15000 + pseudoRandom(i)*5000;
    }

    materialList.push({
      code: `MAT-BV-${1000 + i}`,
      name: name,
      unit: unit,
      unitPrice: Math.round(unitPrice),
      category: cat,
      stockQty: 0
    });
  }
  
  const insertedMaterials = await db.insert(materials).values(materialList).returning();
  console.log(`✅ Đã tạo ${insertedMaterials.length} Materials.`);

  // 5. CREATE BOQ ITEMS (200+)
  console.log("⏳ Đang tạo 200+ BOQ Items...");
  const boqList = [];
  const zones = ['Tầng 1', 'Tầng 2', 'Tầng 3', 'Tầng 4', 'Tầng 5'];
  const rooms = ['Phòng khám', 'Phòng bệnh', 'Khu hành chính', 'Phòng mổ', 'Nhà thuốc'];
  const itemTypes = [
    { codePrefix: 'CAB', name: 'Tủ hồ sơ' },
    { codePrefix: 'MED', name: 'Tủ thuốc' },
    { codePrefix: 'REC', name: 'Quầy tiếp đón' },
    { codePrefix: 'DESK', name: 'Bàn làm việc' },
    { codePrefix: 'LAV', name: 'Tủ lavabo' },
    { codePrefix: 'WP', name: 'Ốp tường trang trí' },
    { codePrefix: 'DOOR', name: 'Cửa kỹ thuật' },
  ];

  let boqIndex = 1;
  for (const zone of zones) {
    for (const room of rooms) {
      for (const type of itemTypes) {
        // Create 2 items per combination
        for (let j = 0; j < 2; j++) {
          const qty = 5 + Math.floor(pseudoRandom(boqIndex)*10);
          const mat = insertedMaterials[boqIndex % insertedMaterials.length];
          boqList.push({
            projectId: project.id,
            materialId: mat.id,
            materialName: `${type.name} - ${zone} - ${room}`,
            unit: 'bộ',
            unitPrice: Math.round(1500000 + pseudoRandom(boqIndex)*5000000),
            qtyRequired: qty,
            category: type.name,
            notes: `Mã không dấu: BV-${type.codePrefix}-00${boqIndex}`
          });
          boqIndex++;
        }
      }
    }
  }

  const insertedBoq = await db.insert(boqItems).values(boqList).returning();
  console.log(`✅ Đã tạo ${insertedBoq.length} BOQ Items.`);

  // 6. CREATE SUPPLIERS & PROCUREMENT
  console.log("⏳ Đang tạo Procurement data...");
  const [supplier1] = await db.insert(suppliers).values({
    code: 'SUP-ANC',
    name: 'Công ty Cổ phần Gỗ An Cường',
  }).returning();
  
  const [po] = await db.insert(purchaseOrders).values({
    poNumber: 'PO-BVHUE-001',
    supplierId: supplier1.id,
    projectId: project.id,
    orderDate: new Date('2025-07-15'),
    status: 'APPROVED',
    subtotal: 500000000,
    tax: 50000000,
    total: 550000000
  }).returning();

  // Create PO Items from first 10 materials
  const poItems = [];
  for (let i = 0; i < 10; i++) {
    poItems.push({
      poId: po.id,
      materialId: insertedMaterials[i].id,
      description: insertedMaterials[i].name,
      quantity: 100,
      unit: insertedMaterials[i].unit,
      unitPrice: insertedMaterials[i].unitPrice || 10000,
      lineTotal: 100 * (insertedMaterials[i].unitPrice || 10000),
      projectId: project.id
    });
  }
  await db.insert(purchaseOrderItems).values(poItems);

  // 7. INVENTORY GR (Goods Receipt)
  const [gr] = await db.insert(goodsReceipts).values({
    receiptNumber: 'GR-BVHUE-001',
    poId: po.id,
    supplierId: supplier1.id,
    receiptDate: new Date('2025-07-20'),
    status: 'POSTED'
  }).returning();

  // Update Inventory Balances
  for (let i = 0; i < 10; i++) {
    await db.insert(inventoryTransactions).values({
      movementNumber: `TX-GR-${pseudoRandom(i)*1000000}`,
      movementType: 'RECEIPT',
      materialId: insertedMaterials[i].id,
      warehouseId: warehouse.id,
      quantity: 100,
      unitCost: insertedMaterials[i].unitPrice || 10000,
      totalCost: 100 * (insertedMaterials[i].unitPrice || 10000),
      referenceType: 'GR',
      referenceId: gr.id,
      projectId: project.id,
      movementDate: new Date('2025-07-20')
    });

    await db.insert(inventoryBalances).values({
      materialId: insertedMaterials[i].id,
      warehouseId: warehouse.id,
      quantity: 100,
      availableQuantity: 100,
      unitCost: insertedMaterials[i].unitPrice || 10000,
    });
  }
  console.log(`✅ Đã tạo Procurement và Inventory data.`);

  // 8. PRODUCTION & QC
  console.log("⏳ Đang tạo Production & QC data...");
  const [prodOrder] = await db.insert(productionOrders).values({
    code: 'PROD-BVHUE-001',
    projectId: project.id,
    bomId: null, // Simple simulation without strict BOM
    productId: insertedMaterials[10].id, // Finished good
    plannedQuantity: 50,
    plannedStart: new Date('2025-08-01'),
    plannedEnd: new Date('2025-08-10'),
    status: 'IN_PROGRESS'
  }).returning();

  // Deduct inventory (Material Consumption)
  await db.insert(inventoryTransactions).values({
    movementNumber: 'TX-ISS-PROD-001',
    movementType: 'ISSUE',
    materialId: insertedMaterials[0].id, // Raw material
    warehouseId: warehouse.id,
    quantity: -50,
    unitCost: insertedMaterials[0].unitPrice || 10000,
    totalCost: 50 * (insertedMaterials[0].unitPrice || 10000),
    referenceType: 'PRODUCTION',
    referenceId: prodOrder.id,
    projectId: project.id,
    movementDate: new Date('2025-08-02')
  });
  await db.execute(sql`UPDATE inventory_balances SET quantity = quantity - 50, available_quantity = available_quantity - 50 WHERE material_id = ${insertedMaterials[0].id} AND warehouse_id = ${warehouse.id}`);

  // Production Output
  await db.insert(productionOutputs).values({
    outputNumber: 'OUT-BVHUE-001',
    productionOrderId: prodOrder.id,
    productId: insertedMaterials[10].id,
    warehouseId: warehouse.id,
    quantity: 45,
    userId: null
  });

  // QC Issue
  await db.insert(qcIssues).values({
    code: 'QC-BVHUE-001',
    title: 'Lỗi kích thước cửa',
    projectId: project.id,
    category: 'DIMENSION',
    severity: 'MEDIUM',
    status: 'OPEN',
    reportedBy: null,
    description: 'Kích thước lệch 2mm'
  });

  // 9. HR, ATTENDANCE, PAYROLL
  console.log("⏳ Đang tạo HR & Payroll data...");
  
  const [employee] = await db.insert(users).values({
    username: 'worker.bv',
    email: 'worker.bv@homepro.vn',
    password: 'dummy',
    name: 'Nguyen Van Worker',
    role: 'WORKER',
    officialSalary: 10000000
  }).returning();

  await db.insert(attendance).values({
    employeeId: employee.id,
    workDate: '2025-08-01',
    checkIn: new Date('2025-08-01T08:00:00Z'),
    checkOut: new Date('2025-08-01T17:00:00Z'),
    status: 'PRESENT',
    totalHours: 8,
    idempotencyKey: 'att-bv-001'
  });

  await db.insert(leaveRequests).values({
    employeeId: employee.id,
    leaveType: 'ANNUAL',
    startDate: '2025-08-05',
    endDate: '2025-08-05',
    status: 'APPROVED',
    reason: 'Việc gia đình',
    idempotencyKey: 'lv-bv-001'
  });

  await db.insert(monthlyPayroll).values({
    employeeId: employee.id,
    month: 8,
    year: 2025,
    officialSalary: 10000000,
    basicSalary: 10000000,
    regularWorkedDays: 20,
    paidLeaveDays: 1,
    status: 'PUBLISHED',
    idempotencyKey: 'pr-bv-001'
  });

  // 10. COSTING
  console.log("⏳ Đang tạo Costing data...");
  const [cost] = await db.insert(costs).values({
    projectId: project.id,
    title: 'Chi phí mua vật tư đợt 1',
    amount: 550000000,
    category: 'Vật tư mua ngoài',
    costDate: '2025-07-20'
  }).returning();

  console.log(`✅ Đã tạo Production, QC, HR, Payroll, Costing data.`);
  console.log("🎉 SIMULATION DỰ ÁN BỆNH VIỆN HUẾ KẾT THÚC THÀNH CÔNG.");
}

simulate().catch(err => {
  console.error("❌ LỖI SIMULATION:", err);
  process.exit(1);
});
