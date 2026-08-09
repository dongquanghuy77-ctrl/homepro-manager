import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { boqItems } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get('project_id');
  const items = projectId
    ? await db.select().from(boqItems).where(eq(boqItems.projectId, parseInt(projectId)))
    : await db.select().from(boqItems);
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const result = await db.insert(boqItems).values({
    projectId: body.projectId,
    materialId: body.materialId || null,
    taskId: body.taskId || null,
    materialName: body.materialName,
    unit: body.unit || 'cái',
    unitPrice: body.unitPrice || 0,
    qtyRequired: body.qtyRequired || 0,
    qtyOrdered: body.qtyOrdered || 0,
    qtyReceived: body.qtyReceived || 0,
    category: body.category || null,
    notes: body.notes || null,
  }).returning();
  return NextResponse.json(result[0], { status: 201 });
}
