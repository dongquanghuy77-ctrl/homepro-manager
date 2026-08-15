import { db } from '@/db';
import { warehouses } from '@/db/schema';
import { desc } from 'drizzle-orm';
import type { Metadata } from 'next';
import WarehouseUI from './WarehouseUI';

export const metadata: Metadata = { title: 'Sơ đồ Kho — HomePro Manager' };
export const dynamic = 'force-dynamic';

export default async function InventoryWarehousesPage() {
  const allWh = await db.select().from(warehouses);

  // Nesting logic simplified since zones and locations are removed
  const nested = allWh.map(wh => {
    return { ...wh, zones: [] };
  });

  return <WarehouseUI initialWarehouses={nested} />;
}
