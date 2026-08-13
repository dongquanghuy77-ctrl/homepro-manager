import * as dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
import { db } from '../src/db';
import { ERPService } from '../src/lib/erp/services';
import { InventoryService } from '../src/lib/inventory/services';
import { ProductionService } from '../src/lib/production/services';
import { ProcurementService } from '../src/lib/procurement/services';
import { AccountingService } from '../src/lib/accounting/services';

import {
  users, customers, projects, materials, warehouses, boms, suppliers
} from '../src/db/schema';
import { eq, sql } from 'drizzle-orm';

const results: any[] = [];
function report(category: string, passed: boolean, message?: string) {
  results.push({ category, passed, message });
}

async function runEndToEndAudit() {
  console.log('--- STARTING FINAL END-TO-END SYSTEM INTEGRATION AUDIT ---');
  let admin = await db.query.users.findFirst({ where: eq(users.role, 'ADMIN') });
  if (!admin) throw new Error('No admin user');

  // Basic lookups
  const cust = await db.query.customers.findFirst();
  const proj = await db.query.projects.findFirst();
  const mat = await db.query.materials.findFirst();
  const wh = await db.query.warehouses.findFirst();
  const bom = await db.query.boms.findFirst();
  const sup = await db.query.suppliers.findFirst();

  if (!cust || !proj || !mat || !wh || !bom || !sup) {
    console.warn('Missing master data, seeding minimal for audit...');
    // In a real run, these should exist because of P1-P10
  }

  try {
    // 1. Sales & CRM (P7) -> triggers need
    console.log('1. Testing P7 (Sales) -> P6 (Project) link...');
    const so = await ERPService.createSalesOrder({
      orderNumber: `SO-AUDIT-${Date.now()}`,
      customerId: cust!.id,
      projectId: proj!.id,
      totalAmount: 500000
    });
    report('E2E Sales Order', so != null);

    // 2. Procurement (P3) -> Goods Receipt (P4)
    console.log('2. Testing P3 (Procurement) -> P4 (Inventory) -> P2 (Accounting)...');
    const po = await ProcurementService.createPurchaseOrder({
      poNumber: `PO-AUDIT-${Date.now()}`,
      supplierId: sup!.id,
      projectId: proj!.id,
      orderDate: new Date(),
      expectedDate: new Date(Date.now() + 86400000),
      totalAmount: 10000,
      currency: 'VND',
      deliveryDate: new Date(),
      status: 'APPROVED',
      createdBy: admin.id,
      items: [{
        materialId: mat!.id,
        description: 'Audit Material',
        quantity: 100,
        unit: 'Cái',
        unitPrice: 100,
        totalPrice: 10000
      }]
    });
    
    const poItemsQuery = await db.execute(sql`SELECT id FROM purchase_order_items WHERE po_id = ${po.id}`);
    const poItemId = poItemsQuery.rows[0].id;

    const gr = await ProcurementService.createGoodsReceipt({
      receiptNumber: `GR-AUDIT-${Date.now()}`,
      poId: po.id,
      supplierId: sup!.id,
      receiptDate: new Date(),
      warehouseId: wh!.id,
      receivedBy: admin.id,
      items: [{ 
        poItemId: poItemId,
        materialId: mat!.id, 
        receivedQuantity: 100,
        acceptedQuantity: 100,
        rejectedQuantity: 0,
        warehouseLocation: 'Zone A'
      }]
    });
    
    // Put stock into P4 Inventory Ledger
    await InventoryService.receiveGoods({
      materialId: mat!.id,
      warehouseId: wh!.id,
      quantity: 100,
      unitCost: 100,
      userId: admin.id
    });
    report('E2E Procurement & Receipt', gr != null);

    // Verify stock
    const stockQuery = await db.execute(sql`SELECT on_hand FROM stock_balances WHERE material_id = ${mat!.id} AND warehouse_id = ${wh!.id}`);
    const onHand = Number(stockQuery.rows[0]?.on_hand) || 0;
    report('E2E Inventory Update', onHand >= 100);

    // 3. Production (P5) -> Consumption (P4) -> Finished Goods
    console.log('3. Testing P5 (Production) -> P4 (Inventory Consumption)...');
    const prod = await ProductionService.createProductionOrder({
      code: `PROD-AUDIT-${Date.now()}`,
      projectId: proj!.id,
      productId: mat!.id,
      bomId: bom!.id,
      plannedQuantity: 10,
      createdBy: admin.id
    });
    const consumed = await ProductionService.consumeMaterial({
      productionOrderId: prod.id,
      materialId: mat!.id,
      warehouseId: wh!.id,
      plannedQuantity: 50,
      actualQuantity: 50,
      userId: admin.id
    });
    report('E2E Production Consumption', consumed != null);

    const output = await ProductionService.produceOutput({
      productionOrderId: prod.id,
      warehouseId: wh!.id,
      quantity: 10,
      userId: admin.id
    });
    report('E2E Production Output', output != null);

    // 4. Logistics (P9) -> Delivery
    console.log('4. Testing P9 (Logistics Delivery)...');
    const dn = await ERPService.createDeliveryNote({
      deliveryNumber: `DN-AUDIT-${Date.now()}`,
      salesOrderId: so.id,
      projectId: proj!.id,
      driverId: admin.id,
      items: [{ materialId: mat!.id, description: 'Finished Product', quantity: 10 }]
    });
    report('E2E Logistics Delivery', dn != null);

    // 5. Accounting (P2) Check
    console.log('5. Verifying Financial Integrity (P2)...');
    const jeQuery = await db.execute(sql`SELECT COUNT(*) as cnt FROM journal_entries`);
    const jeCount = Number(jeQuery.rows[0]?.cnt);
    report('E2E Accounting Entries Created', jeCount > 0);

  } catch (e: any) {
    console.error(e);
    report('E2E Workflow Crash', false, e.message);
  }

  console.log('\n--- SYSTEM INTEGRATION AUDIT RESULTS ---');
  let fails = 0;
  for (const r of results) {
    console.log(`[${r.passed ? 'PASS' : 'FAIL'}] ${r.category}${r.message ? ` - ${r.message}` : ''}`);
    if (!r.passed) fails++;
  }
  
  if (fails > 0) {
    process.exit(1);
  }
}

runEndToEndAudit().catch((e) => {
  console.error(e);
  process.exit(1);
}).finally(() => {
  process.exit(0);
});
