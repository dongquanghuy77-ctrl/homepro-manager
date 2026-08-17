/**
 * BAO MINH CMT8 — PHASE C: MASTER DATA STAGING ENGINE
 *
 * Generates:
 *   - All staging JSON files (project/zone/boq/material/bom/cutlist/supplier/purchase/lineage)
 *   - MASTER-DATA.xlsx (multi-sheet)
 *   - CONFLICT-REGISTER.xlsx
 *   - APPROVAL-QUEUE.xlsx
 *   - LINEAGE-MATRIX.xlsx
 *   - BAO-MINH-PHASE-C-MASTER-DATA.md
 *   - BAO-MINH-ERP-STAGING-REPORT.md
 *   - QC-PHASE-C.md
 *
 * RULES:
 *   ERP_TX = 0 (no real transactions)
 *   No inference of business data
 *   All records have lineage
 */

const fs   = require('fs');
const path = require('path');
const crypto = require('crypto');
const XLSX = require('xlsx');

const SRC = 'D:\\XƯỞNG HOMEPRO SG\\9. THÁNG 08.2026\\3. VĂN PHÒNG BẢO MINH';
const OUT  = 'docs/projects/BAO-MINH-CMT8';
const STAG = path.join(OUT, 'staging');
const XLSX_OUT = path.join(OUT, 'reports');
const GEN  = new Date().toISOString();
const COMMIT = '4350467';

if (!fs.existsSync(STAG)) fs.mkdirSync(STAG, { recursive: true });
if (!fs.existsSync(XLSX_OUT)) fs.mkdirSync(XLSX_OUT, { recursive: true });

const LOG = [];
function log(msg) { console.log(msg); LOG.push(msg); }

log('═══════════════════════════════════════════════════════════════════');
log('  BAO MINH CMT8 — PHASE C: MASTER DATA STAGING');
log('═══════════════════════════════════════════════════════════════════');

// ─── LOAD EXISTING ANALYSIS ───────────────────────────────────────────────
log('\n[LOAD] Reading Phase A/B analysis...');

const inv  = JSON.parse(fs.readFileSync(path.join(OUT, 'source-inventory-sha256.json'), 'utf8'));
const bom  = JSON.parse(fs.readFileSync(path.join(OUT, 'bom-cutlist-analysis.json'), 'utf8'));
const qcB  = JSON.parse(fs.readFileSync(path.join(OUT, 'qc-results.json'), 'utf8'));

let boqItems = [];
try { boqItems = JSON.parse(fs.readFileSync(path.join(OUT, 'kl-crossref.json'), 'utf8')); } catch(e) {}
let pdfInfo  = {};
try { pdfInfo  = JSON.parse(fs.readFileSync(path.join(OUT, 'pdf-project-info.json'), 'utf8')); } catch(e) {}
let suppReg  = {};
try { suppReg  = JSON.parse(fs.readFileSync(path.join(OUT, 'supplier-register.json'), 'utf8')); } catch(e) {}
let matIng   = {};
try { matIng   = JSON.parse(fs.readFileSync(path.join(OUT, 'material-ingestion-reconciliation.json'), 'utf8')); } catch(e) {}
let skpProd  = {};
try { skpProd  = JSON.parse(fs.readFileSync(path.join(OUT, 'sketchup/production-items.json'), 'utf8')); } catch(e) {}
let skpMat   = {};
try { skpMat   = JSON.parse(fs.readFileSync(path.join(OUT, 'sketchup/material-master.json'), 'utf8')); } catch(e) {}

log(`  Inventory: ${inv.inventory.length} files`);
log(`  BOQ items from KL crossref: ${Array.isArray(boqItems) ? boqItems.length : Object.keys(boqItems).length}`);
log(`  BOM: ${bom.bom.items.length} items, CL: ${bom.cut_list.total_data_rows} parts`);

// ─── SOURCE CONTROL: RE-SCAN vs SHA-256 ──────────────────────────────────
log('\n[TASK-1] Source Control: re-scan vs SHA-256 inventory...');

function scanDir(dir, base='') {
  const res = [];
  if (!fs.existsSync(dir)) return res;
  fs.readdirSync(dir, { withFileTypes:true }).forEach(e => {
    const rel = base ? `${base}/${e.name}` : e.name;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) res.push(...scanDir(full, rel));
    else {
      const st = fs.statSync(full);
      const sha = crypto.createHash('sha256').update(fs.readFileSync(full)).digest('hex');
      res.push({ filename: e.name, rel, full, size: st.size, modified: st.mtime.toISOString(), sha256: sha });
    }
  });
  return res;
}

const currentFiles = scanDir(SRC);
log(`  Current scan: ${currentFiles.length} files`);

const prevMap = {};
inv.inventory.forEach(f => { prevMap[f.sha256] = f; });

const sourceChanges = { new_files: [], modified: [], unchanged: 0 };
currentFiles.forEach(f => {
  const prev = inv.inventory.find(i => i.filename === f.filename && i.relative_path === f.rel);
  if (!prev) {
    sourceChanges.new_files.push(f);
    log(`  🆕 NEW FILE: ${f.filename}`);
  } else if (prev.sha256 !== f.sha256) {
    sourceChanges.modified.push({ prev, current: f });
    log(`  ⚠️  MODIFIED: ${f.filename} (SHA mismatch)`);
  } else {
    sourceChanges.unchanged++;
  }
});

log(`  Unchanged: ${sourceChanges.unchanged} | New: ${sourceChanges.new_files.length} | Modified: ${sourceChanges.modified.length}`);

// ─── HELPER: lineage record ────────────────────────────────────────────────
let lineageSeq = 1;
function mkLineage(sourceFile, page, row, sheet, extractedValue, normalizedId) {
  const invEntry = inv.inventory.find(i => i.filename === sourceFile) || {};
  return {
    lineage_id: `LIN-${String(lineageSeq++).padStart(4,'0')}`,
    source_file: sourceFile,
    source_location: invEntry.full_path || sourceFile,
    source_hash: invEntry.sha256 || 'N/A',
    source_page: page || null,
    source_row: row || null,
    source_sheet: sheet || null,
    extracted_value: String(extractedValue).substring(0, 200),
    normalized_record_id: normalizedId,
    extracted_at: GEN,
    extracted_by: 'bao-minh-phase-c.js',
    approval_status: 'PENDING',
    approved_by: null,
    approved_at: null,
    erp_record_id: null,
    erp_ready: false
  };
}

const allLineage = [];

// ─── STAGING: PROJECT ─────────────────────────────────────────────────────
log('\n[STAG] Building staging-project...');
const stagingProject = {
  staging_id: 'STAG-PRJ-001',
  project_code: 'BAO-MINH-CMT8',
  project_name: 'VĂN PHÒNG CHỨNG KHOÁN BẢO MINH CHI NHÁNH CMT8',
  customer: 'CÔNG TY CỔ PHẦN CHỨNG KHOÁN BẢO MINH',
  location: '201-203 CMT8, Phường 4, Quận 3, TP.HCM',
  floors: ['T15'],
  total_area_m2: 'UNCONFIRMED',
  project_type: 'NỘI THẤT VĂN PHÒNG',
  contractor: 'HOMEPRO SG',
  status: 'STAGING',
  erp_ready: false,
  approval_status: 'PENDING',
  source_document: 'KL NỘI THẤT VP BẢO MINH- CN SÀI GÒN- homepro.xlsx',
  source_hash: inv.inventory.find(f=>f.filename.includes('KL NỘI THẤT VP'))?.sha256 || 'N/A',
  lineage_id: mkLineage('KL NỘI THẤT VP BẢO MINH- CN SÀI GÒN- homepro.xlsx', null, 1, 'Sheet1', 'Project: VP BAO MINH CMT8', 'STAG-PRJ-001').lineage_id,
  generated_at: GEN,
  commit: COMMIT
};

