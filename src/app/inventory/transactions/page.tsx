import { db } from '@/db';
import { inventoryTransactions, materials, warehouses } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import type { Metadata } from 'next';
import TransactionsUI from './TransactionsUI';

export const metadata: Metadata = { title: 'Lịch sử Kho — HomePro Manager' };
export const dynamic = 'force-dynamic';

export default async function InventoryTransactionsPage() {
  const allTx = await db
    .select({
      id: inventoryTransactions.id,
      movementNumber: inventoryTransactions.movementNumber,
      movementType: inventoryTransactions.movementType,
      quantity: inventoryTransactions.quantity,
      unitCost: inventoryTransactions.unitCost,
      totalCost: inventoryTransactions.totalCost,
      movementDate: inventoryTransactions.movementDate,
      materialName: materials.name,
      warehouseName: warehouses.name
    })
    .from(inventoryTransactions)
    .leftJoin(materials, eq(inventoryTransactions.materialId, materials.id))
    .leftJoin(warehouses, eq(inventoryTransactions.warehouseId, warehouses.id))
    .orderBy(desc(inventoryTransactions.movementDate));

  const allMats = await db.select().from(materials);
  const allWh = await db.select().from(warehouses);

  return <TransactionsUI transactions={allTx} materials={allMats} warehouses={allWh} />;
}
