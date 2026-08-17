// /api/projects/[id]/boq-summary — returns BOQ + sections + items for a project
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { boqs, boqSections, boqItems, materials } from '@/db/schema';
import { eq, inArray } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

interface Params { params: { id: string } }

export async function GET(_req: NextRequest, { params }: Params) {
  const projectId = parseInt(params.id);
  if (isNaN(projectId)) return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });

  // Get all BOQs for project
  const projectBoqs = await db.select().from(boqs).where(eq(boqs.projectId, projectId));
  if (projectBoqs.length === 0) return NextResponse.json({ boqs: [], sections: [], items: [] });

  const boqId = projectBoqs[0].id;

  const sections = await db.select().from(boqSections).where(eq(boqSections.boqId, boqId));
  const items    = await db.select().from(boqItems).where(eq(boqItems.projectId, projectId));
  const matIds   = [...new Set(items.map(i => i.materialId).filter(Boolean))] as number[];
  const mats     = matIds.length > 0
    ? await db.select().from(materials).where(inArray(materials.id, matIds))
    : [];

  // Group items by section
  const sectionMap = sections.map(s => ({
    ...s,
    items: items.filter(i => i.sectionId === s.id),
    itemCount: items.filter(i => i.sectionId === s.id).length,
    totalQty: items.filter(i => i.sectionId === s.id).reduce((sum, i) => sum + Number(i.qtyRequired || 0), 0),
  }));

  return NextResponse.json({
    boq: projectBoqs[0],
    sections: sectionMap,
    itemCount: items.length,
    sectionCount: sections.length,
    linkedMaterials: matIds.length,
    items: items,
  });
}
