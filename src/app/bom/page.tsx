// src/app/bom/page.tsx — Server Component
import { db } from '@/db';
import { productionBomLines, projects } from '@/db/schema';
import type { Metadata } from 'next';
import BomClient from './BomClient';

export const metadata: Metadata = { title: 'BOQ / BOM — HomePro Manager' };
export const dynamic = 'force-dynamic';

export default async function BomPage() {
  const allProjects  = await db.select({
    id: projects.id, code: projects.code, name: projects.name, status: projects.status,
  }).from(projects).orderBy(projects.code);

  const allBomLines  = await db.select().from(productionBomLines)
    .orderBy(productionBomLines.zoneId, productionBomLines.sttInZone);

  return <BomClient projects={allProjects} initialBomLines={allBomLines} />;
}
