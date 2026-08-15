import * as dotenv from 'dotenv';
dotenv.config();
import { db } from '@/db';
import { sql, eq } from 'drizzle-orm';
import {
  projects,
  materials,
  boms,
  bomItems,
  routings,
  routingSteps,
  workCenters,
  machines,
  warehouses,
  inventoryBalances,
  users
} from '@/db/schema';
import { hash } from 'bcryptjs';

async function seedHue15B() {
  console.log('🌱 Starting Seed for Bệnh viện Huế 15B - Production Module...');

  try {
    // 1. Create Admin User if not exists
    let admin = (await db.select().from(users).where(eq(users.username, 'admin_prod')))[0];
    if (!admin) {
      const password = await hash('123456', 10);
      const [newAdmin] = await db.insert(users).values({
        username: 'admin_prod',
        password,
        name: 'Quản đốc Xưởng',
        role: 'ADMIN',
        employeeStatus: 'ACTIVE',
        employeeCode: 'NV-PROD-001'
      }).returning();
      admin = newAdmin;
    }

    // 2. Create Golden Project
    let project = (await db.select().from(projects).where(eq(projects.code, 'BV-HUE-15B-SIM')))[0];
    if (!project) {
      const [newProj] = await db.insert(projects).values({
        code: 'BV-HUE-15B-SIM',
        name: 'Dự án Bệnh viện Huế 15B',
        customer: 'Bệnh viện Trung ương Huế',
        contractValue: 15000000000,
        status: 'ACTIVE',
        startDate: '2025-07-01',
        deadline: '2026-04-30',
      }).returning();
      project = newProj;
      console.log('✅ Created Project: BV-HUE-15B-SIM');
    } else {
      console.log('✅ Project BV-HUE-15B-SIM already exists');
    }

    // 3. Create Warehouse
    let warehouse = (await db.select().from(warehouses).where(eq(warehouses.code, 'WH-HUE-01')))[0];
    if (!warehouse) {
      const [newWh] = await db.insert(warehouses).values({
        code: 'WH-HUE-01',
        name: 'Kho Xưởng Gỗ',
        type: 'WORKSHOP'
      }).returning();
      warehouse = newWh;
    }

    // 4. Create Work Centers & Machines
    const centers = [
      { code: 'WC-CUT', name: 'Tổ Cắt' },
      { code: 'WC-CNC', name: 'Tổ CNC' },
      { code: 'WC-EDGE', name: 'Tổ Dán Cạnh' },
      { code: 'WC-DRILL', name: 'Tổ Khoan' },
      { code: 'WC-ASSM', name: 'Tổ Lắp Ráp' }
    ];

    const workCenterIds: Record<string, number> = {};
    for (const wc of centers) {
      let existingWc = (await db.select().from(workCenters).where(eq(workCenters.name, wc.name)))[0];
      if (!existingWc) {
        const [insertedWc] = await db.insert(workCenters).values({
          code: wc.code,
          name: wc.name,
          standardHourlyCost: 50000,
          isActive: true
        }).returning();
        existingWc = insertedWc;
      }
      workCenterIds[wc.code] = existingWc.id;

      // Add a machine for each center
      let existingMachine = (await db.select().from(machines).where(eq(machines.workCenterId, existingWc.id)))[0];
      if (!existingMachine) {
        await db.insert(machines).values({
          code: `MAC-${wc.code}-001`,
          workCenterId: existingWc.id,
          name: `Máy ${wc.name} 01`,
          type: 'MACHINE',
          isActive: true
        });
      }
    }
    console.log('✅ Created Work Centers and Machines');

    // 5. Create Materials (Raw and Finished Good)
    let rawMdf = (await db.select().from(materials).where(eq(materials.code, 'MDF-18-ANCUONG')))[0];
    if (!rawMdf) {
      const [newMdf] = await db.insert(materials).values({
        code: 'MDF-18-ANCUONG',
        name: 'Ván MDF Chống Ẩm An Cường 18mm',
        type: 'RAW_MATERIAL',
        unit: 'Tấm'
      }).returning();
      rawMdf = newMdf;
    }

    let rawEdge = (await db.select().from(materials).where(eq(materials.code, 'N-PVC-ANCUONG')))[0];
    if (!rawEdge) {
      const [newEdge] = await db.insert(materials).values({
        code: 'N-PVC-ANCUONG',
        name: 'Nẹp nhựa PVC An Cường',
        type: 'RAW_MATERIAL',
        unit: 'Mét'
      }).returning();
      rawEdge = newEdge;
    }

    let fgCab = (await db.select().from(materials).where(eq(materials.code, 'TUT-HUE-01')))[0];
    if (!fgCab) {
      const [newCab] = await db.insert(materials).values({
        code: 'TUT-HUE-01',
        name: 'Tủ đầu giường y tế Bệnh viện',
        type: 'FINISHED_GOOD',
        unit: 'Cái'
      }).returning();
      fgCab = newCab;
    }

    console.log('✅ Created Materials');

    // 6. Provide Inventory Balances for Raw Materials
    const balances = [
      {
        materialId: rawMdf.id,
        warehouseId: warehouse.id,
        locationId: 'KHO-VAT-TU',
        quantity: 1000,
        availableQuantity: 1000,
        unitCost: 450000
      },
      {
        materialId: rawEdge.id,
        warehouseId: warehouse.id,
        locationId: 'KHO-VAT-TU',
        quantity: 5000,
        availableQuantity: 5000,
        unitCost: 5000
      }
    ];

    for (const bal of balances) {
      const existing = (await db.select().from(inventoryBalances).where(
        sql`${inventoryBalances.materialId} = ${bal.materialId} AND ${inventoryBalances.warehouseId} = ${bal.warehouseId}`
      ))[0];
      if (existing) {
        await db.update(inventoryBalances)
          .set({ quantity: sql`${inventoryBalances.quantity} + 1000`, availableQuantity: sql`${inventoryBalances.availableQuantity} + 1000` })
          .where(eq(inventoryBalances.id, existing.id));
      } else {
        await db.insert(inventoryBalances).values(bal);
      }
    }

    console.log('✅ Initialized Inventory');

    // 7. Create BOM
    const [bom] = await db.insert(boms).values({
      productId: fgCab.id,
      name: 'BOM Tủ đầu giường y tế v1',
      version: '1.0',
      createdBy: admin.id,
      approvedBy: admin.id
    }).returning();

    await db.insert(bomItems).values([
      {
        bomId: bom.id,
        materialId: rawMdf.id,
        quantity: 1.5, // 1.5 Tấm MDF cho 1 Tủ
        unit: 'Tấm',
        workCenterId: workCenterIds['WC-CUT']
      },
      {
        bomId: bom.id,
        materialId: rawEdge.id,
        quantity: 15, // 15m nẹp cho 1 tủ
        unit: 'Mét',
        workCenterId: workCenterIds['WC-EDGE']
      }
    ]);
    console.log('✅ Created BOM');

    // 8. Create Routing
    const [routing] = await db.insert(routings).values({
      productId: fgCab.id,
      name: 'Quy trình sản xuất Tủ y tế chuẩn',
      version: '1.0'
    }).returning();

    await db.insert(routingSteps).values([
      { routingId: routing.id, sequence: 10, operation: 'CUTTING', workCenterId: workCenterIds['WC-CUT'], estimatedMinutes: 15 },
      { routingId: routing.id, sequence: 20, operation: 'CNC', workCenterId: workCenterIds['WC-CNC'], estimatedMinutes: 20 },
      { routingId: routing.id, sequence: 30, operation: 'EDGE_BANDING', workCenterId: workCenterIds['WC-EDGE'], estimatedMinutes: 10 },
      { routingId: routing.id, sequence: 40, operation: 'DRILLING', workCenterId: workCenterIds['WC-DRILL'], estimatedMinutes: 10 },
      { routingId: routing.id, sequence: 50, operation: 'ASSEMBLY', workCenterId: workCenterIds['WC-ASSM'], estimatedMinutes: 30 }
    ]);
    console.log('✅ Created Routing');

    console.log('🎉 Seed HUE 15B Simulation Data Completed successfully!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
}

seedHue15B();
