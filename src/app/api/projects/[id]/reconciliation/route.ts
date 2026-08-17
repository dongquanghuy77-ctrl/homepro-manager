import { NextRequest, NextResponse } from 'next/server';
import { BAO_MINH_RECONCILIATION } from '@/lib/bao-minh/reconciliation';
import { validateProject } from '@/lib/bao-minh/validation-engine';
import { evaluateGates } from '@/lib/bao-minh/gate-system';
export const dynamic = 'force-dynamic';
interface Params { params: { id: string } }
export async function GET(req: NextRequest, { params }: Params) {
  const id = parseInt(params.id);
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid' }, { status: 400 });
  
  const validation = await validateProject(id);
  
  const bdStatuses: Record<string, string> = {
    'BD-01': 'BLOCKED', 'BD-02': 'PENDING', 'BD-03': 'PENDING',
    'BD-04': 'BLOCKED', 'BD-05': 'PENDING', 'BD-06': 'PENDING', 'BD-07': 'PENDING',
  };
  
  const gates = evaluateGates({
    hasSources: (validation.results.find(r => r.check === 'SOURCE_DOCUMENTS')?.count || 0) > 0,
    hasBoq: (validation.results.find(r => r.check === 'BOQ_EXISTS')?.count || 0) > 0,
    hasMaterials: (validation.results.find(r => r.check === 'MATERIALS')?.count || 0) > 0,
    bdStatuses,
    hasConfirmedProcurement: true, // 4 phiếu nhập confirmed pending BD-06
  });
  
  const recon = BAO_MINH_RECONCILIATION;
  const stats = {
    MATCH: recon.filter(r => r.status === 'MATCH').length,
    VARIANCE: recon.filter(r => r.status === 'VARIANCE').length,
    MISSING: recon.filter(r => r.status === 'MISSING').length,
    CONFLICT: recon.filter(r => r.status === 'CONFLICT').length,
    EXTRA: recon.filter(r => r.status === 'EXTRA').length,
    UNRESOLVED: recon.filter(r => r.status === 'UNRESOLVED').length,
  };
  
  return NextResponse.json({
    projectId: id,
    validation,
    gates,
    reconciliation: { lines: recon, stats },
    generatedAt: new Date().toISOString(),
  });
}