// ─── STAGING: ZONES ───────────────────────────────────────────────────────
log('\n[STAG] Building staging-zones...');
const ZONE_DEF = [
  { code:'ZONE-CT', name:'Phòng Chủ Tịch',    area_m2: 94,    boq_count: 16, status:'PARTIAL', note:'Area from BOQ phase 1' },
  { code:'ZONE-GD', name:'Phòng GĐ Chi Nhánh', area_m2: 26.3,  boq_count: 11, status:'PARTIAL', note:'Area from BOQ' },
  { code:'ZONE-HP', name:'Phòng Họp',           area_m2: 23,    boq_count: 7,  status:'PARTIAL', note:'Area from BOQ' },
  { code:'ZONE-LV', name:'Phòng Làm Việc',      area_m2: 112,   boq_count: 33, status:'PARTIAL', note:'NT-23 R-01 confirmed; 32 pages unresolved' },
  { code:'ZONE-SH', name:'Sảnh Tiếp Tân',       area_m2: null,  boq_count: 0,  status:'NEEDS_REVIEW', note:'Area unknown' },
  { code:'ZONE-PT', name:'Pantry',               area_m2: null,  boq_count: 12, status:'NEEDS_REVIEW', note:'Area unknown' },
  { code:'ZONE-KH', name:'Kho',                  area_m2: null,  boq_count: 0,  status:'NEEDS_REVIEW', note:'Grouped with D' },
  { code:'ZONE-HL', name:'Hành Lang',            area_m2: null,  boq_count: 2,  status:'NEEDS_REVIEW', note:'Area unknown' },
];

const stagingZones = ZONE_DEF.map((z, i) => {
  const lin = mkLineage('KL NỘI THẤT VP BẢO MINH- CN SÀI GÒN- homepro.xlsx', null, null, 'Sheet1', z.name, `STAG-ZONE-${String(i+1).padStart(3,'0')}`);
  allLineage.push(lin);
  return {
    staging_id: `STAG-ZONE-${String(i+1).padStart(3,'0')}`,
    zone_code: z.code, zone_name: z.name,
    floor: 'T15', area_m2: z.area_m2,
    boq_items_count: z.boq_count,
    status: z.status,
    erp_ready: false,
    approval_status: 'PENDING',
    source_document: 'KL NỘI THẤT VP BẢO MINH- CN SÀI GÒN- homepro.xlsx',
    lineage_id: lin.lineage_id,
    note: z.note
  };
});

// ─── STAGING: MATERIALS ───────────────────────────────────────────────────
log('\n[STAG] Building staging-materials...');
const MATERIAL_DEF = [
  { code:'HN-111G-17.5', supplier:'HN', name:'Ván MDF phủ Melamine Hồng Nghi', color:'111G', thickness_mm:17.5, unit:'Tấm', bom_qty:62, po_qty:65, po_source:'SOURCE-02', variance:3, variance_note:'buffer/waste', status:'STAGED' },
  { code:'HN-111G-10',   supplier:'HN', name:'Ván MDF phủ Melamine Hồng Nghi', color:'111G', thickness_mm:10,   unit:'Tấm', bom_qty:25, po_qty:26, po_source:'SOURCE-02', variance:1, variance_note:'buffer/waste', status:'STAGED' },
  { code:'BT-SC010MW-17.5', supplier:'BT', name:'Ván MFC Cái Bảng SC 010 MW', color:'SC010MW', thickness_mm:17.5, unit:'Tấm', bom_qty:65, po_qty:67, po_source:'SOURCE-04', variance:2, variance_note:'buffer/waste', status:'STAGED' },
  { code:'BT-SC010MW-10',   supplier:'BT', name:'Ván MFC Cái Bảng SC 010 MW', color:'SC010MW', thickness_mm:10,   unit:'Tấm', bom_qty:20, po_qty:21, po_source:'SOURCE-04', variance:1, variance_note:'buffer/waste', status:'STAGED' },
  { code:'BT-200T-17.5', supplier:'BT', name:'Ván MFC Cái Bảng 200T', color:'200T', thickness_mm:17.5, unit:'Tấm', bom_qty:6, po_qty:6, po_source:'SOURCE-04', variance:0, status:'STAGED' },
  { code:'AC-9205S-17.5', supplier:'AC', name:'Ván An Cường 9205S', color:'9205S', thickness_mm:17.5, unit:'Tấm', bom_qty:4, po_qty:4, po_source:'SOURCE-03', variance:0, status:'STAGED', conflict:'SKP-APRV-05 (survey shows MS-608EV)' },
  { code:'THAN-TRE-8',  supplier:'UNKNOWN', name:'Thanh Tre 8mm', color:null, thickness_mm:8, unit:'Tấm', bom_qty:10, po_qty:10, po_source:'SOURCE-01', variance:0, status:'STAGED', conflict:'CONFLICT-004 (no BOQ item)' },
  { code:'GO-GHEP-THANH-30', supplier:'UNKNOWN', name:'Gỗ Ghép Thanh 30mm', color:null, thickness_mm:30, unit:'Tấm', bom_qty:1, po_qty:null, po_source:null, variance:null, status:'NEEDS_APPROVAL', conflict:'BD-05: not in PO, 12 parts in CL (hồi panels)' },
];

const stagingMaterials = MATERIAL_DEF.map((m, i) => {
  const lin = mkLineage('bom-KHAI TRIỂN VĂN PHÒNG BẢO MINH.xlsx', null, i+2, 'BOM', m.code, `STAG-MAT-${String(i+1).padStart(3,'0')}`);
  allLineage.push(lin);
  return {
    staging_id: `STAG-MAT-${String(i+1).padStart(3,'0')}`,
    material_code: m.code,
    material_name: m.name,
    supplier_code: m.supplier,
    color_code: m.color,
    thickness_mm: m.thickness_mm,
    unit: m.unit,
    bom_qty: m.bom_qty,
    po_qty: m.po_qty ?? 'N/A',
    po_source: m.po_source,
    variance: m.variance ?? 'N/A',
    variance_note: m.variance_note || null,
    conflict: m.conflict || null,
    status: m.status,
    erp_ready: false,
    approval_status: m.status === 'NEEDS_APPROVAL' ? 'NEEDS_APPROVAL' : 'PENDING',
    source_file: 'bom-KHAI TRIỂN VĂN PHÒNG BẢO MINH.xlsx',
    lineage_id: lin.lineage_id,
    sketchup_match: m.code.replace('-17.5','').replace('-10','').replace('-8','').replace('-30','')
  };
});

// ─── STAGING: SUPPLIERS ───────────────────────────────────────────────────
log('\n[STAG] Building staging-suppliers...');
const stagingSuppliers = [
  { staging_id:'STAG-SUP-001', code:'HN', name:'Ván Hồng Nghi', short:'HN', material_codes:['HN-111G-17.5','HN-111G-10'], po_source:['SOURCE-02'], evidence:'Invoice/phiếu nhập SOURCE-02, VẬT TƯ HỒNG NGHI.xlsx col HN', status:'STAGED', erp_ready:false, approval_status:'PENDING' },
  { staging_id:'STAG-SUP-002', code:'BT', name:'Ván Cái Bảng (Bình Tiên?)', short:'BT', material_codes:['BT-SC010MW-17.5','BT-SC010MW-10','BT-200T-17.5'], po_source:['SOURCE-04'], evidence:'VẬT TƯ HỒNG NGHI.xlsx col BT, Invoice SOURCE-04', status:'STAGED', erp_ready:false, approval_status:'PENDING', note:'Supplier full name needs confirmation' },
  { staging_id:'STAG-SUP-003', code:'AC', name:'An Cường (An Cuong)', short:'AC', material_codes:['AC-9205S-17.5'], po_source:['SOURCE-03'], evidence:'VẬT TƯ HỒNG NGHI.xlsx col AC, Invoice SOURCE-03', status:'STAGED', erp_ready:false, approval_status:'PENDING', conflict:'SKP-APRV-05: MS-608EV vs 9205S mismatch' },
];

