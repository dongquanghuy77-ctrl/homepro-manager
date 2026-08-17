// Direct SQL migration for business_decisions table + BD-01..07 seed
require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function q(sql, p = []) {
  try { return await pool.query(sql, p); }
  catch (e) { console.error('SQL error:', e.message, '\n', sql.substring(0, 200)); throw e; }
}

const BDs = [
  {
    decision_id: 'BD-01', project_id: 108,
    title: 'BANG MÃ VÁN BMS T15.xlsx — Scope Tầng 9 vs Tầng 15',
    category: 'SCOPE',
    source_document: 'BANG MÃ VAN BMS T15.xlsx',
    evidence: 'File named T15 but content says "BẢNG FINAL MÃ VÁN VĂN PHÒNG BMS TẦNG 9". Qty: 24 desks (T9) vs 6 desks (T15 BOQ). 4× mismatch. Customer: Aqcons (contractor). File NOT usable for T15 scope.',
    current_value: 'File content = Tầng 9 data (qty 4× larger than T15)',
    proposed_value: 'Need T15-specific material register from Huy/designer',
    risk_level: 'HIGH', status: 'BLOCKED',
    impact_description: 'Cannot link material codes (111G, BT66MM) to T15 BOQ items. Material PO scope unclear.',
    blocked_modules: ['MATERIAL_CODE_ASSIGNMENT','PROCUREMENT_SCOPE','BOM_LINKS'],
  },
  {
    decision_id: 'BD-02', project_id: 108,
    title: 'NT-23 — Xác nhận Quầy Tiếp Tân R-01 (DRAWING_CORRECTION)',
    category: 'DRAWING',
    source_document: 'NT-23.pdf',
    evidence: 'PDF text layer (1486 chars, pdfjs-dist@3.11): "CHI TIẾT QUẦY TIẾP TÂN R-01 PHÒNG LÀM VIỆC NT-23 1/30 REV0 05/08/2026". Designer: KTS TRẦN HOÀNG LÂN. Owner: BMSC. Technical fact — old directive mapping CURTAIN_RAIL was wrong. Correct: RECEPTION_COUNTER. BOQ links: B.II.4, B.II.6.',
    current_value: 'Old directive: CURTAIN_RAIL (wrong). BOQ links: A.I.3..E.I.3 (wrong)',
    proposed_value: 'Correct: RECEPTION_COUNTER R-01 → B.II.4 (Quầy lễ tân 3.6md), B.II.6 (Hệ quầy GD)',
    risk_level: 'MEDIUM', status: 'PENDING',
    impact_description: 'NT-23 BOQ links need correction. Curtain drawing still unidentified in main TKNT PDF.',
    blocked_modules: ['DRAWING_BOQ_LINKS','CURTAIN_CLASSIFICATION'],
  },
  {
    decision_id: 'BD-03', project_id: 108,
    title: '14 KL items thiếu dimension/material/drawing',
    category: 'DRAWING',
    source_document: 'KL NỘI THẤT VP BẢO MINH- CN SÀI GÒN- homepro.xlsx',
    evidence: 'Items: A.I.4 (Tủ âm tường P.CT), B.II.7 (Vách kính trang trí), B.II.14 (Tủ âm tường P.LV), C.I.4 (Vách ốp tường GĐ), C.II.1 (Trần giật cấp GĐ), D.I.4 (Màn chiếu/TV), D.I.9 (Vách Akupanel), D.II.3 (Đèn P.Họp), E.I.6 (Đèn sảnh), E.I.7 (Logo tường), E.II.4 (Trần sảnh), F.I.2 (Bàn ăn Pantry), G.I.1 (Kệ kho sắt). All lack drawing page ref.',
    current_value: '14 BOQ items with notes "BD-03" or missing material/drawing',
    proposed_value: 'Need drawing page references and material codes from Huy for each item',
    risk_level: 'MEDIUM', status: 'PENDING',
    impact_description: 'Cannot finalize BOQ unit prices or link drawings. Affects 43% of BOQ items.',
    blocked_modules: ['BOQ_PRICING','DRAWING_LINKS'],
  },
  {
    decision_id: 'BD-04', project_id: 108,
    title: 'SketchUp 4 HIGH Issues — PRODUCTION LOCKED',
    category: 'STRUCTURAL',
    source_document: 'KHAI TRIỂN VĂN PHÒNG BẢO MINH.skp',
    evidence: 'SKP-APRV-01: Trần H=2540mm vs MEP clearance unknown (Survey RISK-001: MEP dày đặc S12-S13). SKP-APRV-02: Furniture run=10470mm vs actual room unverified. SKP-APRV-03: No MEP in SKP model → MEP coordination needed. SKP-APRV-04: NT-23 misclassified as CURTAIN_RAIL in directive (now confirmed RECEPTION_COUNTER).',
    current_value: 'PRODUCTION=LOCKED. 1325 components cannot be cut.',
    proposed_value: 'Need MEP site measurement + designer confirmation + SKP revision',
    risk_level: 'HIGH', status: 'BLOCKED',
    impact_description: 'Production Orders, Work Orders, CNC cutting, Assembly all LOCKED. ERP_TX_PRODUCTION=0.',
    blocked_modules: ['PRODUCTION_ORDER','WORK_ORDER','CNC','ASSEMBLY','QC'],
  },
  {
    decision_id: 'BD-05', project_id: 108,
    title: 'GỖ GHÉP THANH 30mm — No Purchase Document',
    category: 'PROCUREMENT',
    source_document: 'bom-KHAI TRIỂN VĂN PHÒNG BẢO MINH.xlsx',
    evidence: 'BOM sheet row 9: GỖ GHÉP THANH = 1 tấm. Cut List: 12 parts ("hồi" 30mm) — 4×2128.3×100mm + 8×483.8×100mm. NOT in VẬT TƯ HỒNG NGHI register. NOT in SOURCE-01..04 purchase docs. NOT in BOQ 32 items.',
    current_value: 'BOM: 1 tấm GỖ GHÉP THANH 30mm required. PO: NONE. BOQ link: NONE.',
    proposed_value: 'Need supplier identification, PO authorization, and BOQ link',
    risk_level: 'MEDIUM', status: 'PENDING',
    impact_description: 'Cannot create GRN/inventory for GỖ GHÉP THANH. 12 cut parts blocked.',
    blocked_modules: ['PROCUREMENT_GG','CNC_GG'],
  },
  {
    decision_id: 'BD-06', project_id: 108,
    title: 'Xác nhận 4 phiếu nhập vật tư (supplier/price/warehouse)',
    category: 'PROCUREMENT',
    source_document: 'PHIẾU NHẬP VẬT TƯ images (SOURCE-01..04)',
    evidence: 'SOURCE-01: 10 tấm THAN TRE 1220×2440×8mm (supplier unknown). SOURCE-02: Hồng Nghi 65t 17mm 111G + 26t 9mm 111G, total 35,131,954₫ ck30%. SOURCE-03: An Cường chỉ PVC 9205 + 4t 9205S. SOURCE-04: BT/Cai Bang 67t SC010MW 17mm + 21t 9mm + 6t 200T, total ~67,000,000₫ ck30%. 3 DRAFT PRs created: PR-BM-HN-001, PR-BM-BT-001, PR-BM-AC-001.',
    current_value: '4 phiếu nhập chưa xác nhận chính thức. 3 DRAFT PRs created.',
    proposed_value: 'Confirm supplier IDs, warehouse location, unit prices → create formal GRN',
    risk_level: 'MEDIUM', status: 'PENDING',
    impact_description: 'Cannot create formal GRN or inventory entries until confirmed. PRs remain DRAFT.',
    blocked_modules: ['GRN','INVENTORY_RECEIPT','PO_CONFIRMATION'],
  },
  {
    decision_id: 'BD-07', project_id: 108,
    title: '32 Drawing Pages — Visual Zone Classification',
    category: 'DRAWING',
    source_document: '060826_TKNT_VP BAO MINH.pdf',
    evidence: '060826_TKNT PDF: 35 pages total. Pages 1-3 have text layer (metadata). Pages 4-35 = image-only 3D perspective drawings. Cannot auto-classify zones/BOQ links for 32 image pages. 32 pages unclassified.',
    current_value: '32 drawing pages IMAGE_ONLY — zone classification not possible without visual review',
    proposed_value: 'Map each drawing page to zone and BOQ item via visual inspection',
    risk_level: 'LOW', status: 'PENDING',
    impact_description: 'Cannot link detailed drawings to BOQ items for cost verification. Low priority.',
    blocked_modules: ['DRAWING_BOQ_LINKS'],
  },
];

