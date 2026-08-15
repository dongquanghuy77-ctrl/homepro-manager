import { db } from '../src/db';
import * as s from '../src/db/schema';
import { eq, inArray } from 'drizzle-orm';

async function seed() {
  console.log('--- STARTING GOLDEN DATA SEED: HUE HOSPITAL 15B PROJECT ---');

  // 1. Projects & Production Orders (Top level)
  const oldProject = await db.query.projects.findFirst({ where: eq(s.projects.code, 'SIM-HUE-15B') });
  if (oldProject) {
    console.log('1. Cleaning old simulation data for project:', oldProject.id);
    const pos = await db.query.productionOrders.findMany({ where: eq(s.productionOrders.projectId, oldProject.id) });
    const poIds = pos.map(p => p.id);
    
    if (poIds.length > 0) {
      await db.delete(s.scrapLogs).where(inArray(s.scrapLogs.productionOrderId, poIds));
      await db.delete(s.productionOutputs).where(inArray(s.productionOutputs.productionOrderId, poIds));
      await db.delete(s.jobCards).where(inArray(s.jobCards.workOrderId, 
        db.select({ id: s.workOrders.id }).from(s.workOrders).where(inArray(s.workOrders.productionOrderId, poIds))
      ));
      await db.delete(s.workOrders).where(inArray(s.workOrders.productionOrderId, poIds));
      await db.delete(s.materialConsumptions).where(inArray(s.materialConsumptions.productionOrderId, poIds));
    }
    
    await db.delete(s.productionOrders).where(eq(s.productionOrders.projectId, oldProject.id));
    await db.delete(s.projectSchedules).where(eq(s.projectSchedules.projectId, oldProject.id));
    await db.delete(s.projectCosts).where(eq(s.projectCosts.projectId, oldProject.id));
  }

  // 2. Quality Control
  await db.delete(s.qcIssues).where(eq(s.qcIssues.notes, 'SIM-HUE-15B')).catch(() => {});
  await db.delete(s.qcInspections).where(eq(s.qcInspections.notes, 'SIM-HUE-15B')).catch(() => {});

  // 3. Procurement (Purchase Orders & Receipts)
  const posToDel = await db.query.purchaseOrders.findMany({ where: eq(s.purchaseOrders.notes, 'SIM-HUE-15B') });
  const poIdsToDel = posToDel.map(p => p.id);
  if (poIdsToDel.length > 0) {
    const grs = await db.query.goodsReceipts.findMany({ where: inArray(s.goodsReceipts.poId, poIdsToDel) });
    const grIds = grs.map(g => g.id);
    if (grIds.length > 0) {
      await db.delete(s.goodsReceiptItems).where(inArray(s.goodsReceiptItems.receiptId, grIds));
      await db.delete(s.goodsReceipts).where(inArray(s.goodsReceipts.id, grIds));
    }
    await db.delete(s.purchaseOrderItems).where(inArray(s.purchaseOrderItems.poId, poIdsToDel));
    await db.delete(s.purchaseOrders).where(inArray(s.purchaseOrders.id, poIdsToDel));
  }

  // 4. Materials, BOMs, Routings, Balances
  const oldMats = await db.query.materials.findMany({ where: eq(s.materials.notes, 'SIM-HUE-15B') });
  const matIds = oldMats.map(m => m.id);
  if (matIds.length > 0) {
    await db.delete(s.inventoryBalances).where(inArray(s.inventoryBalances.materialId, matIds));
    await db.delete(s.inventoryReservations).where(inArray(s.inventoryReservations.materialId, matIds));
    await db.delete(s.bomItems).where(inArray(s.bomItems.materialId, matIds));
    await db.delete(s.boms).where(inArray(s.boms.productId, matIds));
    await db.delete(s.routingSteps).where(inArray(s.routingSteps.routingId, 
      db.select({ id: s.routings.id }).from(s.routings).where(inArray(s.routings.productId, matIds))
    ));
    await db.delete(s.routings).where(inArray(s.routings.productId, matIds));
    await db.delete(s.materials).where(inArray(s.materials.id, matIds));
  }
  
  // 5. Master Data (Suppliers, Warehouses, WorkCenters)
  const supIds = ['SIM-HUE-15B-SUP-01', 'SIM-HUE-15B-SUP-02', 'SIM-HUE-15B-SUP-03', 'SIM-HUE-15B-SUP-04'];
  await db.delete(s.suppliers).where(inArray(s.suppliers.code, supIds)).catch(() => {});
  
  const whIds = ['SIM-HUE-15B-WH-NVL', 'SIM-HUE-15B-WH-PK', 'SIM-HUE-15B-WH-TP', 'SIM-HUE-15B-WH-SITE'];
  await db.delete(s.warehouses).where(inArray(s.warehouses.code, whIds)).catch(() => {});
  
  const wcIds = ['SIM-HUE-15B-WC-01', 'SIM-HUE-15B-WC-02', 'SIM-HUE-15B-WC-03', 'SIM-HUE-15B-WC-04'];
  const oldWcs = await db.query.workCenters.findMany({ where: inArray(s.workCenters.code, wcIds) });
  if (oldWcs.length > 0) {
    await db.delete(s.machines).where(inArray(s.machines.workCenterId, oldWcs.map(w => w.id)));
    await db.delete(s.workCenters).where(inArray(s.workCenters.id, oldWcs.map(w => w.id)));
  }

  // 6. Users and finally Projects
  const oldUser = await db.query.users.findFirst({ where: eq(s.users.email, 'sim.hue@homepro.vn') });
  if (oldUser) {
    await db.delete(s.users).where(eq(s.users.id, oldUser.id));
  }

  if (oldProject) {
    await db.delete(s.projects).where(eq(s.projects.id, oldProject.id));
  }

  console.log('2. Seeding Users & Master Data...');
  const [user] = await db.insert(s.users).values({
    username: 'sim.hue',
    name: 'Giám đốc Dự án Huế',
    email: 'sim.hue@homepro.vn',
    password: 'dummy',
    role: 'ADMIN',
    active: true
  }).returning();

  console.log('3. Seeding Project Bệnh viện Huế...');
  const [project] = await db.insert(s.projects).values({
    code: 'SIM-HUE-15B',
    name: 'Bệnh viện TW Huế - Nội thất 15 Tỷ',
    notes: 'Dự án trọng điểm cung cấp lắp đặt nội thất Bệnh viện TW Huế',
    customer: 'user.id.toString()', 
    manager: 'user.id.toString()',
    startDate: '2025-07-01T00:00:00.000Z',
    deadline: '2026-04-30T00:00:00.000Z',
    status: 'ACTIVE',
    contractValue: 15000000000
  }).returning();

  console.log('4. Seeding Warehouses...');
  const warehousesToInsert = [
    { code: 'SIM-HUE-15B-WH-NVL', name: 'Kho Nguyên vật liệu Huế', type: 'MAIN_WAREHOUSE' },
    { code: 'SIM-HUE-15B-WH-PK', name: 'Kho Phụ kiện Huế', type: 'MAIN_WAREHOUSE' },
    { code: 'SIM-HUE-15B-WH-TP', name: 'Kho Thành phẩm Huế', type: 'MAIN_WAREHOUSE' },
    { code: 'SIM-HUE-15B-WH-SITE', name: 'Kho Công trình Bệnh viện Huế', type: 'PROJECT_SITE' }
  ];
  const whs = await db.insert(s.warehouses).values(warehousesToInsert).returning();
  const whNVL = whs[0];

  console.log('5. Seeding Materials (30+ items)...');
  const materialsToInsert = [
    { code: 'MAT-MDF-01', name: 'MDF Chống ẩm 18mm', unit: 'Tấm', category: 'Gỗ', type: 'RAW_MATERIAL', unitPrice: 450000 },
    { code: 'MAT-MDF-02', name: 'MDF Thường 18mm', unit: 'Tấm', category: 'Gỗ', type: 'RAW_MATERIAL', unitPrice: 350000 },
    { code: 'MAT-PLY-01', name: 'Plywood 15mm', unit: 'Tấm', category: 'Gỗ', type: 'RAW_MATERIAL', unitPrice: 550000 },
    { code: 'MAT-HDF-01', name: 'HDF 12mm', unit: 'Tấm', category: 'Gỗ', type: 'RAW_MATERIAL', unitPrice: 600000 },
    { code: 'MAT-LAM-01', name: 'Laminate Trắng', unit: 'Tấm', category: 'Bề mặt', type: 'RAW_MATERIAL', unitPrice: 200000 },
    { code: 'MAT-MEL-01', name: 'Melamine Vân Gỗ Sồi', unit: 'Tấm', category: 'Bề mặt', type: 'RAW_MATERIAL', unitPrice: 150000 },
    { code: 'MAT-PVC-01', name: 'Nẹp PVC 22mm Trắng', unit: 'Cuộn', category: 'Nẹp', type: 'RAW_MATERIAL', unitPrice: 120000 },
    { code: 'MAT-KEO-01', name: 'Keo dán gỗ PUR', unit: 'Thùng', category: 'Hóa chất', type: 'RAW_MATERIAL', unitPrice: 850000 },
    { code: 'MAT-SON-01', name: 'Sơn PU Bóng', unit: 'Thùng', category: 'Hóa chất', type: 'RAW_MATERIAL', unitPrice: 1250000 },
    { code: 'MAT-SON-02', name: 'Sơn lót 2K', unit: 'Thùng', category: 'Hóa chất', type: 'RAW_MATERIAL', unitPrice: 950000 },
    { code: 'MAT-BL-01', name: 'Bản lề giảm chấn Blum', unit: 'Cái', category: 'Phụ kiện', type: 'RAW_MATERIAL', unitPrice: 45000 },
    { code: 'MAT-RAY-01', name: 'Ray trượt Hafele', unit: 'Bộ', category: 'Phụ kiện', type: 'RAW_MATERIAL', unitPrice: 150000 },
    { code: 'MAT-TN-01', name: 'Tay nắm nhôm', unit: 'Cái', category: 'Phụ kiện', type: 'RAW_MATERIAL', unitPrice: 25000 },
    { code: 'MAT-VIT-01', name: 'Vít gỗ 4x20', unit: 'Hộp', category: 'Phụ kiện', type: 'RAW_MATERIAL', unitPrice: 50000 },
    { code: 'MAT-CAM-01', name: 'Cam chốt liên kết', unit: 'Bộ', category: 'Phụ kiện', type: 'RAW_MATERIAL', unitPrice: 5000 },
    { code: 'MAT-DA-01', name: 'Đá nhân tạo Solid Surface', unit: 'm2', category: 'Đá', type: 'RAW_MATERIAL', unitPrice: 2500000 },
    { code: 'MAT-KINH-01', name: 'Kính cường lực 8mm', unit: 'm2', category: 'Kính', type: 'RAW_MATERIAL', unitPrice: 450000 },
    { code: 'MAT-NHOM-01', name: 'Thanh nhôm định hình', unit: 'Thanh', category: 'Nhôm', type: 'RAW_MATERIAL', unitPrice: 120000 },
    { code: 'MAT-BAO-01', name: 'Màng PE bọc hàng', unit: 'Cuộn', category: 'Bao bì', type: 'RAW_MATERIAL', unitPrice: 180000 },
    { code: 'MAT-BAO-02', name: 'Thùng Carton 5 lớp', unit: 'Cái', category: 'Bao bì', type: 'RAW_MATERIAL', unitPrice: 15000 },
    // Finished Goods
    { code: 'FG-TUHOSO-01', name: 'Tủ hồ sơ văn phòng', unit: 'Cái', category: 'Nội thất y tế', type: 'FINISHED_GOOD', unitPrice: 2500000 },
    { code: 'FG-TULAVA-01', name: 'Tủ lavabo', unit: 'Cái', category: 'Nội thất y tế', type: 'FINISHED_GOOD', unitPrice: 3500000 },
    { code: 'FG-QUAYLE-01', name: 'Quầy lễ tân BV', unit: 'Cái', category: 'Nội thất y tế', type: 'FINISHED_GOOD', unitPrice: 12500000 },
    { code: 'FG-TUTHUOC-01', name: 'Tủ thuốc y tế', unit: 'Cái', category: 'Nội thất y tế', type: 'FINISHED_GOOD', unitPrice: 4500000 },
    { code: 'FG-BANLAM-01', name: 'Bàn làm việc Bác sĩ', unit: 'Cái', category: 'Nội thất y tế', type: 'FINISHED_GOOD', unitPrice: 1800000 },
  ].map(m => ({ ...m, stockQty: 0, minStock: 100, notes: 'SIM-HUE-15B' }));

  const mats = await db.insert(s.materials).values(materialsToInsert).returning();

  console.log('6. Seeding Suppliers & Purchases...');
  const suppliersToInsert = [
    { code: 'SIM-HUE-15B-SUP-01', name: 'NCC Gỗ An Cường', rating: '5' },
    { code: 'SIM-HUE-15B-SUP-02', name: 'NCC Phụ kiện Hafele VN', rating: '5' },
    { code: 'SIM-HUE-15B-SUP-03', name: 'NCC Sơn Inchem', rating: '4' },
    { code: 'SIM-HUE-15B-SUP-04', name: 'NCC Đá Vicostone', rating: '5' }
  ];
  const sups = await db.insert(s.suppliers).values(suppliersToInsert).returning();

  const [po] = await db.insert(s.purchaseOrders).values({
    poNumber: 'PO-SIM-HUE-01',
    supplierId: sups[0].id,
    projectId: project.id,
    orderDate: new Date(),
    status: 'RECEIVED',
    total: 500000000,
    subtotal: 500000000,
    notes: 'SIM-HUE-15B'
  }).returning();

  // Simulate goods receipt by creating balances directly
  console.log('7. Creating Inventory Balances (Goods Received)...');
  const balancesToInsert = mats.filter(m => m.type === 'RAW_MATERIAL').map(m => ({
    materialId: m.id,
    warehouseId: whNVL.id,
    locationId: 'SIM-HUE-15B',
    quantity: 1000,
    availableQuantity: 1000,
    unitCost: Number(m.unitPrice)
  }));
  await db.insert(s.inventoryBalances).values(balancesToInsert);

  console.log('8. Seeding Work Centers & Machines...');
  const wcToInsert = [
    { code: 'SIM-HUE-15B-WC-01', name: 'Tổ CNC', dailyCapacityHours: 100 },
    { code: 'SIM-HUE-15B-WC-02', name: 'Tổ Dán Cạnh', dailyCapacityHours: 200 },
    { code: 'SIM-HUE-15B-WC-03', name: 'Tổ Lắp Ráp', dailyCapacityHours: 50 },
    { code: 'SIM-HUE-15B-WC-04', name: 'Tổ Sơn', dailyCapacityHours: 30 }
  ];
  const wcs = await db.insert(s.workCenters).values(wcToInsert).returning();

  const machinesToInsert = wcs.map((wc) => {
    let mType = 'CNC';
    if (wc.name.includes('Dán')) mType = 'EDGE_BANDER';
    if (wc.name.includes('Lắp')) mType = 'ASSEMBLY_STATION';
    if (wc.name.includes('Sơn')) mType = 'FINISHING';
    
    return {
      code: `SIM-HUE-15B-MAC-${wc.id}`,
      name: `Máy chính - ${wc.name}`,
      workCenterId: wc.id,
      type: mType,
      isActive: true,
    };
  });
  await db.insert(s.machines).values(machinesToInsert);

  console.log('9. Seeding BOMs & Routings...');
  const fg = mats.find(m => m.code === 'FG-TUHOSO-01')!;
  const rawMdf = mats.find(m => m.code === 'MAT-MDF-01')!;
  const rawBanLe = mats.find(m => m.code === 'MAT-BL-01')!;

  const [bom] = await db.insert(s.boms).values({
    productId: fg.id,
    name: 'BOM Tủ hồ sơ 15B',
    version: '1.0',
    status: 'ACTIVE'
  }).returning();

  await db.insert(s.bomItems).values([
    { bomId: bom.id, materialId: rawMdf.id, quantity: 2, unit: 'Tấm', notes: 'SIM-HUE-15B' },
    { bomId: bom.id, materialId: rawBanLe.id, quantity: 4, unit: 'Cái', notes: 'SIM-HUE-15B' }
  ]);

  const [routing] = await db.insert(s.routings).values({
    productId: fg.id,
    name: 'Quy trình chuẩn Tủ Hồ Sơ',
    version: '1.0'
  }).returning();

  await db.insert(s.routingSteps).values([
    { routingId: routing.id, sequence: 1, workCenterId: wcs[0].id, operation: 'Cắt CNC', estimatedMinutes: 45 },
    { routingId: routing.id, sequence: 2, workCenterId: wcs[1].id, operation: 'Dán cạnh', estimatedMinutes: 30 },
    { routingId: routing.id, sequence: 3, workCenterId: wcs[2].id, operation: 'Lắp ráp', estimatedMinutes: 60 }
  ]);

  console.log('10. Seeding Production Orders & Work Orders & Job Cards...');
  const [poProd] = await db.insert(s.productionOrders).values({
    code: 'PROD-SIM-HUE-01',
    projectId: project.id,
    productId: fg.id,
    bomId: bom.id,
    routingId: routing.id,
    plannedQuantity: 50,
    completedQuantity: 45, // 5 scrap
    status: 'COMPLETED',
    plannedStart: new Date(),
    plannedEnd: new Date(),
    notes: 'SIM-HUE-15B'
  } as any).returning();

  const [wo] = await db.insert(s.workOrders).values({
    productionOrderId: poProd.id,
    operation: 'Cắt CNC',
    sequence: 1,
    plannedQuantity: 50,
    completedQuantity: 45,
    status: 'COMPLETED',
    workCenterId: wcs[0].id,
  }).returning();

  await db.insert(s.jobCards).values({
    workOrderId: wo.id,
    employeeId: user.id,
    startTime: new Date(),
    completedQuantity: 45,
    rejectedQuantity: 5,
    status: 'COMPLETED',
    notes: 'SIM-HUE-15B'
  });

  console.log('11. Seeding QC & Scrap...');
  await db.insert(s.scrapLogs).values({
    productionOrderId: poProd.id,
    workOrderId: wo.id,
    materialId: rawMdf.id,
    quantity: 5,
    reason: 'Cắt sai kích thước CNC'
  });

  const [qcInspection] = await db.insert(s.qcInspections).values({
    code: 'QC-SIM-HUE-01',
    productionOrderId: poProd.id,
    inspectorId: user.id,
    result: 'FAIL',
    notes: 'SIM-HUE-15B'
  } as any).returning();

  await db.insert(s.qcIssues).values({
    inspectionId: qcInspection.id,
    projectId: project.id,
    code: 'ISS-SIM-HUE-01',
    title: 'Lỗi dán cạnh bong mép',
    severity: 'MAJOR',
    status: 'CLOSED',
    description: 'Bong mép dán cạnh',
    notes: 'SIM-HUE-15B'
  } as any);

  console.log('12. Seeding Dashboards / Progress / Cost...');
  await db.insert(s.projectCosts).values([
    { projectId: project.id, costCategory: 'MATERIAL', amount: 7500000000, notes: 'SIM-HUE-15B' },
    { projectId: project.id, costCategory: 'LABOR', amount: 3100000000, notes: 'SIM-HUE-15B' } // Vượt ngân sách nhẹ
  ] as any);

  await db.insert(s.projectSchedules).values([
    { projectId: project.id, phaseName: 'Thiết kế & BOQ', status: 'COMPLETED' },
    { projectId: project.id, phaseName: 'Sản xuất Tủ hồ sơ', status: 'COMPLETED' },
    { projectId: project.id, phaseName: 'Sản xuất Quầy lễ tân', status: 'IN_PROGRESS' },
    { projectId: project.id, phaseName: 'Lắp đặt tại Công trình', status: 'PENDING' }
  ] as any);

  console.log('--- GOLDEN DATA SEED COMPLETED SUCCESSFULLY ---');
  process.exit(0);
}

seed().catch((err) => {
  console.error('SEED FAILED:', err);
  process.exit(1);
});