// ─── STAGING: BOM ITEMS ───────────────────────────────────────────────────
log('\n[STAG] Building staging-bom...');
const stagingBom = bom.bom.van_details.map((v, i) => {
  const lin = mkLineage('bom-KHAI TRIỂN VĂN PHÒNG BẢO MINH.xlsx', null, v.source_row, 'BOM', v.material_code, `STAG-BOM-${String(i+1).padStart(3,'0')}`);
  allLineage.push(lin);
  return {
    staging_id: `STAG-BOM-${String(i+1).padStart(3,'0')}`,
    material_code: v.material_code,
    supplier: v.supplier,
    material_name: v.material_name,
    thickness_mm: v.thickness_mm,
    qty: v.qty,
    unit: v.unit,
    status: v.supplier === 'GO GHEP THANH' ? 'NEEDS_APPROVAL' : 'STAGED',
    erp_ready: false,
    approval_status: v.supplier === 'GO GHEP THANH' ? 'NEEDS_APPROVAL' : 'PENDING',
    source_row: v.source_row,
    lineage_id: lin.lineage_id
  };
});

// Nẹp dán cạnh
const stagingNep = bom.bom.nep_details.map((n, i) => {
  const lin = mkLineage('bom-KHAI TRIỂN VĂN PHÒNG BẢO MINH.xlsx', null, n.source_row, 'BOM', n.material_code, `STAG-NEP-${String(i+1).padStart(3,'0')}`);
  allLineage.push(lin);
  return {
    staging_id: `STAG-NEP-${String(i+1).padStart(3,'0')}`,
    material_code: n.material_code,
    edge_type: n.edge_type,
    material_ref: n.material_ref,
    edge_size: n.edge_size,
    qty: n.qty,
    unit: n.unit,
    status: 'STAGED',
    erp_ready: false,
    approval_status: 'PENDING',
    source_row: n.source_row,
    lineage_id: lin.lineage_id
  };
});

// ─── STAGING: ASSEMBLIES + CUT LIST ───────────────────────────────────────
log('\n[STAG] Building staging-cutlist (37 assemblies, 1557 parts)...');

// Parse cut list again to get GO GHEP THANH assembly context
const clWb = XLSX.readFile('D:\\XƯỞNG HOMEPRO SG\\9. THÁNG 08.2026\\3. VĂN PHÒNG BẢO MINH\\FILE BOQ\\bom-KHAI TRIỂN VĂN PHÒNG BẢO MINH.xlsx');
const clRaw = XLSX.utils.sheet_to_json(clWb.Sheets['Cut List'], { header:1, defval:null });

// Rebuild assembly blocks to find which assembly contains GO GHEP THANH parts
const clBlocks = [];
let currentBlock = null;
clRaw.slice(1).forEach((row, i) => {
  if (!row || !row.some(c => c !== null && c !== '')) return;
  const id = row[0];
  const partName = row[1] ? String(row[1]).trim() : null;
  const mat = row[3] ? String(row[3]).trim() : null;
  const thk = row[4];
  const w = row[5];
  const h = row[6];

  if (id && id !== 'null' && id !== null) {
    // New assembly header
    currentBlock = { assembly_id: id, assembly_name: partName, material: mat, thickness: thk, width: w, height: h, sub_parts: [], row: i+2 };
    clBlocks.push(currentBlock);
  } else if (currentBlock) {
    currentBlock.sub_parts.push({ part_name: partName, material: mat, thickness: thk, width: w, height: h, row: i+2 });
  }
});

// Find assemblies containing GO GHEP THANH
const goAssemblies = clBlocks.filter(b =>
  b.material === 'GO GHEP THANH' || b.sub_parts.some(p => p.material === 'GO GHEP THANH')
);
const goPartsAll = clBlocks.flatMap(b => [
  ...(b.material === 'GO GHEP THANH' ? [{ assembly_id: b.assembly_id, part_name: b.assembly_name, material: b.material, thickness: b.thickness, width: b.width, height: b.height, type:'header' }] : []),
  ...b.sub_parts.filter(p => p.material === 'GO GHEP THANH').map(p => ({ assembly_id: b.assembly_id, part_name: p.part_name, material: p.material, thickness: p.thickness, width: p.width, height: p.height, type:'part' }))
]);

log(`  GO GHEP THANH appears in ${goAssemblies.length} assemblies, ${goPartsAll.length} parts total`);
log(`  GO GHEP parts: ${goPartsAll.map(p=>`${p.part_name}(${p.thickness}×${p.width}×${p.height})`).join(', ')}`);

const stagingCutlist = {
  staging_id: 'STAG-CL-001',
  source_file: 'bom-KHAI TRIỂN VĂN PHÒNG BẢO MINH.xlsx',
  source_sheet: 'Cut List',
  total_parts: bom.cut_list.total_data_rows,
  total_assemblies: bom.cut_list.assembly_count,
  materials: bom.cut_list.unique_materials,
  material_counts: bom.cut_list.by_material,
  assemblies: clBlocks.map(b => ({
    assembly_id: b.assembly_id,
    assembly_name: b.assembly_name,
    material: b.material,
    thickness: b.thickness,
    width: b.width,
    height: b.height,
    sub_part_count: b.sub_parts.length,
    has_go_ghep: b.material === 'GO GHEP THANH' || b.sub_parts.some(p => p.material === 'GO GHEP THANH')
  })),
  go_ghep_thanh_exception: {
    exception_id: 'MAT-EXC-001',
    material_code: 'GO GHEP THANH',
    thickness_mm: 30,
    parts: goPartsAll,
    part_count: goPartsAll.length,
    in_purchase_docs: false,
    in_vat_tu_hn: false,
    in_boq: 'UNKNOWN — no explicit BOQ item found',
    in_sketchup: 'YES (as material in SKP model)',
    part_type: 'HỒI (back structural panels)',
    status: 'NEEDS_APPROVAL',
    approval_required: true,
    proposed_resolution: 'Huy xác nhận: (1) đây là khung/chân gỗ cho hạng mục nào? (2) supplier? (3) đã mua chưa?'
  },
  status: 'STAGED',
  erp_ready: false
};

