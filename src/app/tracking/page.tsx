// src/app/tracking/page.tsx — Server Component
import { db } from '@/db';
import { materialTrackingLogs, productionBomLines, projects } from '@/db/schema';
import type { Metadata } from 'next';
import TrackingClient from './TrackingClient';
import { desc } from 'drizzle-orm';

export const metadata: Metadata = { title: 'Theo dõi QR — HomePro Manager' };
export const dynamic = 'force-dynamic';

export default async function TrackingPage() {
  const allProjects = await db.select({
    id: projects.id, code: projects.code, name: projects.name, status: projects.status,
  }).from(projects).orderBy(projects.code);

  const recentLogs = await db.select().from(materialTrackingLogs)
    .orderBy(desc(materialTrackingLogs.scannedAt))
    .limit(200);

  const bomLines = await db.select({
    id: productionBomLines.id,
    projectId: productionBomLines.projectId,
    zoneId: productionBomLines.zoneId,
    productName: productionBomLines.productName,
  }).from(productionBomLines);

  return <TrackingClient projects={allProjects} initialLogs={recentLogs} bomLines={bomLines} />;
}
