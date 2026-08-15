import { db } from '@/db';
import { suppliers } from '@/db/schema';
import type { Metadata } from 'next';
import SuppliersUI from './SuppliersUI';

export const metadata: Metadata = { title: 'Nhà cung cấp — HomePro Manager' };
export const dynamic = 'force-dynamic';

export default async function SuppliersPage() {
  const supplierList = await db.select().from(suppliers);
  return <SuppliersUI initialSuppliers={supplierList} />;
}