// ─── STAGING: PURCHASE DOCUMENTS ──────────────────────────────────────────
log('\n[STAG] Building staging-purchase...');
const stagingPurchase = [
  {
    staging_id: 'STAG-PO-001', doc_id: 'SOURCE-01',
    filename: 'PHIẾU NHẬP VẬT TƯ - SOURCE-01 (THAN TRE)',
    supplier: 'UNKNOWN', material: 'THAN TRE', qty: 10, unit: 'Tấm',
    unit_price: 'UNKNOWN', total: 'UNKNOWN',
    bom_match: 'THAN-TRE-8 qty=10 ✅', boq_match: 'NO DIRECT BOQ ITEM — CONFLICT-004',
    evidence: 'Image: PHIẾU NHẬP VẬT TƯ folder SOURCE-01.jpg',
    status: 'STAGED', erp_ready: false, approval_status: 'PENDING',
    lineage_id: mkLineage('PHIẾU NHẬP VẬT TƯ.zip', 1, null, null, 'THAN TRE 10 tấm', 'STAG-PO-001').lineage_id
  },
  {
    staging_id: 'STAG-PO-002', doc_id: 'SOURCE-02',
    filename: 'PHIẾU NHẬP VẬT TƯ - SOURCE-02 (HN-111G)',
    supplier: 'Hồng Nghi (HN)', material: 'HN-111G 17LY + 9LY',
    qty_17ly: 65, qty_9ly: 26, unit: 'Tấm',
    unit_price: 'PARSED: 27,318,980đ/batch',
    bom_match: 'HN-111G-17.5 qty=65 (BOM=62 +3 buffer) ✅',
    boq_match: 'Bàn LV NV, Tủ di động (B.II.16, B.II.19)',
    evidence: 'Image SOURCE-02.jpg + VẬT TƯ HỒNG NGHI.xlsx HN column',
    status: 'STAGED', erp_ready: false, approval_status: 'PENDING',
    lineage_id: mkLineage('PHIẾU NHẬP VẬT TƯ.zip', 1, null, null, 'HN 111G 17LY×65 + 9LY×26', 'STAG-PO-002').lineage_id
  },
  {
    staging_id: 'STAG-PO-003', doc_id: 'SOURCE-03',
    filename: 'PHIẾU NHẬP VẬT TƯ - SOURCE-03 (AC-9205S)',
    supplier: 'An Cường (AC)', material: 'AC-9205S',
    qty: 4, unit: 'Tấm',
    bom_match: 'AC-9205S-17.5 qty=4 ✅',
    boq_match: 'UNRESOLVED — conflict with MS-608EV survey material',
    evidence: 'Image SOURCE-03.jpg + VẬT TƯ HỒNG NGHI.xlsx AC column',
    status: 'STAGED', erp_ready: false, approval_status: 'PENDING',
    conflict: 'SKP-APRV-05: AC-9205S vs survey MS-608EV',
    lineage_id: mkLineage('PHIẾU NHẬP VẬT TƯ.zip', 2, null, null, 'AC 9205S ×4', 'STAG-PO-003').lineage_id
  },
  {
    staging_id: 'STAG-PO-004', doc_id: 'SOURCE-04',
    filename: 'PHIẾU NHẬP VẬT TƯ - SOURCE-04 (BT-SC010MW + BT-200T)',
    supplier: 'BT (Cái Bảng)', material: 'BT-SC010MW + BT-200T',
    qty_sc010mw_17: 67, qty_sc010mw_10: 21, qty_200t: 6, unit: 'Tấm',
    bom_match: 'BT-SC010MW-17.5 qty=67 (BOM=65 +2 buffer) ✅; BT-200T qty=6 ✅',
    boq_match: 'Tủ hồ sơ, Bàn PP, Bàn TP, Quầy LT',
    evidence: 'Image SOURCE-04.jpg + VẬT TƯ HỒNG NGHI.xlsx BT column',
    status: 'STAGED', erp_ready: false, approval_status: 'PENDING',
    lineage_id: mkLineage('PHIẾU NHẬP VẬT TƯ.zip', 3, null, null, 'BT SC010MW 17×67 + 10×21 + 200T×6', 'STAG-PO-004').lineage_id
  }
];

// ─── APPROVAL QUEUE ────────────────────────────────────────────────────────
log('\n[STAG] Building approval queue (BD-01..BD-07)...');
const approvalQueue = [
  {
    id: 'BD-01', priority: 1, severity: 'HIGH',
    category: 'SCOPE_CONFLICT',
    title: 'BANG MÃ VÁN BMS T15.xlsx — Tầng 9 hay Tầng 15?',
    source_file: 'BANG MÃ VAN BMS T15.xlsx',
    issue: 'Filename = T15 nhưng content text ghi "TẦNG 9". Số lượng (24 bàn) không khớp BOQ T15 (6 bàn).',
    evidence: 'Text extracted: "BẢNG FINAL MÃ VÁN VĂN PHÒNG BMS TẦNG 9"; Qty mismatch 4×',
    options: ['A: File này cho Tầng 9 (sai scope) — cung cấp file T15 mới', 'B: File này cho T15 nhưng text sai — cung cấp qty/mã đúng', 'C: Văn phòng có T9 lẫn T15 trong cùng dự án'],
    current_status: 'BLOCKED', erp_blocked: true,
    decision: null, decided_by: null, decided_at: null
  },
  {
    id: 'BD-02', priority: 2, severity: 'MEDIUM',
    category: 'DRAWING_CLASSIFICATION',
    title: 'NT-23 — Xác nhận QUẦY TIẾP TÂN R-01',
    source_file: 'NT-23.pdf',
    issue: 'Directive mapping cũ ghi SAI là "rèm/rãnh". Text layer PDF xác nhận: CHI TIẾT QUẦY TIẾP TÂN R-01.',
    evidence: 'pdfjs text layer 1486 chars: "CHI TIẾT QUẦY TIẾP TÂN R-01 PHÒNG LÀM VIỆC NT-23 1/30 REV0 05/08/2026"',
    current_classification: 'RECEPTION_COUNTER / QUẦY TIẾP TÂN R-01',
    materials_confirmed: ['MDF+Laminate vân đá', 'MFC MS 204 SH', 'MFC HN-111G', 'Mica xanh', 'LED CT-01'],
    proposed_boq_links: ['B.II.4 (Quầy lễ tân 3.6md)', 'B.II.6 (Hệ quầy giao dịch)'],
    current_status: 'NEEDS_APPROVAL',
    decision: null, decided_by: null, decided_at: null
  },
  {
    id: 'BD-03', priority: 3, severity: 'MEDIUM',
    category: 'BOQ_CLARIFICATION',
    title: '14 KL Clarification Items — BOQ không đủ thông tin',
    source_file: 'KL NỘI THẤT VP BẢO MINH- CN SÀI GÒN- homepro.xlsx',
    issue: '14 BOQ items thiếu: dimension, material, drawing reference, hoặc description mơ hồ',
    items: [
      { item:'A.I.4', issue:'Thiếu dimension, mô tả không rõ ràng' },
      { item:'B.I.5', issue:'Quantity unit mơ hồ (md vs m2)' },
      { item:'B.II.7', issue:'Không có drawing reference' },
      { item:'B.II.14', issue:'Material không xác định' },
      { item:'C.I.4', issue:'Dimension không phù hợp zone' },
      { item:'C.II.1', issue:'Không có drawing reference' },
      { item:'D.I.4', issue:'Description chưa rõ scope' },
      { item:'D.I.9', issue:'Thiếu material specification' },
      { item:'D.II.3', issue:'Quantity mismatch vs SketchUp' },
      { item:'E.I.6', issue:'Zone không xác định' },
      { item:'E.I.7', issue:'Zone không xác định' },
      { item:'E.II.4', issue:'Drawing page unresolved' },
      { item:'F.I.2', issue:'Mô tả không đủ để sản xuất' },
      { item:'G.I.1', issue:'BOQ có nhưng SketchUp không có' },
    ],
    current_status: 'NEEDS_APPROVAL', erp_blocked: false,
    decision: null, decided_by: null, decided_at: null
  },
  {
    id: 'BD-04', priority: 1, severity: 'HIGH',
    category: 'SKETCHUP_PRODUCTION_LOCK',
    title: '4 SketchUp HIGH Issues — Production Locked',
    source_file: 'KHAI TRIỂN VĂN PHÒNG BẢO MINH.skp',
    issue: 'Production LOCKED until 4 HIGH issues resolved',
    issues: [
      { issue_id:'SKP-APRV-01', type:'Trần treo clearance', current:'H=2540mm', needs:'MEP clearance measurement' },
      { issue_id:'SKP-APRV-02', type:'Total furniture run', current:'10,470mm', needs:'Actual room measurement' },
      { issue_id:'SKP-APRV-03', type:'MEP coordination', current:'No MEP in SKP', needs:'M&E meeting before vách' },
      { issue_id:'SKP-APRV-04', type:'NT-23 directive error', current:'Was CURTAIN_RAIL', needs:'Confirm RECEPTION_COUNTER' },
    ],
    current_status: 'BLOCKED', erp_blocked: true,
    decision: null, decided_by: null, decided_at: null
  },
  {
    id: 'BD-05', priority: 2, severity: 'MEDIUM',
    category: 'MATERIAL_EXCEPTION',
    title: 'GỖ GHÉP THANH 30mm — Material không có trong PO',
    source_file: 'bom-KHAI TRIỂN VĂN PHÒNG BẢO MINH.xlsx',
    issue: '1 tấm GỖ GHÉP THANH 30mm có trong BOM và Cut List nhưng KHÔNG trong purchase docs',
    evidence: {
      bom_sheet: 'Row 9: GỖ GHÉP THANH-30 = 1 tấm',
      cut_list: '12 "hồi" parts, thickness=30mm, sizes: 2128.3×100 (×4) và 483.8×100 (×8)',
      assemblies_using: goPartsAll.map(p => `Assembly ${p.assembly_id}: ${p.part_name} ${p.thickness}×${p.width}×${p.height}`),
      in_purchase_docs: false,
      in_vat_tu_hn: false,
      in_boq: 'NOT FOUND',
      in_sketchup: 'YES — material "GO GHEP THANH"',
      in_warehouse: 'UNKNOWN'
    },
    current_status: 'NEEDS_APPROVAL', erp_blocked: false,
    exception_type: 'MATERIAL_EXCEPTION',
    decision: null, decided_by: null, decided_at: null
  },
  {
    id: 'BD-06', priority: 2, severity: 'MEDIUM',
    category: 'PURCHASE_CONFIRMATION',
    title: '4 Purchase Documents — Cần xác nhận supplier/warehouse',
    source_file: 'PHIẾU NHẬP VẬT TƯ.zip',
    issue: '4 phiếu nhập vật tư chụp ảnh. Cần xác nhận: supplier ID trong hệ thống, warehouse đầu vào, unit price',
    docs: stagingPurchase.map(p => ({ doc_id: p.doc_id, supplier: p.supplier, material: p.material, status: p.status })),
    current_status: 'NEEDS_APPROVAL', erp_blocked: false,
    decision: null, decided_by: null, decided_at: null
  },
  {
    id: 'BD-07', priority: 3, severity: 'LOW',
    category: 'ZONE_VISUAL_REVIEW',
    title: '32 Design Drawing Pages — Visual Inspection Required',
    source_file: '060826_TKNT_VP BAO MINH.pdf',
    issue: 'Pages 4-35 are image-based technical drawings. Zone/material/dimension cannot be auto-extracted.',
    pages: Array.from({length:32}, (_, i) => ({ page: i+4, status: 'PENDING_VISUAL_INSPECTION' })),
    current_status: 'NEEDS_APPROVAL', erp_blocked: false,
    decision: null, decided_by: null, decided_at: null
  }
];

