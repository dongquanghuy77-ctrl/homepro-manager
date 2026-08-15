import { db } from '@/db';
import { inventoryReservations, materials, warehouses } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import type { Metadata } from 'next';
import ReservationsUI from './ReservationsUI';

export const metadata: Metadata = { title: 'Đặt giữ Vật tư — HomePro Manager' };
export const dynamic = 'force-dynamic';

export default async function ReservationsPage() {
  const reservations = await db
    .select({
      id: inventoryReservations.id,
      quantity: inventoryReservations.quantity,
      status: inventoryReservations.status,
      reservedAt: inventoryReservations.reservedAt,
      expiresAt: inventoryReservations.expiresAt,
      referenceType: inventoryReservations.referenceType,
      referenceId: inventoryReservations.referenceId,
      notes: inventoryReservations.notes,
      materialName: materials.name,
      materialCode: materials.code,
      warehouseName: warehouses.name
    })
    .from(inventoryReservations)
    .leftJoin(materials, eq(inventoryReservations.materialId, materials.id))
    .leftJoin(warehouses, eq(inventoryReservations.warehouseId, warehouses.id))
    .orderBy(desc(inventoryReservations.reservedAt));

  return <ReservationsUI initialReservations={reservations} />;
}
