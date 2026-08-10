// src/app/api/bom/import/route.ts
// API Import BOQ th\u00f4 → ch\u1ea1y ETL Parser → l\u01b0u v\u00e0o production_bom_lines

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { productionBomLines } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireAuth, ADMIN_OR_MANAGER } from '@/lib/auth';
import { parseRawBOQ, validateBOQ } from '@/lib/boq-parser';
import type { RawBOQLine } from '@/lib/boq-parser';

// POST /api/bom/import
// Body: { projectId, rawLines: RawBOQLine[], replaceZone?: boolean }
export async function POST(req: NextRequest) {
  const { error } = await requireAuth(req, ADMIN_OR_MANAGER);
  if (error) return error;

  const body = await req.json();
  const { projectId, rawLines, replaceZone = false } = body as {
    projectId: number;
    rawLines: RawBOQLine[];
    replaceZone?: boolean;
  };

  if (!projectId) {
    return NextResponse.json({ error: 'projectId là bắt buộc' }, { status: 400 });
  }
  if (!Array.isArray(rawLines) || rawLines.length === 0) {
    return NextResponse.json({ error: 'rawLines phải là mảng không rỗng' }, { status: 400 });
  }

  // ── B\u01af\u1edaC 1: Ch\u1ea1y ETL Parser \u2014 Levenshtein + Zone + supply_type ──────────────
  const parsed  = parseRawBOQ(rawLines);
  const { valid, errors, warnings } = validateBOQ(parsed);

  if (!valid) {
    return NextResponse.json({
      error: 'Dữ liệu BOQ không hợp lệ',
      details: errors,
      warnings,
    }, { status: 422 });
  }

  // ── B\u01af\u1edaC 2: N\u1ebfu replaceZone = true, x\u00f3a d\u1eef li\u1ec7u c\u0169 c\u1ee7a c\u00e1c zone \u0111\u00f3 ─────────────
  if (replaceZone && parsed.length > 0) {
    const zones = [...new Set(parsed.map(p => p.zoneId))];
    for (const z of zones) {
      await db.delete(productionBomLines)
        .where(eq(productionBomLines.zoneId, z));
    }
  }

  // ── B\u01af\u1edaC 3: Insert v\u00e0o DB ─────────────────────────────────────────────────
  const toInsert = parsed.map((p, i) => ({
    projectId,
    zoneId:      p.zoneId || 'ZN-UNKNOWN',
    zoneName:    p.zoneName || p.zoneId || '',
    productName: p.productNameCorrected,
    unit:        p.unit || 'cái',
    qty:         p.qty,
    unitPrice:   p.unitPrice,
    total:       p.total,
    supplyType:  p.supplyType,
    note:        p.note || null,
    sttInZone:   p.stt,
  }));

  const inserted = await db.insert(productionBomLines).values(toInsert).returning({ id: productionBomLines.id });

  return NextResponse.json({
    success: true,
    imported:  inserted.length,
    warnings,
    corrected: parsed.filter((p, i) =>
      rawLines[i] && p.productNameCorrected !== rawLines[i].productName
    ).length,
    summary: {
      zones:      [...new Set(parsed.map(p => p.zoneId))],
      grandTotal: parsed.reduce((s, p) => s + p.total, 0),
    },
  }, { status: 201 });
}