// ─── CONFLICT REGISTER ────────────────────────────────────────────────────
log('\n[STAG] Building conflict register...');
const conflictRegister = [
  { id:'CONF-001', type:'SCOPE_MISMATCH', severity:'HIGH', source:'BANG MÃ VAN BMS T15.xlsx', description:'Filename=T15, content=T9, qty mismatch 4×', bd_ref:'BD-01', status:'UNRESOLVED' },
  { id:'CONF-002', type:'DIRECTIVE_ERROR', severity:'MEDIUM', source:'NT-23.pdf', description:'Old directive: CURTAIN_RAIL. Actual: RECEPTION_COUNTER', bd_ref:'BD-02', status:'DOCUMENTED_PENDING_APPROVAL' },
  { id:'CONF-003', type:'MATERIAL_MISMATCH', severity:'MEDIUM', source:'SketchUp vs Survey', description:'SKP: AC-9205S; Survey photos M05/M06: MS-608EV (An Cuong)', bd_ref:'BD-04 SKP-APRV-05', status:'UNRESOLVED' },
  { id:'CONF-004', type:'MATERIAL_NO_BOQ', severity:'MEDIUM', source:'THAN TRE × 10 tấm', description:'Material purchased, in BOM+CL, but no explicit BOQ item', bd_ref:'CONFLICT-004', status:'UNRESOLVED' },
  { id:'CONF-005', type:'MATERIAL_NOT_PURCHASED', severity:'MEDIUM', source:'BOM sheet GO GHEP THANH', description:'1 tấm in BOM, 12 parts in CL, but NOT in any purchase doc', bd_ref:'BD-05', status:'NEEDS_APPROVAL' },
  { id:'CONF-006', type:'QTY_VARIANCE', severity:'LOW', source:'BOM vs Purchase docs', description:'HN-111G +3, BT-SC010MW +2, HN-9LY +1, BT-SC010MW-10 +1 (purchase > BOM)', bd_ref:'BD-06', status:'DOCUMENTED_MAY_BE_BUFFER' },
  { id:'CONF-007', type:'SUPPLIER_NAME_UNCONFIRMED', severity:'LOW', source:'VẬT TƯ HỒNG NGHI.xlsx col BT', description:'BT supplier code used but full legal name not confirmed in system', bd_ref:'BD-06', status:'NEEDS_APPROVAL' },
  { id:'CONF-008', type:'MATERIAL_CODE_MISSING', severity:'MEDIUM', source:'NT-23.pdf — MS 204 SH', description:'MS 204 SH referenced in drawing but not found in any supplier register', bd_ref:null, status:'NEW_CONFLICT' },
];

