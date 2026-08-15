import { db } from '@/db';
import { inventoryCounts, inventoryCountItems, warehouses, materials } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import type { Metadata } from 'next';
import CountsUI from './CountsUI';

export const metadata: Metadata = { title: 'Kiểm kê Kho — HomePro Manager' };
export const dynamic = 'force-dynamic';

export default async function InventoryCountsPage() {
  const counts = await db
    .select({
      id: inventoryCounts.id,
      code: inventoryCounts.code,
      status: inventoryCounts.status,
      scheduledDate: inventoryCounts.scheduledDate,
      completedDate: inventoryCounts.completedDate,
      notes: inventoryCounts.notes,
      warehouseName: warehouses.name
    })
    .from(inventoryCounts)
    .leftJoin(warehouses, eq(inventoryCounts.warehouseId, warehouses.id))
    .orderBy(desc(inventoryCounts.createdAt));

  const countItems = await db
    .select({
      id: inventoryCountItems.id,
      countId: inventoryCountItems.countId,
      materialId: inventoryCountItems.materialId,
      locationId: inventoryCountItems.locationId,
      systemQuantity: inventoryCountItems.systemQuantity,
      countedQuantity: inventoryCountItems.countedQuantity,
      variance: inventoryCountItems.variance,
      status: inventoryCountItems.status,
      notes: inventoryCountItems.notes,
      materialCode: materials.code,
      materialName: materials.name,
      locationName: inventoryCountItems.locationId
    })
    .from(inventoryCountItems)
    .leftJoin(materials, eq(inventoryCountItems.materialId, materials.id));

  const allWarehouses = await db.select().from(warehouses);

  return <CountsUI initialCounts={counts} initialItems={countItems} warehouses={allWarehouses} />;
}
