import { NextResponse } from 'next/server';
import { db } from '@/db';
import { pwrResources } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { requireAuth, ALL_ROLES } from '@/lib/auth';

export async function GET(request: Request) {
  const authResult = await requireAuth(request as any, ALL_ROLES);
  if (authResult.error) return authResult.error;
  const { session } = authResult;

  const resources = await db
    .select()
    .from(pwrResources)
    .where(and(eq(pwrResources.userId, session.id), eq(pwrResources.isActive, true)))
    .orderBy(pwrResources.resourceType, pwrResources.name);

  return NextResponse.json(resources);
}

export async function POST(request: Request) {
  const authResult = await requireAuth(request as any, ALL_ROLES);
  if (authResult.error) return authResult.error;
  const { session } = authResult;

  const body = await request.json();
  const { name, resourceType, capacityHoursPerDay, notes } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Tên tài nguyên là bắt buộc' }, { status: 400 });
  }
  const validTypes = ['MACHINE', 'PERSON', 'SPACE', 'TOOL'];
  if (resourceType && !validTypes.includes(resourceType)) {
    return NextResponse.json({ error: `resourceType phải là: ${validTypes.join(', ')}` }, { status: 400 });
  }

  const [resource] = await db.insert(pwrResources).values({
    userId:              session.id,
    name:                name.trim(),
    resourceType:        resourceType || 'MACHINE',
    capacityHoursPerDay: capacityHoursPerDay ? String(capacityHoursPerDay) : '8.0',
    notes:               notes || null,
    isActive:            true,
  }).returning();

  return NextResponse.json(resource, { status: 201 });
}

export async function PATCH(request: Request) {
  const authResult = await requireAuth(request as any, ALL_ROLES);
  if (authResult.error) return authResult.error;
  const { session } = authResult;

  const body = await request.json();
  const { id, ...updates } = body;
  if (!id) return NextResponse.json({ error: 'id là bắt buộc' }, { status: 400 });

  await db.update(pwrResources)
    .set(updates)
    .where(and(eq(pwrResources.id, id), eq(pwrResources.userId, session.id)));

  return NextResponse.json({ ok: true });
}
