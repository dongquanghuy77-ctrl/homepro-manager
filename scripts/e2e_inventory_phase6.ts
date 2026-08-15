import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });
import { db } from '../src/db';
import { SupplierService, InventoryCountService, InventoryService } from '../src/lib/inventory/services';
import { materials, warehouses } from '../src/db/schema';
import { eq, inArray } from 'drizzle-orm';

async function runE2E() {
  console.log('--- STARTING INVENTORY E2E VERIFICATION ---');

  const userId = 1;

  // 1. Get base data
  const mats = await db.select().from(materials).limit(1);
  const whs = await db.select().from(warehouses).limit(2);
  if (!mats.length || whs.length < 2) throw new Error('Not enough base data (need 1 material, 2 warehouses)');

  const material = mats[0];
  const whA = whs[0];
  const whB = whs[1];

  console.log(`Using Material: ${material.name} and Warehouses: ${whA.name}, ${whB.name}`);

  // 0. Clean dirty balances in test warehouses
  await db.delete(require('../src/db/schema').inventoryBalances).where(
    inArray(require('../src/db/schema').inventoryBalances.warehouseId, [whA.id, whB.id])
  );
  console.log('🧹 Cleaned existing balances for test warehouses');

  // 1. Create a Supplier
  const supplier = await SupplierService.createSupplier({
    code: `SUP-E2E-${Date.now()}`,
    name: 'Nhà cung cấp E2E Test',
    contactName: 'Mr. Tester',
    phone: '0901234567',
  });
  console.log('✅ Created Supplier:', supplier.code);

  // 3. Create Reservation (Simulation from BOQ)
  const reservation = await InventoryService.createReservation({
    materialId: material.id,
    warehouseId: whA.id,
    quantity: 50,
    productionOrderId: undefined, // Simulating a general reservation
    userId
  }).catch(e => console.log('Reservation failed as expected if no stock:', e.message));

  // 4. Goods Receipt (From Supplier)
  console.log('Receiving 100 units into Warehouse A...');
  const receipt = await InventoryService.receiveGoods({
    materialId: material.id,
    warehouseId: whA.id,
    quantity: 100,
    unitCost: 150000,
    referenceType: 'PO',
    referenceId: supplier.id.toString(),
    notes: 'Nhập hàng từ NCC',
    userId
  });
  console.log('✅ Received Goods:', receipt.ledger.movementNumber);

  // Retry Reservation now that we have stock
  console.log('Creating Reservation for 30 units...');
  const res2 = await InventoryService.createReservation({
    materialId: material.id,
    warehouseId: whA.id,
    quantity: 30,
    productionOrderId: undefined,
    userId
  });
  console.log('✅ Reservation created:', res2.id);

  // 5. Transfer
  console.log('Transferring 20 units from A to B...');
  const transfer = await InventoryService.transferStock({
    materialId: material.id,
    fromWarehouseId: whA.id,
    toWarehouseId: whB.id,
    quantity: 20,
    userId
  });
  console.log('✅ Transferred Stock:', transfer.outRes.ledger.movementNumber);

  // 6. Issue (Release some reservation)
  console.log('Issuing 10 units for production from A...');
  const issue = await InventoryService.issueMaterial({
    materialId: material.id,
    warehouseId: whA.id,
    quantity: 10,
    referenceType: 'PRODUCTION',
    userId
  });
  console.log('✅ Issued Material:', issue.ledger.movementNumber);

  // 7. Stocktake
  console.log('Creating Stocktake for Warehouse A...');
  const count = await InventoryCountService.createStocktake({
    warehouseId: whA.id,
    userId,
    notes: 'E2E Validation Count'
  });
  console.log('✅ Created Stocktake:', count.code);

  const items = await db.select().from(require('../src/db/schema').inventoryCountItems).where(eq(require('../src/db/schema').inventoryCountItems.countId, count.id));
  
  if (items.length > 0) {
    const item = items[0];
    const newQty = Number(item.systemQuantity) - 5; // Simulate losing 5 units
    console.log(`Logging variance for item ${item.id}: System ${item.systemQuantity} -> Actual ${newQty}`);
    await InventoryCountService.updateCountItem(item.id, newQty, 'Hao hụt tự nhiên');
    
    console.log('Completing Stocktake...');
    await InventoryCountService.completeStocktake(count.id, userId);
    console.log('✅ Stocktake Completed and Adjusted!');
  }

  console.log('--- ALL E2E TESTS PASSED ---');
  process.exit(0);
}

runE2E().catch(console.error);