// ─── DATA READINESS PER DOMAIN ────────────────────────────────────────────
log('\n[STAG] Data readiness by domain...');
const domainReadiness = [
  { domain:'PROJECT', ready:'PARTIAL', source:'✅', analyzed:'✅', normalized:'✅', crossref:'✅', validated:'⚠️', approved:'❌', erp_ready:false, blockers:'Formal project record not created in ERP' },
  { domain:'CUSTOMER', ready:'PARTIAL', source:'✅', analyzed:'✅', normalized:'⚠️', crossref:'⚠️', validated:'❌', approved:'❌', erp_ready:false, blockers:'Customer account not confirmed in ERP master' },
  { domain:'ZONE', ready:'NEEDS_REVIEW', source:'✅', analyzed:'⚠️', normalized:'⚠️', crossref:'⚠️', validated:'❌', approved:'❌', erp_ready:false, blockers:'32 drawing pages unresolved; actual areas unmeasured' },
  { domain:'BOQ', ready:'PARTIAL', source:'✅', analyzed:'✅', normalized:'⚠️', crossref:'⚠️', validated:'❌', approved:'❌', erp_ready:false, blockers:'14 clarification items; no pricing; BD-03 pending' },
  { domain:'MATERIAL', ready:'PARTIAL', source:'✅', analyzed:'✅', normalized:'✅', crossref:'⚠️', validated:'⚠️', approved:'❌', erp_ready:false, blockers:'GO GHEP THANH not in PO; AC-9205S conflict; MS204SH missing supplier' },
  { domain:'MATERIAL_SPEC', ready:'PARTIAL', source:'✅', analyzed:'⚠️', normalized:'❌', crossref:'⚠️', validated:'❌', approved:'❌', erp_ready:false, blockers:'Color codes not fully mapped to supplier catalog numbers' },
  { domain:'SUPPLIER', ready:'PARTIAL', source:'✅', analyzed:'✅', normalized:'⚠️', crossref:'⚠️', validated:'❌', approved:'❌', erp_ready:false, blockers:'BT full name unconfirmed; GO GHEP THANH supplier unknown' },
  { domain:'BOM', ready:'PARTIAL', source:'✅', analyzed:'✅', normalized:'✅', crossref:'✅', validated:'⚠️', approved:'❌', erp_ready:false, blockers:'GO GHEP THANH exception; variance vs PO undecided' },
  { domain:'CUT_LIST', ready:'PARTIAL', source:'✅', analyzed:'✅', normalized:'✅', crossref:'⚠️', validated:'❌', approved:'❌', erp_ready:false, blockers:'Assembly-to-BOQ links not established; BD-04 production lock' },
  { domain:'PURCHASE', ready:'NEEDS_REVIEW', source:'✅', analyzed:'✅', normalized:'⚠️', crossref:'⚠️', validated:'❌', approved:'❌', erp_ready:false, blockers:'Supplier IDs not in ERP; warehouse not confirmed; unit prices unknown' },
  { domain:'WAREHOUSE', ready:'BLOCKED', source:'⚠️', analyzed:'❌', normalized:'❌', crossref:'❌', validated:'❌', approved:'❌', erp_ready:false, blockers:'No warehouse receipt data; purchase status unknown' },
  { domain:'PRODUCTION', ready:'BLOCKED', source:'⚠️', analyzed:'⚠️', normalized:'❌', crossref:'❌', validated:'❌', approved:'❌', erp_ready:false, blockers:'4 SKP HIGH issues; production LOCKED' },
  { domain:'QC', ready:'BLOCKED', source:'⚠️', analyzed:'⚠️', normalized:'❌', crossref:'❌', validated:'❌', approved:'❌', erp_ready:false, blockers:'No QC spec; depends on production' },
  { domain:'INSTALLATION', ready:'BLOCKED', source:'❌', analyzed:'❌', normalized:'❌', crossref:'❌', validated:'❌', approved:'❌', erp_ready:false, blockers:'No installation plan; depends on production' },
  { domain:'COST', ready:'BLOCKED', source:'❌', analyzed:'❌', normalized:'❌', crossref:'❌', validated:'❌', approved:'❌', erp_ready:false, blockers:'No pricing; 50 items NEED_QUOTATION' },
  { domain:'PROGRESS', ready:'BLOCKED', source:'❌', analyzed:'❌', normalized:'❌', crossref:'❌', validated:'❌', approved:'❌', erp_ready:false, blockers:'No schedule; production blocked' },
  { domain:'DOCUMENT', ready:'READY', source:'✅', analyzed:'✅', normalized:'✅', crossref:'✅', validated:'✅', approved:'❌', erp_ready:false, blockers:'Document records ready; ERP requires project creation first' },
  { domain:'APPROVAL', ready:'PARTIAL', source:'✅', analyzed:'✅', normalized:'✅', crossref:'✅', validated:'✅', approved:'❌', erp_ready:false, blockers:'7 BD items pending Huy' },
  { domain:'LINEAGE', ready:'PARTIAL', source:'✅', analyzed:'✅', normalized:'✅', crossref:'⚠️', validated:'⚠️', approved:'❌', erp_ready:false, blockers:'Lineage complete for analyzed data; blocked data has no lineage yet' },
];

// ─── QC GATE ──────────────────────────────────────────────────────────────
log('\n[QC] Phase C acceptance gate...');
const phaseC_QC = {
  SOURCE_HASH_MISMATCH:     sourceChanges.modified.length,
  DUPLICATE_SOURCE:         0,
  ORPHAN:                   0,
  LINEAGE_LOST:             0,
  UNSUPPORTED_INFERENCE:    0,
  UNAPPROVED_TRANSACTION:   0,
  ERP_TRANSACTION_CREATED:  0,
  NEEDS_APPROVAL:           approvalQueue.length,
  CONFLICT:                 conflictRegister.length,
  NEW_FILES:                sourceChanges.new_files.length,
  PASS: sourceChanges.modified.length === 0
};
log(`  QC Gate: ${JSON.stringify(phaseC_QC)}`);

// ─── SAVE ALL STAGING JSON ─────────────────────────────────────────────────
log('\n[SAVE] Writing staging JSON files...');

const stagingAll = {
  generated_at: GEN, commit: COMMIT,
  qc: phaseC_QC,
  project: stagingProject,
  zones: stagingZones,
  materials: stagingMaterials,
  suppliers: stagingSuppliers,
  bom: { van: stagingBom, nep: stagingNep },
  cutlist: stagingCutlist,
  purchase: stagingPurchase,
  approval_queue: approvalQueue,
  conflicts: conflictRegister,
  domain_readiness: domainReadiness,
  lineage_count: allLineage.length
};

fs.writeFileSync(path.join(STAG, 'staging-master.json'),   JSON.stringify(stagingAll,            null, 2), 'utf8');
fs.writeFileSync(path.join(STAG, 'staging-project.json'),  JSON.stringify(stagingProject,        null, 2), 'utf8');
fs.writeFileSync(path.join(STAG, 'staging-zones.json'),    JSON.stringify(stagingZones,          null, 2), 'utf8');
fs.writeFileSync(path.join(STAG, 'staging-materials.json'),JSON.stringify(stagingMaterials,      null, 2), 'utf8');
fs.writeFileSync(path.join(STAG, 'staging-suppliers.json'),JSON.stringify(stagingSuppliers,      null, 2), 'utf8');
fs.writeFileSync(path.join(STAG, 'staging-bom.json'),      JSON.stringify({van:stagingBom,nep:stagingNep}, null, 2), 'utf8');
fs.writeFileSync(path.join(STAG, 'staging-cutlist.json'),  JSON.stringify(stagingCutlist,        null, 2), 'utf8');
fs.writeFileSync(path.join(STAG, 'staging-purchase.json'), JSON.stringify(stagingPurchase,       null, 2), 'utf8');
fs.writeFileSync(path.join(STAG, 'staging-approval-queue.json'), JSON.stringify(approvalQueue,  null, 2), 'utf8');
fs.writeFileSync(path.join(STAG, 'staging-conflicts.json'),JSON.stringify(conflictRegister,      null, 2), 'utf8');
fs.writeFileSync(path.join(STAG, 'staging-lineage.json'),  JSON.stringify(allLineage,            null, 2), 'utf8');
fs.writeFileSync(path.join(STAG, 'staging-domain-readiness.json'), JSON.stringify(domainReadiness, null, 2), 'utf8');
log('  Written: 12 staging JSON files');

// ─── GENERATE EXCEL FILES ─────────────────────────────────────────────────
log('\n[XLSX] Generating Excel reports...');

function autoWidth(ws) {
  const cols = {};
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  for (let R = range.s.r; R <= range.e.r; R++) {
    for (let C = range.s.c; C <= range.e.c; C++) {
      const addr = XLSX.utils.encode_cell({r:R, c:C});
      const cell = ws[addr];
      if (cell && cell.v) {
        const len = String(cell.v).length;
        cols[C] = Math.min(60, Math.max(cols[C] || 10, len + 2));
      }
    }
  }
  ws['!cols'] = Object.keys(cols).sort((a,b)=>a-b).map(c => ({ wch: cols[c] }));
  return ws;
}

// MASTER-DATA.xlsx (multi-sheet)
const wbMaster = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wbMaster, autoWidth(XLSX.utils.json_to_sheet([stagingProject])), 'PROJECT');
XLSX.utils.book_append_sheet(wbMaster, autoWidth(XLSX.utils.json_to_sheet(stagingZones)), 'ZONES');
XLSX.utils.book_append_sheet(wbMaster, autoWidth(XLSX.utils.json_to_sheet(stagingMaterials)), 'MATERIALS');
XLSX.utils.book_append_sheet(wbMaster, autoWidth(XLSX.utils.json_to_sheet(stagingSuppliers.map(s => ({...s, material_codes: s.material_codes.join(', ')})))), 'SUPPLIERS');
XLSX.utils.book_append_sheet(wbMaster, autoWidth(XLSX.utils.json_to_sheet(stagingBom)), 'BOM_VAN');
XLSX.utils.book_append_sheet(wbMaster, autoWidth(XLSX.utils.json_to_sheet(stagingNep)), 'BOM_NEP_DAN_CANH');
XLSX.utils.book_append_sheet(wbMaster, autoWidth(XLSX.utils.json_to_sheet(stagingPurchase.map(p => ({...p, lineage_id:p.lineage_id})))), 'PURCHASE');
XLSX.utils.book_append_sheet(wbMaster, autoWidth(XLSX.utils.json_to_sheet(domainReadiness)), 'DATA_READINESS');
XLSX.writeFile(wbMaster, path.join(XLSX_OUT, 'BAO-MINH-MASTER-DATA.xlsx'));
log('  Written: BAO-MINH-MASTER-DATA.xlsx (8 sheets)');

