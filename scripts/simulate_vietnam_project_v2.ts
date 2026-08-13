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
  console.log("🚀 BẮT ĐẦU SIMULATION DỰ ÁN BỆNH VIỆN HUẾ V2 (15 TỶ VND)...");
  
  const PROJECT_CODE = 'BV-HUE-15B-SIM';

  console.log("Cleaning up old simulation data...");
  // Cleanup by project id
  const existingProject = await db.select().from(projects).where(eq(projects.code, PROJECT_CODE)).limit(1);
  if (existingProject.length > 0) {
    const pId = existingProject[0].id;
    await db.execute(sql`DELETE FROM costs WHERE project_id = ${pId}`);
    await db.execute(sql`DELETE FROM qc_issues WHERE project_id = ${pId}`);
    await db.execute(sql`DELETE FROM production_outputs WHERE production_order_id IN (SELECT id FROM production_orders WHERE project_id = ${pId})`);
    await db.execute(sql`DELETE FROM production_orders WHERE project_id = ${pId}`);
    await db.execute(sql`DELETE FROM inventory_transactions WHERE project_id = ${pId}`);
    await db.execute(sql`DELETE FROM goods_receipts WHERE po_id IN (SELECT id FROM purchase_orders WHERE project_id = ${pId})`);
    await db.execute(sql`DELETE FROM purchase_order_items WHERE project_id = ${pId}`);
    await db.execute(sql`DELETE FROM purchase_orders WHERE project_id = ${pId}`);
    await db.execute(sql`DELETE FROM boq_items WHERE project_id = ${pId}`);
    await db.execute(sql`DELETE FROM projects WHERE id = ${pId}`);
  }
  
  await db.execute(sql`DELETE FROM monthly_payroll WHERE idempotency_key LIKE 'pr-bv15b-%'`);
  await db.execute(sql`DELETE FROM leave_requests WHERE idempotency_key LIKE 'lv-bv15b-%'`);
  await db.execute(sql`DELETE FROM attendance WHERE idempotency_key LIKE 'att-bv15b-%'`);
  await db.execute(sql`DELETE FROM users WHERE username LIKE 'worker.bv15b%'`);
  await db.execute(sql`DELETE FROM inventory_balances WHERE quantity > 0 AND material_id IN (SELECT id FROM materials WHERE code LIKE 'MAT-BV15B-%')`);
  await db.execute(sql`DELETE FROM suppliers WHERE code IN ('SUP-ANC-15B', 'SUP-HAF-15B', 'SUP-BLU-15B')`);
  await db.execute(sql`DELETE FROM materials WHERE code LIKE 'MAT-BV15B-%'`);
  await db.execute(sql`DELETE FROM warehouses WHERE code = 'WH-HUE-15B'`);

  // 1. CREATE CUSTOMER
  const [customer] = await db.insert(customers).values({
    name: 'Sở Y tế Thừa Thiên Huế (Sim)',
    phone: '02343822112',
    email: 'contact2@sythue.gov.vn',
    address: 'Huế, Việt Nam',
    notes: 'Chủ đầu tư dự án Bệnh viện đa khoa (Sim)'
  }).returning();
  console.log(`✅ Đã tạo Customer: ${customer.name}`);

  // 2. CREATE PROJECT
  const [project] = await db.insert(projects).values({
    code: PROJECT_CODE,
    name: 'Dự án Bệnh viện Huế — Mô phỏng 15 tỷ',
    customer: customer.name,
    manager: 'Nguyen Van B',
    location: 'Huế, Việt Nam',
    contractValue: 15000000000, // 15 tỷ VND
    targetMaterialCost: 5200000000,
    targetLaborCost: 2000000000,
    status: 'COMPLETED',
    startDate: '2025-07-01',
    deadline: '2026-04-30',
  }).returning();
  console.log(`✅ Đã tạo Project: ${project.name}`);

  // 3. WAREHOUSE
  const [warehouse] = await db.insert(warehouses).values({
    code: 'WH-HUE-15B',
    name: 'Kho Công Trình Bệnh Viện Huế 15B',
    type: 'PROJECT_SITE',
    address: 'Huế, Việt Nam'
  }).returning();

  // 4. CREATE MATERIALS
  console.log("⏳ Đang tạo Materials thực tế (Gỗ, Phụ kiện, Vật liệu)...");
  const materialList = [];
  
  // Gỗ công nghiệp
  materialList.push({ code: 'MAT-BV15B-G01', name: 'MDF chống ẩm An Cường 17.5mm phủ Melamine', unit: 'tấm', unitPrice: 450000, category: 'Ván công nghiệp', stockQty: 0 });
  materialList.push({ code: 'MAT-BV15B-G02', name: 'MFC chống ẩm An Cường 18mm', unit: 'tấm', unitPrice: 380000, category: 'Ván công nghiệp', stockQty: 0 });
  materialList.push({ code: 'MAT-BV15B-G03', name: 'Plywood chống nước 18mm phủ Laminate', unit: 'tấm', unitPrice: 850000, category: 'Ván công nghiệp', stockQty: 0 });
  
  // Phụ kiện
  materialList.push({ code: 'MAT-BV15B-P01', name: 'Bản lề giảm chấn Hafele', unit: 'bộ', unitPrice: 35000, category: 'Phụ kiện', stockQty: 0 });
  materialList.push({ code: 'MAT-BV15B-P02', name: 'Ray âm giảm chấn Blum 450mm', unit: 'bộ', unitPrice: 250000, category: 'Phụ kiện', stockQty: 0 });
  materialList.push({ code: 'MAT-BV15B-P03', name: 'Tay nắm nhôm định hình J', unit: 'md', unitPrice: 45000, category: 'Phụ kiện', stockQty: 0 });
  materialList.push({ code: 'MAT-BV15B-P04', name: 'Ốc cam liên kết', unit: 'hộp', unitPrice: 120000, category: 'Phụ kiện', stockQty: 0 });

  // Hoàn thiện
  materialList.push({ code: 'MAT-BV15B-H01', name: 'Đá Solid Surface trắng y tế', unit: 'm2', unitPrice: 2500000, category: 'Đá', stockQty: 0 });
  materialList.push({ code: 'MAT-BV15B-H02', name: 'Kính cường lực 10mm trắng trong', unit: 'm2', unitPrice: 650000, category: 'Kính', stockQty: 0 });
  materialList.push({ code: 'MAT-BV15B-H03', name: 'Inox 304 xước mờ', unit: 'kg', unitPrice: 125000, category: 'Inox', stockQty: 0 });

  // Thành phẩm (Finished goods for BOQ)
  materialList.push({ code: 'MAT-BV15B-F01', name: 'Tủ hồ sơ y tế gỗ MDF chống ẩm', unit: 'cái', unitPrice: 3500000, category: 'Thành phẩm', stockQty: 0 });
  materialList.push({ code: 'MAT-BV15B-F02', name: 'Tủ lavabo composite chống nước', unit: 'cái', unitPrice: 2800000, category: 'Thành phẩm', stockQty: 0 });
  materialList.push({ code: 'MAT-BV15B-F03', name: 'Quầy tiếp nhận trung tâm', unit: 'md', unitPrice: 8500000, category: 'Thành phẩm', stockQty: 0 });
  materialList.push({ code: 'MAT-BV15B-F04', name: 'Quầy điều dưỡng tầng', unit: 'md', unitPrice: 6500000, category: 'Thành phẩm', stockQty: 0 });
  materialList.push({ code: 'MAT-BV15B-F05', name: 'Bàn làm việc bác sĩ', unit: 'cái', unitPrice: 2200000, category: 'Thành phẩm', stockQty: 0 });
  materialList.push({ code: 'MAT-BV15B-F06', name: 'Vách ốp trang trí Laminate', unit: 'm2', unitPrice: 1200000, category: 'Thành phẩm', stockQty: 0 });
  materialList.push({ code: 'MAT-BV15B-F07', name: 'Cửa phòng bệnh nhân chống cháy', unit: 'bộ', unitPrice: 5500000, category: 'Thành phẩm', stockQty: 0 });

  const insertedMaterials = await db.insert(materials).values(materialList).returning();
  const getMat = (code: string) => insertedMaterials.find(m => m.code === code)!;

  // 5. CREATE BOQ
  console.log("⏳ Đang tạo BOQ (15 tỷ VND)...");
  const boqList = [];
  
  // Allocate 15B total
  // Wood & materials: ~5.2B -> implicitly covered in costing, but BOQ is for finished goods usually, 
  // or we can add raw materials to BOQ too if it's a fitout project.
  // We will add finished goods to reach ~11B and raw materials / labor as separate lines to reach 15B.
  
  boqList.push({ projectId: project.id, materialId: getMat('MAT-BV15B-F01').id, materialName: getMat('MAT-BV15B-F01').name, unit: 'cái', unitPrice: 4000000, qtyRequired: 300, category: 'Nội thất' }); // 1.2B
  boqList.push({ projectId: project.id, materialId: getMat('MAT-BV15B-F02').id, materialName: getMat('MAT-BV15B-F02').name, unit: 'cái', unitPrice: 3200000, qtyRequired: 250, category: 'Nội thất' }); // 0.8B
  boqList.push({ projectId: project.id, materialId: getMat('MAT-BV15B-F03').id, materialName: getMat('MAT-BV15B-F03').name, unit: 'md', unitPrice: 9500000, qtyRequired: 150, category: 'Nội thất' }); // 1.425B
  boqList.push({ projectId: project.id, materialId: getMat('MAT-BV15B-F04').id, materialName: getMat('MAT-BV15B-F04').name, unit: 'md', unitPrice: 7000000, qtyRequired: 400, category: 'Nội thất' }); // 2.8B
  boqList.push({ projectId: project.id, materialId: getMat('MAT-BV15B-F05').id, materialName: getMat('MAT-BV15B-F05').name, unit: 'cái', unitPrice: 2500000, qtyRequired: 300, category: 'Nội thất' }); // 0.75B
  boqList.push({ projectId: project.id, materialId: getMat('MAT-BV15B-F06').id, materialName: getMat('MAT-BV15B-F06').name, unit: 'm2', unitPrice: 1500000, qtyRequired: 2000, category: 'Nội thất' }); // 3B
  boqList.push({ projectId: project.id, materialId: getMat('MAT-BV15B-F07').id, materialName: getMat('MAT-BV15B-F07').name, unit: 'bộ', unitPrice: 6000000, qtyRequired: 450, category: 'Nội thất' }); // 2.7B
  
  // Tổng = 1.2 + 0.8 + 1.425 + 2.8 + 0.75 + 3.0 + 2.7 = 12.675 Tỷ.
  // Add some installation & transport & contingency
  boqList.push({ projectId: project.id, materialId: null, materialName: 'Chi phí vận chuyển và lắp đặt', unit: 'gói', unitPrice: 825000000, qtyRequired: 1, category: 'Vận chuyển' }); // 0.825B
  boqList.push({ projectId: project.id, materialId: null, materialName: 'Chi phí nhân công khoán ngoài', unit: 'gói', unitPrice: 500000000, qtyRequired: 1, category: 'Nhân công' }); // 0.5B
  boqList.push({ projectId: project.id, materialId: null, materialName: 'Dự phòng phí', unit: 'gói', unitPrice: 1000000000, qtyRequired: 1, category: 'Khác' }); // 1B
  
  // Total BOQ = 12.675 + 0.825 + 0.5 + 1.0 = 15.0B VND exactly.

  await db.insert(boqItems).values(boqList);

  // 6. PURCHASING (An Cuong, Hafele, Blum)
  console.log("⏳ Đang tạo Purchasing & Inventory...");
  const [supAnC] = await db.insert(suppliers).values({ code: 'SUP-ANC-15B', name: 'Công ty Cổ phần Gỗ An Cường' }).returning();
  const [supHaf] = await db.insert(suppliers).values({ code: 'SUP-HAF-15B', name: 'Hafele Việt Nam' }).returning();
  const [supBlu] = await db.insert(suppliers).values({ code: 'SUP-BLU-15B', name: 'Blum Việt Nam' }).returning();

  const createPO = async (supId: number, poNum: string, date: string, items: any[]) => {
    const total = items.reduce((sum, i) => sum + i.qty * i.price, 0);
    const [po] = await db.insert(purchaseOrders).values({
      poNumber: poNum,
      supplierId: supId,
      projectId: project.id,
      orderDate: new Date(date),
      status: 'RECEIVED',
      subtotal: total,
      tax: total * 0.1,
      total: total * 1.1
    }).returning();

    const poItemsInsert = items.map(i => ({
      poId: po.id,
      materialId: i.mat.id,
      description: i.mat.name,
      quantity: i.qty,
      unit: i.mat.unit,
      unitPrice: i.price,
      lineTotal: i.qty * i.price,
      projectId: project.id
    }));
    await db.insert(purchaseOrderItems).values(poItemsInsert);

    // GR
    const [gr] = await db.insert(goodsReceipts).values({
      receiptNumber: `GR-${poNum}`,
      poId: po.id,
      supplierId: supId,
      receiptDate: new Date(new Date(date).getTime() + 5*86400000), // 5 days later
      status: 'POSTED'
    }).returning();

    // Inventory
    for (const i of items) {
      await db.insert(inventoryTransactions).values({
        movementNumber: `TX-GR-${poNum}-${i.mat.id}`,
        movementType: 'RECEIPT',
        materialId: i.mat.id,
        warehouseId: warehouse.id,
        quantity: i.qty,
        unitCost: i.price,
        totalCost: i.qty * i.price,
        referenceType: 'GR',
        referenceId: gr.id,
        projectId: project.id,
        movementDate: new Date(new Date(date).getTime() + 5*86400000)
      });
      await db.insert(inventoryBalances).values({
        materialId: i.mat.id,
        warehouseId: warehouse.id,
        quantity: i.qty,
        availableQuantity: i.qty,
        unitCost: i.price
      });
    }
  };

  await createPO(supAnC.id, 'PO-ANC-15B-01', '2025-07-10', [
    { mat: getMat('MAT-BV15B-G01'), qty: 5000, price: 450000 },
    { mat: getMat('MAT-BV15B-G02'), qty: 2000, price: 380000 },
    { mat: getMat('MAT-BV15B-G03'), qty: 1000, price: 850000 }
  ]);
  // Total Gỗ = 2.25B + 0.76B + 0.85B = 3.86B

  await createPO(supHaf.id, 'PO-HAF-15B-01', '2025-07-15', [
    { mat: getMat('MAT-BV15B-P01'), qty: 20000, price: 35000 },
    { mat: getMat('MAT-BV15B-P03'), qty: 5000, price: 45000 }
  ]);
  // Total Hafele = 0.7B + 0.225B = 0.925B

  await createPO(supBlu.id, 'PO-BLU-15B-01', '2025-07-20', [
    { mat: getMat('MAT-BV15B-P02'), qty: 3000, price: 250000 }
  ]);
  // Total Blum = 0.75B

  // Total Procurement = ~ 5.535B (raw materials)

  // 7. PRODUCTION & QC
  console.log("⏳ Đang tạo Production & QC data...");
  const createProd = async (orderCode: string, fMat: any, qty: number, start: string, end: string) => {
    const [prodOrder] = await db.insert(productionOrders).values({
      code: orderCode,
      projectId: project.id,
      productId: fMat.id,
      plannedQuantity: qty,
      completedQuantity: qty,
      plannedStart: new Date(start),
      plannedEnd: new Date(end),
      status: 'COMPLETED'
    }).returning();

    // Consume raw materials (dummy logic: 2 mdf + 4 hinge per 1 finished good)
    const consume = [
      { mat: getMat('MAT-BV15B-G01'), qty: qty * 2 },
      { mat: getMat('MAT-BV15B-P01'), qty: qty * 4 }
    ];
    for(const c of consume) {
      await db.insert(inventoryTransactions).values({
        movementNumber: `TX-ISS-${orderCode}-${c.mat.id}`,
        movementType: 'ISSUE',
        materialId: c.mat.id,
        warehouseId: warehouse.id,
        quantity: -c.qty,
        unitCost: c.mat.unitPrice || 0,
        totalCost: c.qty * (c.mat.unitPrice || 0),
        referenceType: 'PRODUCTION',
        referenceId: prodOrder.id,
        projectId: project.id,
        movementDate: new Date(start)
      });
      await db.execute(sql`UPDATE inventory_balances SET quantity = quantity - ${c.qty}, available_quantity = available_quantity - ${c.qty} WHERE material_id = ${c.mat.id} AND warehouse_id = ${warehouse.id}`);
    }

    // Output
    await db.insert(productionOutputs).values({
      outputNumber: `OUT-${orderCode}`,
      productionOrderId: prodOrder.id,
      productId: fMat.id,
      warehouseId: warehouse.id,
      quantity: qty,
      userId: null
    });
  };

  await createProd('PROD-BV15B-01', getMat('MAT-BV15B-F01'), 300, '2025-08-01', '2025-08-15');
  await createProd('PROD-BV15B-02', getMat('MAT-BV15B-F02'), 250, '2025-08-16', '2025-08-30');
  await createProd('PROD-BV15B-03', getMat('MAT-BV15B-F07'), 450, '2025-09-01', '2025-09-20');

  // QC Issues
  await db.insert(qcIssues).values({
    code: 'QC-BV15B-01',
    title: 'Lệch vân gỗ cánh tủ',
    projectId: project.id,
    category: 'AESTHETIC',
    severity: 'MINOR',
    status: 'CLOSED',
    description: 'Vân gỗ Laminate ghép không liền mạch'
  });
  await db.insert(qcIssues).values({
    code: 'QC-BV15B-02',
    title: 'Cửa phòng trầy xước sơn',
    projectId: project.id,
    category: 'SURFACE',
    severity: 'MAJOR',
    status: 'CLOSED',
    description: 'Xước sơn PU trong quá trình vận chuyển lên tầng'
  });

  // 8. HR & PAYROLL
  console.log("⏳ Đang tạo HR & Payroll...");
  const [emp] = await db.insert(users).values({
    username: 'worker.bv15b.1',
    email: 'worker1@homepro.vn',
    password: 'dummy',
    name: 'Trần Văn Kỹ Thuật',
    role: 'WORKER',
    officialSalary: 12000000
  }).returning();

  for (let m = 7; m <= 12; m++) {
    await db.insert(monthlyPayroll).values({
      employeeId: emp.id,
      month: m,
      year: 2025,
      officialSalary: 12000000,
      basicSalary: 12000000,
      regularWorkedDays: 24,
      paidLeaveDays: 1,
      status: 'PUBLISHED',
      idempotencyKey: `pr-bv15b-2025-${m}`
    });
  }

  // 9. COSTING
  console.log("⏳ Đang tạo Costing data...");
  await db.insert(costs).values([
    { projectId: project.id, title: 'Thanh toán Gỗ An Cường', amount: 3860000000, category: 'Vật tư mua ngoài', costDate: '2025-07-25' },
    { projectId: project.id, title: 'Thanh toán Hafele', amount: 925000000, category: 'Vật tư mua ngoài', costDate: '2025-07-30' },
    { projectId: project.id, title: 'Thanh toán Blum', amount: 750000000, category: 'Vật tư mua ngoài', costDate: '2025-08-05' },
    { projectId: project.id, title: 'Lương nhân công T8-T12', amount: 1500000000, category: 'Nhân công', costDate: '2025-12-31' },
    { projectId: project.id, title: 'Chi phí vận chuyển & Lắp đặt ngoài', amount: 800000000, category: 'Vận chuyển', costDate: '2026-03-15' },
    { projectId: project.id, title: 'Chi phí sửa chữa QC (Trầy sơn, thay cánh)', amount: 150000000, category: 'Khác', costDate: '2026-04-10' }
  ]);
  // Total Cost = 3.86B + 0.925B + 0.75B + 1.5B + 0.8B + 0.15B = 7.985B.
  // Revenue = 15B. Gross Profit = ~7B.

  // PROGRESS
  // Since we don't have a specific `progress` table easily accessible here, we use tasks to simulate timeline.
  const tasksList = [
    { title: 'Khảo sát / Triển khai', status: 'DONE', priority: 'HIGH', projectId: project.id, assignedTo: emp.id },
    { title: 'Shopdrawing / Phê duyệt', status: 'DONE', priority: 'HIGH', projectId: project.id, assignedTo: emp.id },
    { title: 'Sản xuất nội thất đợt 1', status: 'DONE', priority: 'HIGH', projectId: project.id, assignedTo: emp.id },
    { title: 'Lắp đặt tại công trình (Tầng 1-3)', status: 'DONE', priority: 'HIGH', projectId: project.id, assignedTo: emp.id },
    { title: 'Nghiệm thu & Bàn giao', status: 'DONE', priority: 'HIGH', projectId: project.id, assignedTo: emp.id }
  ];
  await db.insert(tasks).values(tasksList);

  console.log("🎉 KẾT THÚC SIMULATION V2 DỰ ÁN HUE 15 TỶ!");
}

simulate().catch(err => {
  console.error("❌ LỖI SIMULATION:", err);
  process.exit(1);
});
