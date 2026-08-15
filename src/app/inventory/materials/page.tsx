import { db } from '@/db';
import { materials } from '@/db/schema';
import type { Metadata } from 'next';
import MaterialsUI from './MaterialsUI';

export const metadata: Metadata = { title: 'Danh mục Vật tư — HomePro Manager' };
export const dynamic = 'force-dynamic';

export default async function InventoryMaterialsPage() {
  const allMaterials = await db.select().from(materials).orderBy(materials.category, materials.name);

  return <MaterialsUI initialMaterials={allMaterials} />;
}