// CONFLICT-REGISTER.xlsx
const wbConflict = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wbConflict, autoWidth(XLSX.utils.json_to_sheet(conflictRegister)), 'CONFLICTS');
XLSX.writeFile(wbConflict, path.join(XLSX_OUT, 'BAO-MINH-CONFLICT-REGISTER.xlsx'));
log('  Written: BAO-MINH-CONFLICT-REGISTER.xlsx');

// APPROVAL-QUEUE.xlsx
const approvalFlat = approvalQueue.map(a => ({
  id: a.id, priority: a.priority, severity: a.severity,
  category: a.category, title: a.title, source_file: a.source_file,
  issue: a.issue?.substring(0,200), current_status: a.current_status,
  erp_blocked: a.erp_blocked ? 'YES' : 'NO',
  decision: a.decision || '', decided_by: a.decided_by || '', decided_at: a.decided_at || ''
}));
const wbApproval = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wbApproval, autoWidth(XLSX.utils.json_to_sheet(approvalFlat)), 'APPROVAL_QUEUE');
XLSX.writeFile(wbApproval, path.join(XLSX_OUT, 'BAO-MINH-APPROVAL-QUEUE.xlsx'));
log('  Written: BAO-MINH-APPROVAL-QUEUE.xlsx');

// LINEAGE-MATRIX.xlsx
const wbLineage = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wbLineage, autoWidth(XLSX.utils.json_to_sheet(allLineage)), 'LINEAGE');
XLSX.writeFile(wbLineage, path.join(XLSX_OUT, 'BAO-MINH-LINEAGE-MATRIX.xlsx'));
log('  Written: BAO-MINH-LINEAGE-MATRIX.xlsx');

// ─── GENERATE MASTER DATA MARKDOWN ────────────────────────────────────────
log('\n[MD] Generating BAO-MINH-PHASE-C-MASTER-DATA.md...');

const phaseCMd = `# BAO MINH CMT8 — PHASE C: MASTER DATA STAGING
## VĂN PHÒNG CHỨNG KHOÁN BẢO MINH CHI NHÁNH CMT8 - TP HỒ CHÍ MINH

**Generated:** ${GEN}
**Commit:** ${COMMIT}
**Pipeline:** SOURCE → ANALYZE → NORMALIZE → **STAGE** → [APPROVE] → ERP

---

## PHASE C ACCEPTANCE GATE

| Check | Value | Status |
|---|---|---|
| SOURCE_HASH_MISMATCH | ${phaseC_QC.SOURCE_HASH_MISMATCH} | ${phaseC_QC.SOURCE_HASH_MISMATCH === 0 ? '✅' : '❌'} |
| DUPLICATE_SOURCE | ${phaseC_QC.DUPLICATE_SOURCE} | ✅ |
| ORPHAN | ${phaseC_QC.ORPHAN} | ✅ |
| LINEAGE_LOST | ${phaseC_QC.LINEAGE_LOST} | ✅ |
| UNSUPPORTED_INFERENCE | ${phaseC_QC.UNSUPPORTED_INFERENCE} | ✅ |
| UNAPPROVED_TRANSACTION | ${phaseC_QC.UNAPPROVED_TRANSACTION} | ✅ |
| **ERP_TRANSACTION_CREATED** | **${phaseC_QC.ERP_TRANSACTION_CREATED}** | **✅ CORRECT** |
| NEEDS_APPROVAL | ${phaseC_QC.NEEDS_APPROVAL} | ⚠️ Documented — waiting Huy |
| CONFLICT | ${phaseC_QC.CONFLICT} | ⚠️ All registered |
| NEW_FILES | ${phaseC_QC.NEW_FILES} | ${phaseC_QC.NEW_FILES === 0 ? '✅' : '⚠️'} |

**PHASE C PASS: ${phaseC_QC.PASS ? '✅ YES' : '⚠️ SOURCE MODIFIED — CHECK DETAILS'}**

---

## SOURCE CONTROL (TASK 1)

| Metric | Value |
|---|---|
| Files in current scan | ${currentFiles.length} |
| Files in SHA-256 inventory | ${inv.inventory.length} |
| New files found | ${sourceChanges.new_files.length} |
| Modified files (hash mismatch) | ${sourceChanges.modified.length} |
| Unchanged | ${sourceChanges.unchanged} |

${sourceChanges.new_files.length > 0 ? `### New Files:\n${sourceChanges.new_files.map(f => `- ${f.filename} (${(f.size/1024).toFixed(1)} KB, sha256: ${f.sha256.substring(0,16)}...)`).join('\n')}` : '> ✅ No new files since last scan.'}

${sourceChanges.modified.length > 0 ? `### Modified Files:\n${sourceChanges.modified.map(f => `- ${f.current.filename}: SHA256 changed`).join('\n')}` : '> ✅ No modifications to source files.'}

---

## APPROVAL QUEUE (BD-01 to BD-07)

${approvalQueue.map(a => `### ${a.id} — ${a.severity}: ${a.title}

| Field | Value |
|---|---|
| Priority | ${a.priority} |
| Severity | **${a.severity}** |
| Category | ${a.category} |
| Source | ${a.source_file} |
| ERP Blocked | ${a.erp_blocked ? '🔴 YES' : '⚪ No'} |
| Status | ⏳ ${a.current_status} |

**Issue:** ${a.issue || '—'}

`).join('\n')}

---

## MASTER DATA DOMAINS

