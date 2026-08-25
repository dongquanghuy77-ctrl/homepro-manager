import { NextResponse } from 'next/server';
import { db } from '@/db';
import { pwrTaskDependencies } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireAuth, ALL_ROLES } from '@/lib/auth';

// DELETE: Xóa 1 dependency theo ID bản ghi
export async function DELETE(
  request: Request,
  { params }: { params: { id: string; depId: string } }
) {
  const authResult = await requireAuth(request as any, ALL_ROLES);
  if (authResult.error) return authResult.error;

  const depId = parseInt(params.depId);
  if (isNaN(depId)) return NextResponse.json({ error: 'ID không hợp lệ' }, { status: 400 });

  await db.delete(pwrTaskDependencies).where(eq(pwrTaskDependencies.id, depId));
  return NextResponse.json({ ok: true });
}
