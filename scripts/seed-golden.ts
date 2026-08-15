#!/usr/bin/env tsx

import 'dotenv/config';
import { db } from '../src/db/index';
import { 
  projects, boqs, boqItems, materials, suppliers, warehouses, 
  inventoryBalances, inventoryTransactions, inventoryReservations, workCenters, machines, routings, boms, bomItems,
  productionPlans, productionOrders, workOrders, jobCards, scrapLogs,
  qcStandards, qcInspections, qcIssues, users, inventoryCountItems, inventoryCounts
} from '../src/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

const PASSWORD_HASH = bcrypt.hashSync('Homepro@2026', 10);

async function seedGolden() {
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║   Golden Project Seed: Bệnh viện Huế 15 tỷ VNĐ       ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  try {
    // 1. CREATE ADMIN USER
    console.log('⏳ [1/12] Seeding Admin User...');
    const [existingAdmin] = await db.select().from(users).where(eq(users.username, 'admin'));
    let adminId = existingAdmin?.id;
    if (!existingAdmin) {
      const [newAdmin] = await db.insert(users).values({
        username: 'admin',
        password: PASSWORD_HASH,
        name: 'Quản trị viên',
        role: 'MANAGER',
        active: true,
      }).returning({ id: users.id });
      adminId = newAdmin.id;
    }

    const suffix = Date.now().toString().slice(-4);
    
    // 2. CREATE PROJECT
    console.log('⏳ [2/12] Seeding Golden Project...');
    const projectCode = `SIM-HUE-15B-${suffix}`;
    const [project] = await db.insert(projects).values({
      code: projectCode,
      name: `Nội thất Bệnh viện Huế 15 tỷ VNĐ (${suffix})`,
      status: 'IN_PROGRESS',
      startDate: new Date('2026-06-01').toISOString(),
      endDate: new Date('2026-12-31').toISOString(),
      managerId: adminId,
    }).returning();

    // 3. CREATE BOQ
    console.log('⏳ [3/12] Seeding BOQ...');
    const [boq] = await db.insert(boqs).values({
      code: `BOQ-HUE-${suffix}`,
      projectId: project.id,
      version: 'v1.0',
      status: 'APPROVED',
      totalAmount: '15000000000',
    }).returning();

    // 4. CREATE SUPPLIERS & WAREHOUSES
    console.log('⏳ [4/12] Seeding Suppliers & Warehouses...');
    const [supplier] = await db.insert(suppliers).values({
      code: `SUP-AC-${suffix}`,
      name: 'Công ty TNHH An Cường',
      type: 'MATERIAL',
      status: 'ACTIVE',
    }).returning();

    const [warehouse] = await db.insert(warehouses).values({
      code: `WH-MAIN-${suffix}`,
      name: 'Kho vật tư chính',
      type: 'RAW_MATERIAL',
      status: 'ACTIVE',
    }).returning();

    // 5. CREATE MATERIALS
    console.log('⏳ [5/12] Seeding Materials...');
    const [matMDF] = await db.insert(materials).values({
      code: `MDF-AC-18-${suffix}`,
      name: 'MDF chống ẩm An Cường 18mm',
      category: 'Ván gỗ',
      uom: 'Tấm',
      unitPrice: '550000',
    }).returning();

    const [matHardware] = await db.insert(materials).values({
      code: `HW-HINGE-${suffix}`,
      name: 'Bản lề giảm chấn Hafele',
      category: 'Phụ kiện',
      uom: 'Cái',
      unitPrice: '45000',
    }).returning();

    const [matProduct] = await db.insert(materials).values({
      code: `FG-CAB-${suffix}`,
      name: 'Tủ hồ sơ y tế',
      category: 'Thành phẩm',
      uom: 'Cái',
      unitPrice: '3500000',
    }).returning();

    await db.insert(boqItems).values({
      boqId: boq.id,
      productId: matProduct.id,
      projectId: project.id,
      materialId: matProduct.id,
      materialName: matProduct.name,
      unit: 'cái',
      qtyRequired: '200',
      unitPrice: '3500000',
    });

    // 6. INITIAL INVENTORY (RECEIPT & BALANCE)
    console.log('⏳ [6/12] Seeding Inventory...');
    await db.insert(inventoryBalances).values({
      warehouseId: warehouse.id,
      locationId: 'K-A01-T2',
      materialId: matMDF.id,
      quantity: '500',
      availableQuantity: '500',
      reservedQuantity: '0',
    });

    await db.insert(inventoryBalances).values({
      warehouseId: warehouse.id,
      locationId: 'K-A01-T2',
      materialId: matHardware.id,
      quantity: '2000',
      availableQuantity: '2000',
      reservedQuantity: '0',
    });

    await db.insert(inventoryTransactions).values({
      movementType: 'RECEIPT',
      movementNumber: `REC-${suffix}`,
      warehouseId: warehouse.id,
      materialId: matMDF.id,
      quantity: '500',
      referenceType: 'PO',
    });

  // 7. PRODUCTION ROUTING & WORK CENTERS
    console.log('⏳ [7/12] Seeding Production Infrastructure...');
    const [wcCut] = await db.insert(workCenters).values({
      code: `WC-CUT-${suffix}`, name: 'Tổ Cắt CNC', dailyCapacityHours: '8', isActive: true
    }).returning();
    const [wcEdge] = await db.insert(workCenters).values({
      code: `WC-EDGE-${suffix}`, name: 'Tổ Dán cạnh', dailyCapacityHours: '8', isActive: true
    }).returning();

    const [machine] = await db.insert(machines).values({
      workCenterId: wcCut.id, code: `MAC-CNC-${suffix}`, name: 'Máy Cắt CNC Holzher', type: 'CNC', isActive: true
    }).returning();

    const [routing] = await db.insert(routings).values({
      productId: matProduct.id, name: 'Quy trình sản xuất Tủ y tế', version: '1.0', isActive: true
    }).returning();

    // 8. PRODUCTION BOM
    console.log('⏳ [8/12] Seeding BOM...');
    const [bom] = await db.insert(boms).values({
      productId: matProduct.id,
      name: `BOM Tủ y tế - ${suffix}`,
      version: '1.0',
      status: 'ACTIVE',
    }).returning();

    await db.insert(bomItems).values([
      { bomId: bom.id, materialId: matMDF.id, quantity: '2.5', unit: 'Tấm' },
      { bomId: bom.id, materialId: matHardware.id, quantity: '4', unit: 'Cái' }
    ]);

    // 9. PRODUCTION PLANS & ORDERS
    console.log('⏳ [9/12] Seeding Production Orders...');
    const [plan] = await db.insert(productionPlans).values({
      code: `PP-${suffix}`, name: 'Kế hoạch sản xuất tháng 8/2026', projectId: project.id, status: 'APPROVED'
    }).returning();

    const [order] = await db.insert(productionOrders).values({
      code: `PO-HUE-${suffix}`,
      projectId: project.id,
      planId: plan.id,
      productId: matProduct.id,
      bomId: bom.id,
      routingId: routing.id,
      plannedQuantity: '50',
      status: 'IN_PROGRESS',
    }).returning();
    
    const [workOrder] = await db.insert(workOrders).values({
      productionOrderId: order.id,
      operation: 'Cắt CNC',
      sequence: 1,
      plannedQuantity: '50',
      workCenterId: wcCut.id,
      machineId: machine.id,
      status: 'IN_PROGRESS',
    }).returning();

    // 10. MATERIAL RESERVATION
    console.log('⏳ [10/12] Seeding Material Reservations...');
    await db.insert(inventoryReservations).values({
      materialId: matMDF.id,
      warehouseId: warehouse.id,
      quantity: '125', // 50 * 2.5
      referenceType: 'PROD_ORDER',
      referenceId: order.id,
      status: 'RESERVED',
    });

    // 11. JOB CARDS & PROGRESS
    console.log('⏳ [11/12] Seeding Job Cards & Progress...');
    const [jobCard] = await db.insert(jobCards).values({
      workOrderId: workOrder.id,
      employeeId: adminId!,
      startTime: new Date(),
      completedQuantity: '20',
      status: 'IN_PROGRESS',
    }).returning();

    // 12. QC & SCRAP
    console.log('⏳ [12/12] Seeding QC & Scrap...');
    const [qcStd] = await db.insert(qcStandards).values({
      code: `QC-CAB-${suffix}`, name: 'Tiêu chuẩn Tủ Y Tế', status: 'ACTIVE'
    }).returning();

    await db.insert(qcInspections).values({
      code: `INSP-${suffix}`,
      projectId: project.id,
      productionOrderId: order.id,
      inspectorId: adminId,
      result: 'FAIL',
      notes: 'Mẻ góc tấm ván',
    });

    await db.insert(scrapLogs).values({
      workOrderId: workOrder.id,
      productionOrderId: order.id,
      materialId: matMDF.id,
      quantity: '1',
      reason: 'Mẻ góc khi cắt',
      employeeId: adminId,
    });

    console.log('\n✅ Golden Project Seed completed successfully!\n');
  } catch (error) {
    console.error('❌ Golden Project Seed failed:', error);
    process.exit(1);
  }
}

seedGolden()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n❌ Seed failed:', err);
    process.exit(1);
  });