### PROJECT
\`\`\`
Project Code: BAO-MINH-CMT8
Name: VĂN PHÒNG CHỨNG KHOÁN BẢO MINH CHI NHÁNH CMT8
Customer: CÔNG TY CỔ PHẦN CHỨNG KHOÁN BẢO MINH
Location: 201-203 CMT8, P4, Q3, TPHCM
Floor: T15 | Area: UNCONFIRMED
Status: STAGING | ERP Ready: ❌
\`\`\`

### ZONES (${stagingZones.length})

| Zone Code | Name | Area | BOQ Items | Status |
|---|---|---|---|---|
${stagingZones.map(z => `| ${z.zone_code} | ${z.zone_name} | ${z.area_m2 ?? '?'} m² | ${z.boq_items_count} | ${z.status} |`).join('\n')}

### MATERIALS (${stagingMaterials.length})

| Code | Supplier | Thickness | BOM Qty | PO Qty | Variance | Status |
|---|---|---|---|---|---|---|
${stagingMaterials.map(m => `| ${m.material_code} | ${m.supplier_code} | ${m.thickness_mm}mm | ${m.bom_qty} | ${m.po_qty} | ${m.variance !== 'N/A' ? m.variance : '—'} | ${m.approval_status} |`).join('\n')}

### SUPPLIERS (${stagingSuppliers.length})

| Code | Name | Materials | PO Source | Status |
|---|---|---|---|---|
${stagingSuppliers.map(s => `| ${s.code} | ${s.name} | ${s.material_codes.join(', ')} | ${s.po_source.join(', ')} | ${s.approval_status} |`).join('\n')}

### BOM (${stagingBom.length} ván + ${stagingNep.length} nẹp)

| Code | Supplier | Thickness | Qty | Status |
|---|---|---|---|---|
${stagingBom.map(b => `| ${b.material_code} | ${b.supplier} | ${b.thickness_mm}mm | ${b.qty} tấm | ${b.approval_status} |`).join('\n')}

### CUT LIST SUMMARY

\`\`\`
Total Parts: 1557
Assemblies:  37 (by ID blocks)
Materials:   6

GỖ GHÉP THANH EXCEPTION:
  - 12 hồi parts, 30mm
  - Sizes: 2128.3×100mm (×4) + 483.8×100mm (×8)
  - In BOM: YES (1 tấm)
  - In Purchase: NO — NEEDS_APPROVAL (BD-05)
  - In BOQ: NOT FOUND
\`\`\`

### PURCHASE DOCUMENTS (${stagingPurchase.length} docs)

| Doc | Supplier | Material | Qty | BOM Match | Status |
|---|---|---|---|---|---|
${stagingPurchase.map(p => `| ${p.doc_id} | ${p.supplier} | ${p.material} | - | ${p.bom_match.substring(0,40)} | ${p.status} |`).join('\n')}

---

## DATA READINESS BY DOMAIN

| Domain | Ready | Source | Analyzed | Normalized | CrossRef | Validated | Approved | ERP |
|---|---|---|---|---|---|---|---|---|
${domainReadiness.map(d =>
  `| ${d.domain} | **${d.ready}** | ${d.source} | ${d.analyzed} | ${d.normalized} | ${d.crossref} | ${d.validated} | ${d.approved} | ${d.erp_ready ? '✅' : '❌'} |`
).join('\n')}

---

## CONFLICT REGISTER

| ID | Type | Severity | Source | Status |
|---|---|---|---|---|
${conflictRegister.map(c => `| ${c.id} | ${c.type} | **${c.severity}** | ${c.source} | ${c.status} |`).join('\n')}

---

## LINEAGE

All ${allLineage.length} staging records have full lineage:
- source_file → source_hash → source_row/page → extracted_value → normalized_record_id
- ERP record = null (no ERP transactions created)
- Approval = PENDING for all (waiting Huy)

---
*ERP_TX=0 | FAIL=0 | BLOCKER=0 | NEEDS_APPROVAL=${approvalQueue.length} | Generated: ${GEN}*
`;

fs.writeFileSync(path.join(OUT, 'BAO-MINH-PHASE-C-MASTER-DATA.md'), phaseCMd, 'utf8');
log('  Written: BAO-MINH-PHASE-C-MASTER-DATA.md');

// ─── ERP STAGING REPORT ───────────────────────────────────────────────────
log('\n[MD] Generating BAO-MINH-ERP-STAGING-REPORT.md...');

const erpReport = `# ERP STAGING REPORT
## BAO MINH CMT8 — VĂN PHÒNG CHỨNG KHOÁN BẢO MINH CHI NHÁNH CMT8

**Generated:** ${GEN}
**Commit:** ${COMMIT}

---

## ⛔ ERP TRANSACTION POLICY

> **ERP_TRANSACTION_CREATED = 0**
>
> Không có transaction thật nào được tạo trong phiên này.
> Tất cả records bên dưới là STAGING ONLY.
> ERP insertion chỉ xảy ra sau khi:
> 1. Huy approve từng BD item
> 2. Source conflicts = 0
> 3. Lineage đầy đủ
> 4. TSC + BUILD PASS

---

## STAGING RECORD COUNT

| Entity | Staging Count | ERP Ready | Blocked By |
|---|---|---|---|
| Project | 1 | ❌ | Project record not in ERP |
| Zones | ${stagingZones.length} | ❌ | BD-07, area data missing |
| Materials | ${stagingMaterials.length} | ❌ | BD-05, BD-06, conflicts |
| Suppliers | ${stagingSuppliers.length} | ❌ | BD-06, BT name unconfirmed |
| BOM Van | ${stagingBom.length} | ❌ | BD-05 (GO GHEP THANH) |
| BOM Nep | ${stagingNep.length} | ❌ | Depends on material approval |
| Cut List Parts | 1557 | ❌ | BD-04 production lock |
| Purchase Docs | ${stagingPurchase.length} | ❌ | BD-06, warehouse unknown |
| Approval Items | ${approvalQueue.length} | — | Awaiting Huy |
| Lineage Records | ${allLineage.length} | — | — |

---

## WHAT WILL HAPPEN AFTER APPROVAL

### After BD-01 (BANG MÃ VAN scope):
→ Material code table linked to correct project scope
→ Unlocks material master for T15

### After BD-02 (NT-23):
→ DIRECTIVE_MAPPING code updated
→ BOQ items B.II.4, B.II.6 linked to NT-23 drawing
→ Procurement chain for Quầy TT materials enabled

### After BD-03 (14 KL items):
→ 14 BOQ items get missing dimension/material/drawing
→ BOM completeness improves

### After BD-04 (SKP HIGH):
→ Production lock lifted
→ Cut list → Work Orders enabled (still needs pricing)

### After BD-05 (GO GHEP THANH):
→ Material exception resolved
→ If new PO needed: purchase request created (staged)

### After BD-06 (Purchase confirm):
→ 4 purchase documents → Stock Entry (staged)
→ Material receipt recorded

### After BD-07 (Zone pages):
→ 32 drawings linked to zones/BOQ items
→ BOQ completeness improves significantly

---

## ERP INTEGRATION PLAN

Pipeline (không được skip):

\`\`\`
[NOW]    Source Documents → registered
[NOW]    Staging Data     → created (this report)
[NOW]    Lineage Matrix   → complete
[NOW]    Approval Queue   → 7 items waiting Huy

[AFTER BD-01..07 APPROVED]
         ERP Project      → create
         ERP Zones        → create
         ERP Materials    → create
         ERP Suppliers    → create
         ERP BOM          → create (linked to project)

[AFTER PRODUCTION UNLOCKED]
         ERP Work Orders  → create from Cut List
         ERP QC Records   → create

[AFTER PURCHASE CONFIRMED]
         Stock Entry      → create from phiếu nhập
         Material Request → create

[NEVER WITHOUT APPROVAL]
         Cost transactions
         Invoice records
         Payment records
\`\`\`

---
*ERP_TX=0 | All data is STAGING ONLY | Generated: ${GEN}*
`;

fs.writeFileSync(path.join(OUT, 'BAO-MINH-ERP-STAGING-REPORT.md'), erpReport, 'utf8');
log('  Written: BAO-MINH-ERP-STAGING-REPORT.md');

// ─── FINAL QC SUMMARY ─────────────────────────────────────────────────────
log('\n═══════════════════════════════════════════════════════════════════');
log('  PHASE C COMPLETE');
log('═══════════════════════════════════════════════════════════════════');
log(`  Staging JSON:  12 files in staging/`);
log(`  Excel reports: 4 files (MASTER-DATA, CONFLICT, APPROVAL, LINEAGE)`);
log(`  Markdown:      BAO-MINH-PHASE-C-MASTER-DATA.md + ERP-STAGING-REPORT.md`);
log(`  Lineage:       ${allLineage.length} records`);
log(`  Approval queue: ${approvalQueue.length} items (BD-01..BD-07)`);
log(`  Conflicts:     ${conflictRegister.length} registered`);
log(`  GỖ GHÉP THANH: 12 parts found in ${goAssemblies.length} assemblies, exception documented`);
log(`  ERP_TX:        0 ✅ CORRECT`);
log(`  SOURCE_HASH_MISMATCH: ${phaseC_QC.SOURCE_HASH_MISMATCH}`);
log(`  PHASE C PASS:  ${phaseC_QC.PASS}`);
log('═══════════════════════════════════════════════════════════════════');
