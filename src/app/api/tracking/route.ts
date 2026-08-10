// src/app/api/tracking/route.ts
// API QR tracking: qu\u00e9t m\u00e3 theo c\u00f4ng \u0111o\u1ea1n CNC → D\u00e1n c\u1ea1nh → \u0110\u00f3ng g\u00f3i → L\u1eafp \u0111\u1eb7t

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { materialTrackingLogs } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { requireAuth, ALL_ROLES } from '@/lib/auth';

const VALID_STAGES = ['CNC', 'DAN_CANH', 'DONG_GOI', 'LAP_DAT'] as const;
const STAGE_LABELS: Record<string, string> = {
  CNC:      'C\u1eaft v\u00e1n CNC',
  DAN_CANH: 'D\u00e1n c\u1ea1nh',
  DONG_GOI: '\u0110\u00f3ng g\u00f3i',
  LAP_DAT:  'L\u1eafp \u0111\u1eb7t',
};

// GET /api/tracking?projectId=1&stage=CNC
export async function GET(req: NextRequest) {
  const { error } = await requireAuth(req, ALL_ROLES);
  if (error) return error;

  const projectId = req.nextUrl.searchParams.get('projectId');
  const stage     = req.nextUrl.searchParams.get('stage');

  let query = db.select().from(materialTrackingLogs).$dynamic();

  if (projectId) {
    query = query.where(eq(materialTrackingLogs.projectId, parseInt(projectId)));
  }

  const rows = await query.orderBy(desc(materialTrackingLogs.scannedAt)).limit(200);
  return NextResponse.json({ data: rows, total: rows.length });
}

// POST /api/tracking — Qu\u00e9t QR g\u1eedi c\u00f4ng \u0111o\u1ea1n
export async function POST(req: NextRequest) {
  const { error, session } = await requireAuth(req, ALL_ROLES);
  if (error) return error;

  const body = await req.json();
  const { projectId, bomLineId, qrCode, stage, note, location } = body;

  if (!stage || !VALID_STAGES.includes(stage as typeof VALID_STAGES[number])) {
    return NextResponse.json({
      error: `stage kh\u00f4ng h\u1ee3p l\u1ec7. Ph\u1ea3i l\u00e0: ${VALID_STAGES.join(', ')}`
    }, { status: 400 });
  }

  const [created] = await db.insert(materialTrackingLogs).values({
    projectId:    projectId ? parseInt(projectId) : null,
    bomLineId:    bomLineId ? parseInt(bomLineId) : null,
    qrCode:       qrCode ?? null,
    stage,
    stageLabel:   STAGE_LABELS[stage] ?? stage,
    scannedByName: session?.name ?? 'N/A',
    scannedById:   null, // username-based session, no numeric ID here
    location:     location ?? null,
    note:         note ?? null,
  }).returning();

  return NextResponse.json({ data: created }, { status: 201 });
}
