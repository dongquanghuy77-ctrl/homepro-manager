require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function q(sql, p = []) {
  try { return await pool.query(sql, p); }
  catch (e) { console.error('SQL:', e.message, sql.substring(0, 100)); throw e; }
}

const BDs = [
  {
    decision_id: 'BD-01',
    project_id: 108,
    title: 'BANG MÃ VÁN BMS T15.xlsx — Scope Tầng 9 vs Tầng 15',
    category: 'SCOPE',
    source_document: 'BANG MÃ VAN BMS T15.xlsx',
    evidence: 'File named T15 but content says "BẢNG FINAL MÃ VÁN VĂN PHÒNG BMS TẦNG 9". Qty mismatch: 24 desks (T9) vs 6 desks (T15 BOQ). Customer in file: Aqcons (contractor), not BMSC. File NOT usable for T15 scope.',
    current_value: 'File content = Tầng 9 data',
    proposed_value: 'Need T15-specific material register from Huy',
    risk_level: 'HIGH',
    status: 'BLOCKED',
    impact_description: 'Cannot link material codes to T15 BOQ items. Material PO scope unclear.',
    blocked_modules: '{PROCUREMENT,PRODUCTION,BOM}',
  },
  {
    decision_id: 'BD-02',
    project_id: 108,
    title: 'NT-23 — Xác nhận Quầy Tiếp Tân R-01',
    category: 'DRAWING',
    source_document: 'NT-23.pdf',
    evidence: 'Text layer extracted: "CHI TIẾT QUẦY TIẾP TÂN R-01 PHÒNG LÀM VIỆC NT-23 1/30". Designer: KTS TRẦN HOÀNG LÂN. Owner: BMSC. Technical fact from PDF — confirmed as RECEPTION_COUNTER. BOQ links: B.II.4 (Quầy lễ tân), B.II.6 (Hệ quầy giao dịch). Old directive mapping (CURTAIN_RAIL) was WRONG.',
    current_value: 'Directive: CURTAIN_RAIL (wrong)',
    proposed_value: 'Correct: RECEPTION_COUNTER R-01 → B.II.4, B.II.6',
    risk_level: 'MEDIUM',
    status: 'PENDING',
    impact_description: 'NT-23 BOQ links need correction. Curtain drawing to be found in main TKNT PDF.',
    blocked_modules: '{DRAWING_LINKS}',
  },
  {
    decision_id: 'BD-03',
    project_id: 108,
    title: '14 KL items thiếu dimension/material/drawing reference',
    category: 'DRAWING',
    source_document: 'KL NỘI THẤT VP BẢO MINH- CN SÀI GÒN- homepro.xlsx',
    evidence: '14 BOQ items (A.I.4, B.II.7, B.II.14, C.I.4, C.II.1, D.I.4, D.I.9, D.II.3, E.I.6, E.I.7, E.II.4, F.I.2, G.I.1, E.I.8) lack drawing reference or material specification in KL source file.',
    current_value: 'BOQ items with missing specs',
    proposed_value: 'Need drawing page references and material codes from Huy',
    risk_level: 'MEDIUM',
    status: 'PENDING',
    impact_description: 'Cannot finalize BOQ unit prices or link to drawings for these items.',
    blocked_modules: '{BOQ_PRICING,DRAWING_LINKS}',
  },
  {
    decision_id: 'BD-04',
    project_id: 108,
    title: 'SketchUp 4 HIGH issues — Production LOCKED',
    category: 'STRUCTURAL',
    source_document: 'KHAI TRIỂN VĂN PHÒNG BẢO MINH.skp',
    evidence: 'SKP-APRV-01: Trần H=2540mm vs MEP clearance unverified. SKP-APRV-02: Furniture run 10470mm vs actual room unverified. SKP-APRV-03: MEP coordination missing (no MEP in SKP). SKP-APRV-04: NT-23 misclassified as CURTAIN_RAIL in directive. All 4 = HIGH severity. Production MUST remain locked.',
    current_value: 'PRODUCTION=LOCKED',
    proposed_value: 'Need MEP site measurement + designer confirmation',
    risk_level: 'HIGH',
    status: 'BLOCKED',
    impact_description: 'Production Orders, Work Orders, BOM cut execution all blocked. 1325 components cannot be cut.',
    blocked_modules: '{PRODUCTION,WORK_ORDERS,CNC,ASSEMBLY}',
  },
  {
    decision_id: 'BD-05',
    project_id: 108,
    title: 'GỖ GHÉP THANH 30mm — Không có Purchase Order',
    category: 'PROCUREMENT',
    source_document: 'bom-KHAI TRIỂN VĂN PHÒNG BẢO MINH.xlsx',
    evidence: 'BOM row 9: GỖ GHÉP THANH 1 tấm. Cut List: 12 parts (4×2128.3×100mm + 8×483.8×100mm). No purchase document found for GỖ GHÉP THANH. Not in VẬT TƯ HỒNG NGHI, not in SOURCE-01..04.',
    current_value: 'BOM: 1 tấm GỖ GHÉP THANH 30mm, PO: NONE',
    proposed_value: 'Need: supplier confirmation and PO authorization',
    risk_level: 'MEDIUM',
    status: 'PENDING',
    impact_description: 'Cannot create GRN/inventory for GỖ GHÉP THANH. 12 cut parts blocked.',
    blocked_modules: '{PROCUREMENT_GG,PRODUCTION_GG}',
  },
  {
    decision_id: 'BD-06',
    project_id: 108,
    title: 'Xác nhận 4 phiếu nhập vật tư (supplier/warehouse/price)',
    category: 'PROCUREMENT',
    source_document: 'PHIẾU NHẬP VẬT TƯ images',
    evidence: 'SOURCE-01: 10 tấm THAN TRE (supplier unknown). SOURCE-02: Hồng Nghi 65t 17mm + 26t 9mm, total 35,131,954đ. SOURCE-03: An Cường chỉ PVC + 4t ván 9205S. SOURCE-04: BT 67t SC010MW 17mm + 21t 9mm + 6t 200T, total ~67,000,000đ. All 4 phiếu nhập have image evidence but need formal confirmation.',
    current_value: '4 phiếu nhập chưa được xác nhận chính thức',
    proposed_value: 'Confirm supplier, warehouse, price, and link to PO',
    risk_level: 'MEDIUM',
    status: 'PENDING',
    impact_description: 'Cannot create formal GRN or inventory entries without confirmed phiếu nhập.',
    blocked_modules: '{GRN,INVENTORY_RECEIPT}',
  },
  {
    decision_id: 'BD-07',
    project_id: 108,
    title: '32 Drawing pages — manual zone/BOQ classification',
    category: 'DRAWING',
    source_document: '060826_TKNT_VP BAO MINH.pdf',
    evidence: '060826_TKNT PDF has 35 pages. 3 pages have text layer (metadata). 32 pages are image-only with no text layer. Zone and BOQ item links for these 32 pages cannot be determined automatically. Need visual inspection.',
    current_value: '32 drawing pages unclassified',
    proposed_value: 'Map each drawing page to zone and BOQ item',
    risk_level: 'LOW',
    status: 'PENDING',
    impact_description: 'Cannot link detailed drawings to BOQ items for pricing verification.',
    blocked_modules: '{DRAWING_LINKS}',
  },
];

async function main() {
  console.log('═══ SEED BUSINESS DECISIONS ═══');
  for (const bd of BDs) {
    const r = await q(`
      INSERT INTO business_decisions 
        (decision_id, project_id, title, category, source_document, evidence, 
         current_value, proposed_value, risk_level, status, impact_description, 
         blocked_modules, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::text[],NOW(),NOW())
      ON CONFLICT (decision_id) DO UPDATE SET
        title=EXCLUDED.title, status=EXCLUDED.status, 
        evidence=EXCLUDED.evidence, updated_at=NOW()
      RETURNING id, decision_id, status
    `, [bd.decision_id, bd.project_id, bd.title, bd.category, bd.source_document,
        bd.evidence, bd.current_value, bd.proposed_value, bd.risk_level, bd.status,
        bd.impact_description, bd.blocked_modules]);
    console.log(' ', r.rows[0].decision_id, r.rows[0].status, 'ID='+r.rows[0].id);
  }
  console.log('DONE — 7 business decisions seeded');
}
main().then(() => pool.end()).catch(e => { console.error('FATAL:', e.message); pool.end(); process.exit(1); });
