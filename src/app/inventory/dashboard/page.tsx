import { db } from '@/db';
import { inventoryBalances, materials, warehouses, inventoryTransactions } from '@/db/schema';
import { eq, sum, desc, sql } from 'drizzle-orm';
import type { Metadata } from 'next';
import DashboardUI from './DashboardUI';

export const metadata: Metadata = { title: 'Tổng quan Kho — HomePro Manager' };
export const dynamic = 'force-dynamic';

export default async function InventoryDashboardPage() {
  const balances = await db
    .select({
      id: inventoryBalances.id,
      quantity: inventoryBalances.quantity,
      availableQuantity: inventoryBalances.availableQuantity,
      unitCost: inventoryBalances.unitCost,
      materialName: materials.name,
      materialCode: materials.code,
      materialCategory: materials.category,
      warehouseName: warehouses.name
    })
    .from(inventoryBalances)
    .leftJoin(materials, eq(inventoryBalances.materialId, materials.id))
    .leftJoin(warehouses, eq(inventoryBalances.warehouseId, warehouses.id));

  const recentTx = await db
    .select({
      id: inventoryTransactions.id,
      movementNumber: inventoryTransactions.movementNumber,
      movementType: inventoryTransactions.movementType,
      quantity: inventoryTransactions.quantity,
      totalCost: inventoryTransactions.totalCost,
      movementDate: inventoryTransactions.movementDate,
      materialName: materials.name
    })
    .from(inventoryTransactions)
    .leftJoin(materials, eq(inventoryTransactions.materialId, materials.id))
    .orderBy(desc(inventoryTransactions.movementDate))
    .limit(10);

  return <DashboardUI balances={balances} recentTx={recentTx} />;
}