async function main() {
  console.log('=== PHASE 2 — BUSINESS DECISIONS TABLE + SEED ===');

  // 1. Create table if not exists
  await q(`
    CREATE TABLE IF NOT EXISTS business_decisions (
      id SERIAL PRIMARY KEY,
      decision_id TEXT NOT NULL UNIQUE,
      project_id INTEGER NOT NULL REFERENCES projects(id),
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      source_document TEXT,
      evidence TEXT,
      current_value TEXT,
      proposed_value TEXT,
      risk_level TEXT NOT NULL DEFAULT 'MEDIUM',
      status TEXT NOT NULL DEFAULT 'PENDING',
      impact_description TEXT,
      blocked_modules TEXT[],
      reviewed_by INTEGER,
      reviewed_at TIMESTAMPTZ,
      rejection_reason TEXT,
      resolution_note TEXT,
      audit_trail JSONB DEFAULT '[]',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  console.log('✅ Table business_decisions created/verified');

  // 2. Create index
  await q(`CREATE INDEX IF NOT EXISTS idx_bd_project_id ON business_decisions(project_id);`);
  await q(`CREATE INDEX IF NOT EXISTS idx_bd_status ON business_decisions(status);`);
  console.log('✅ Indexes created');

  // 3. Seed BD-01..BD-07
  let seeded = 0;
  for (const bd of BDs) {
    const r = await q(`
      INSERT INTO business_decisions
        (decision_id, project_id, title, category, source_document, evidence,
         current_value, proposed_value, risk_level, status, impact_description,
         blocked_modules, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::text[],NOW(),NOW())
      ON CONFLICT (decision_id) DO UPDATE SET
        title=EXCLUDED.title, status=EXCLUDED.status,
        evidence=EXCLUDED.evidence, impact_description=EXCLUDED.impact_description,
        blocked_modules=EXCLUDED.blocked_modules, updated_at=NOW()
      RETURNING id, decision_id, status
    `, [
      bd.decision_id, bd.project_id, bd.title, bd.category,
      bd.source_document, bd.evidence, bd.current_value, bd.proposed_value,
      bd.risk_level, bd.status, bd.impact_description,
      `{${bd.blocked_modules.join(',')}}`,
    ]);
    console.log(' ', r.rows[0].decision_id, '→', r.rows[0].status, '(ID:', r.rows[0].id + ')');
    seeded++;
  }
  console.log(`\n✅ Seeded ${seeded}/7 business decisions`);

  // 4. Verify
  const v = await q('SELECT decision_id, status, risk_level FROM business_decisions WHERE project_id=108 ORDER BY decision_id');
  console.log('\n📋 BD Summary:');
  v.rows.forEach(r => console.log(' ', r.decision_id, r.risk_level, r.status));
  console.log('\n=== PHASE 2 COMPLETE — ERP_TX=0 maintained ===');
}

main().then(() => pool.end()).catch(e => { console.error('FATAL:', e.message); pool.end(); process.exit(1); });
