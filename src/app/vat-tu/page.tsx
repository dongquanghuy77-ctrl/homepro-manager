import { db } from '@/db';
import { materials, boqItems, projects } from '@/db/schema';
import type { Metadata } from 'next';
import MaterialsClient from '@/components/materials/MaterialsClient';

export const metadata: Metadata = { title: 'Vật tư — HomePro Manager' };
export const dynamic = 'force-dynamic';

export default async function MaterialsPage() {
  const allMaterials = await db.select().from(materials).orderBy(materials.category, materials.name);
  const allProjects = await db.select().from(projects);
  const allBoq = await db.select().from(boqItems);

  return <MaterialsClient initialMaterials={allMaterials} projects={allProjects} allBoq={allBoq} />;
}
