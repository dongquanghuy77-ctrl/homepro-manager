// src/app/api/bom/templates/route.ts
// ══════════════════════════════════════════════════════════════════════════════
// BOM Template API — Đọc file Excel từ public/bom/ và trả về JSON
//
// GET /api/bom/templates              → danh sách tất cả file BOM có sẵn
// GET /api/bom/templates?file=<name>  → dữ liệu BOM JSON cho 1 file
// GET /api/bom/templates?download=<name> → download raw Excel file
// ══════════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import * as XLSX from 'xlsx';

// ─────────────────────────────────────────────────────────────────────────────
// Types — BOM Sheet
// ─────────────────────────────────────────────────────────────────────────────
export interface BomItem {
  stt:      number;
  hangMuc:  string;   // Tên hạng mục / vật liệu
  soLuong:  number;   // Số lượng
  donVi:    string;   // Đơn vị (Tấm, m, Cái, Bộ, Chai, Cuộn...)
}

// ─────────────────────────────────────────────────────────────────────────────
// Types — Cut List Sheet
// ─────────────────────────────────────────────────────────────────────────────
export interface CutItem {
  id:         string;
  tenChiTiet: string;   // Tên chi tiết
  tenNhom:    string;   // Tên nhóm
  vatLieu:    string;   // Vật liệu (AC503MM, SC019...)
  doDay:      number;   // Độ dày (mm)
  chieuRong:  number;   // Chiều rộng (mm)
  chieuCao:   number;   // Chiều cao (mm)
}

// ─────────────────────────────────────────────────────────────────────────────
// Types — Template tổng hợp
// ─────────────────────────────────────────────────────────────────────────────
export interface BomTemplate {
  fileName:    string;
  displayName: string;   // Tên hiển thị (bỏ prefix "bom-" và suffix ".xlsx")
  bomItems:    BomItem[];
  cutItems:    CutItem[];
  sheets:      string[];
  totalQty:    number;   // Tổng số hạng mục trong BOM sheet
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const BOM_DIR = join(process.cwd(), 'public', 'bom');

/** Tên hiển thị: bom-KỆ TIVI.xlsx → KỆ TIVI */
function toDisplayName(fileName: string): string {
  return fileName
    .replace(/^bom-/i, '')
    .replace(/\.xlsx$/i, '')
    .trim();
}

/** Đọc sheet BOM → BomItem[] */
function parseBomSheet(ws: XLSX.WorkSheet): BomItem[] {
  const rows = XLSX.utils.sheet_to_json<(string | number)[]>(ws, {
    header: 1,
    defval: '',
  });

  const items: BomItem[] = [];
  for (let i = 1; i < rows.length; i++) {   // bỏ header row 0
    const row = rows[i];
    const stt     = Number(row[0]);
    const hangMuc = String(row[1] ?? '').trim();
    const soLuong = Number(row[2]) || 0;
    const donVi   = String(row[3] ?? '').trim();
    if (!hangMuc) continue;                   // bỏ dòng rỗng
    items.push({ stt: isNaN(stt) ? i : stt, hangMuc, soLuong, donVi });
  }
  return items;
}

/** Đọc sheet Cut List → CutItem[] */
function parseCutSheet(ws: XLSX.WorkSheet): CutItem[] {
  const rows = XLSX.utils.sheet_to_json<(string | number)[]>(ws, {
    header: 1,
    defval: '',
  });

  const items: CutItem[] = [];
  for (let i = 1; i < rows.length; i++) {   // bỏ header row 0
    const row = rows[i];
    const id         = String(row[0] ?? '').trim();
    const tenChiTiet = String(row[1] ?? '').trim();
    const tenNhom    = String(row[2] ?? '').trim();
    const vatLieu    = String(row[3] ?? '').trim();
    const doDay      = Number(row[4]) || 0;
    const chieuRong  = Number(row[5]) || 0;
    const chieuCao   = Number(row[6]) || 0;
    if (!tenChiTiet) continue;
    items.push({ id, tenChiTiet, tenNhom, vatLieu, doDay, chieuRong, chieuCao });
  }
  return items;
}

/** Đọc 1 file Excel → BomTemplate */
function readBomFile(fileName: string): BomTemplate | null {
  const filePath = join(BOM_DIR, fileName);
  if (!existsSync(filePath)) return null;

  try {
    const buf  = readFileSync(filePath);
    const wb   = XLSX.read(buf, { type: 'buffer' });
    const sheets = wb.SheetNames;

    // Sheet đầu tiên = BOM, sheet thứ hai = Cut List (nếu có)
    const bomWs  = wb.Sheets[sheets[0]];
    const cutWs  = sheets[1] ? wb.Sheets[sheets[1]] : null;

    const bomItems = parseBomSheet(bomWs);
    const cutItems = cutWs ? parseCutSheet(cutWs) : [];

    return {
      fileName,
      displayName: toDisplayName(fileName),
      bomItems,
      cutItems,
      sheets,
      totalQty: bomItems.length,
    };
  } catch (err) {
    console.error(`[BomTemplate] Lỗi đọc file "${fileName}":`, err);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET Handler
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const file     = searchParams.get('file');
  const download = searchParams.get('download');

  // ── Download raw Excel file ──────────────────────────────────────────────
  if (download) {
    const safe = download.replace(/\.\./g, '').replace(/[/\\]/g, '');
    const filePath = join(BOM_DIR, safe);
    if (!existsSync(filePath)) {
      return NextResponse.json({ error: 'File không tồn tại' }, { status: 404 });
    }
    const buf = readFileSync(filePath);
    return new NextResponse(buf, {
      headers: {
        'Content-Type':        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(safe)}`,
        'Content-Length':      String(buf.length),
      },
    });
  }

  // ── Đọc 1 template cụ thể ─────────────────────────────────────────────────
  if (file) {
    const safe = file.replace(/\.\./g, '').replace(/[/\\]/g, '');
    if (!safe.endsWith('.xlsx')) {
      return NextResponse.json({ error: 'Chỉ hỗ trợ file .xlsx' }, { status: 400 });
    }
    const template = readBomFile(safe);
    if (!template) {
      return NextResponse.json({ error: `File "${safe}" không tồn tại` }, { status: 404 });
    }
    return NextResponse.json(template, {
      headers: { 'Cache-Control': 'public, max-age=60' },
    });
  }

  // ── Liệt kê tất cả template ───────────────────────────────────────────────
  if (!existsSync(BOM_DIR)) {
    return NextResponse.json({ files: [] });
  }

  const files = readdirSync(BOM_DIR)
    .filter((f) => f.toLowerCase().endsWith('.xlsx'))
    .map((f) => ({
      fileName:    f,
      displayName: toDisplayName(f),
    }));

  return NextResponse.json({ files }, {
    headers: { 'Cache-Control': 'public, max-age=30' },
  });
}
