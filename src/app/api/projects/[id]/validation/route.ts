import { NextRequest, NextResponse } from 'next/server';
import { validateProject } from '@/lib/bao-minh/validation-engine';
import { requireAuth, ALL_ROLES } from '@/lib/auth';

export const dynamic = 'force-dynamic';

interface Params { params: { id: string } }

export async function GET(req: NextRequest, { params }: Params) {
  const { error } = await requireAuth(req, ALL_ROLES);
  if (error) return error;

  const id = parseInt(params.id);
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  const result = await validateProject(id);
  return NextResponse.json(result);
}
