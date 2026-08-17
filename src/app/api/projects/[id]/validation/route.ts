import { NextRequest, NextResponse } from 'next/server';
import { validateProject } from '@/lib/bao-minh/validation-engine';
export const dynamic = 'force-dynamic';
interface Params { params: { id: string } }
export async function GET(_req: NextRequest, { params }: Params) {
  const id = parseInt(params.id);
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  const result = await validateProject(id);
  return NextResponse.json(result);
}
