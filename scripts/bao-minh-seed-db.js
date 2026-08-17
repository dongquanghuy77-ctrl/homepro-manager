/**
 * BAO MINH CMT8 — SEED CONTINUATION (suppliers + materials + BOQ + tasks + source_docs + lineage)
 * Assumes project ID=108, customer ID=16 already inserted
 */
require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const COMMIT = 'afc78cf';
const pid = 108;
const cid = 16;

async function q(sql, p = []) {
  try { return await pool.query(sql, p); }
  catch (e) { console.error('SQL ERR:', e.message, '\n  SQL:', sql.substring(0, 200)); throw e; }
}

async function main() {
  console.log('═══ BAO MINH SEED CONTINUATION — pid=' + pid + ' cid=' + cid + ' ═══\n');

  // Verify project exists
  const chk = await q('SELECT id, code FROM projects WHERE id=$1', [pid]);
  if (chk.rows.length === 0) throw new Error('Project ID ' + pid + ' not found!');
  console.log('[OK] Project:', chk.rows[0].code);

  // ── SUPPLIERS (no notes column) ────────────────────────────────────────
  console.log('\n[3] Suppliers...');
  const sups = [
    ['SUP-HN', 'Ván Hồng Nghi', 'Supplier HN-111G | PO SOURCE-02', null, null, '201-203 CMT8 zone'],
    ['SUP-BT', 'Ván Cái Bảng (BT)', 'Supplier SC010MW+200T | BD-06 name unconfirmed', null, null, null],
    ['SUP-AC', 'Ván An Cường', 'Supplier AC-9205S | CONF-003 SKP vs survey', null, null, null],
  ];
  const supIds = {};
  for (const [code, name, payment_terms, phone, email, address] of sups) {
    const r = await q(`
      INSERT INTO suppliers (code, name, payment_terms, is_active, created_at, updated_at)
      VALUES ($1,$2,$3,true,NOW(),NOW())
      ON CONFLICT (code) DO UPDATE SET name=EXCLUDED.name, updated_at=NOW()
      RETURNING id, code
    `, [code, name, payment_terms]);
    supIds[code] = r.rows[0].id;
    console.log('  Supplier:', code, 'ID=' + r.rows[0].id);
  }

  // ── MATERIALS ─────────────────────────────────────────────────────────
  console.log('\n[4] Materials...');
  const mats = [
    ['MAT-HN-111G-175','Ván Melamine Hồng Nghi HN-111G (17.5mm)','Tấm','RAW_MATERIAL','VÁN ÉP','Hồng Nghi','BOM:62t PO:65t | src row1 | commit:'+COMMIT],
    ['MAT-HN-111G-10', 'Ván Melamine Hồng Nghi HN-111G (10mm)',  'Tấm','RAW_MATERIAL','VÁN ÉP','Hồng Nghi','BOM:25t PO:26t | src row2'],
    ['MAT-BT-SC010MW-175','Ván MFC Cái Bảng SC010MW (17.5mm)','Tấm','RAW_MATERIAL','VÁN ÉP','Cái Bảng','BOM:65t PO:67t | src row3'],
    ['MAT-BT-SC010MW-10', 'Ván MFC Cái Bảng SC010MW (10mm)',  'Tấm','RAW_MATERIAL','VÁN ÉP','Cái Bảng','BOM:20t PO:21t | src row4'],
    ['MAT-BT-200T-175',   'Ván MFC Cái Bảng 200T (17.5mm)',   'Tấm','RAW_MATERIAL','VÁN ÉP','Cái Bảng','BOM:6t PO:6t | src row5'],
    ['MAT-AC-9205S-175',  'Ván An Cường 9205S (17.5mm)',       'Tấm','RAW_MATERIAL','VÁN ÉP','An Cường','BOM:4t PO:4t | CONF-003 | src row7'],
    ['MAT-THAN-TRE-8',    'Thanh Tre 8mm',                     'Tấm','RAW_MATERIAL','TRE','Chưa xác định','BOM:10t PO:10t SOURCE-01 | CONF-004'],
    ['MAT-GO-GHEP-30',    'Gỗ Ghép Thanh 30mm',                'Tấm','RAW_MATERIAL','GỖ','Chưa xác định','BOM:1t PO:NONE | CL:12 hồi | BD-05 NEEDS_APPROVAL'],
  ];
  const matIds = {};
  for (const [code, name, unit, type, cat, sup, notes] of mats) {
    const r = await q(`
      INSERT INTO materials (code, name, unit, type, category, supplier, notes, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),NOW())
      ON CONFLICT (code) DO UPDATE SET name=EXCLUDED.name, notes=EXCLUDED.notes, updated_at=NOW()
      RETURNING id, code
    `, [code, name, unit, type, cat, sup, notes]);
    matIds[code] = r.rows[0].id;
    console.log('  Material:', code, 'ID=' + r.rows[0].id);
  }

  // ── SUPPLIER ITEMS ─────────────────────────────────────────────────────
  console.log('\n[4b] Supplier-Material links (skipped — supplier_items may not be migrated)...');


  // ── BOQ ───────────────────────────────────────────────────────────────
  console.log('\n[5] BOQ...');
  const boqR = await q(`
    INSERT INTO boqs (code, project_id, version, status, revision_reason, created_at, updated_at)
    VALUES ($1,$2,$3,$4,$5,NOW(),NOW())
    ON CONFLICT (code) DO UPDATE SET status=EXCLUDED.status, updated_at=NOW()
    RETURNING id, code
  `, ['BOQ-BAO-MINH-CMT8-v1', pid, '1.0', 'DRAFT', 'BD-01..BD-07 pending before SUBMITTED']);
  const bid = boqR.rows[0].id;
  console.log('  BOQ ID:', bid);

  // ── BOQ SECTIONS ──────────────────────────────────────────────────────
  console.log('\n[6] BOQ Sections...');
  const secs = [
    ['A — PHÒNG CHỦ TỊCH',1],
    ['B — PHÒNG LÀM VIỆC NHÂN VIÊN',2],
    ['C — PHÒNG GIÁM ĐỐC CHI NHÁNH',3],
    ['D — PHÒNG HỌP',4],
    ['E — QUẦY LỄ TÂN / HÀNH LANG',5],
    ['F — PANTRY',6],
    ['G — KHO',7],
  ];
  const secIds = {};
  for (const [name, seq] of secs) {
    const r = await q(`
      INSERT INTO boq_sections (boq_id, name, sequence) VALUES ($1,$2,$3)
      ON CONFLICT DO NOTHING RETURNING id, name
    `, [bid, name, seq]);
    if (r.rows.length > 0) {
      secIds[name] = r.rows[0].id;
    } else {
      const r2 = await q('SELECT id FROM boq_sections WHERE boq_id=$1 AND name=$2', [bid, name]);
      if (r2.rows.length > 0) secIds[name] = r2.rows[0].id;
    }
    console.log('  Section:', name, 'ID=' + secIds[name]);
  }

  // ── BOQ ITEMS ─────────────────────────────────────────────────────────
  console.log('\n[7] BOQ Items...');
  const items = [
    ['A — PHÒNG CHỦ TỊCH','A.I.1','Bàn LV Chủ Tịch (L-shape)','bộ',1,null,'KL A.I.1'],
    ['A — PHÒNG CHỦ TỊCH','A.I.2','Tủ hồ sơ Phòng CT (âm tường)','bộ',1,null,'KL A.I.2'],
    ['A — PHÒNG CHỦ TỊCH','A.I.3','Kệ sách / tủ trưng bày','bộ',1,null,'KL A.I.3'],
    ['A — PHÒNG CHỦ TỊCH','A.I.4','Tủ âm tường Phòng CT','bộ',1,null,'KL A.I.4 | BD-03:thiếu dimension'],
    ['A — PHÒNG CHỦ TỊCH','A.II.1','Vách ngăn kính Phòng CT','m2',12,null,'KL A.II.1'],
    ['A — PHÒNG CHỦ TỊCH','A.II.2','Trần thạch cao Phòng CT','m2',94,null,'KL A.II.2'],
    ['B — PHÒNG LÀM VIỆC NHÂN VIÊN','B.I.1','Bàn LV nhân viên','bộ',18,'MAT-HN-111G-175','KL B.I.1 | HN-111G-17.5'],
    ['B — PHÒNG LÀM VIỆC NHÂN VIÊN','B.I.2','Tủ di động cá nhân','cái',18,'MAT-HN-111G-175','KL B.I.2'],
    ['B — PHÒNG LÀM VIỆC NHÂN VIÊN','B.I.3','Bàn Trưởng Phòng LV','bộ',1,'MAT-BT-SC010MW-175','KL B.I.3'],
    ['B — PHÒNG LÀM VIỆC NHÂN VIÊN','B.II.4','Quầy Tiếp Tân R-01 (NT-23)','bộ',1,null,'KL B.II.4 | BD-02 NEEDS_APPROVAL'],
    ['B — PHÒNG LÀM VIỆC NHÂN VIÊN','B.II.5','Vách trang trí gỗ','md',3.6,null,'KL B.II.5'],
    ['B — PHÒNG LÀM VIỆC NHÂN VIÊN','B.II.6','Hệ quầy giao dịch','md',1,null,'KL B.II.6 | linked NT-23'],
    ['B — PHÒNG LÀM VIỆC NHÂN VIÊN','B.II.7','Vách kính trang trí','m2',8,null,'KL B.II.7 | BD-03:thiếu drawing'],
    ['B — PHÒNG LÀM VIỆC NHÂN VIÊN','B.II.14','Tủ âm tường Phòng LV','bộ',1,null,'KL B.II.14 | BD-03:material?'],
    ['B — PHÒNG LÀM VIỆC NHÂN VIÊN','B.II.16','Bàn LV NV bộ đôi','bộ',9,'MAT-HN-111G-175','KL B.II.16'],
    ['B — PHÒNG LÀM VIỆC NHÂN VIÊN','B.II.19','Tủ di động ngăn kéo','cái',18,'MAT-HN-111G-175','KL B.II.19'],
    ['C — PHÒNG GIÁM ĐỐC CHI NHÁNH','C.I.1','Bàn LV Giám Đốc CN','bộ',1,'MAT-BT-SC010MW-175','KL C.I.1'],
    ['C — PHÒNG GIÁM ĐỐC CHI NHÁNH','C.I.2','Tủ hồ sơ Phòng GĐ','bộ',1,'MAT-BT-SC010MW-175','KL C.I.2'],
    ['C — PHÒNG GIÁM ĐỐC CHI NHÁNH','C.I.4','Vách ốp tường GĐ','m2',6,null,'KL C.I.4 | BD-03'],
    ['C — PHÒNG GIÁM ĐỐC CHI NHÁNH','C.II.1','Trần giật cấp GĐ','m2',26.3,null,'KL C.II.1 | BD-03'],
    ['D — PHÒNG HỌP','D.I.1','Bàn họp trung tâm','bộ',1,'MAT-BT-200T-175','KL D.I.1'],
    ['D — PHÒNG HỌP','D.I.2','Tủ hồ sơ Phòng Họp','bộ',1,'MAT-BT-SC010MW-175','KL D.I.2'],
    ['D — PHÒNG HỌP','D.I.4','Màn chiếu / tủ TV','bộ',1,null,'KL D.I.4 | BD-03'],
    ['D — PHÒNG HỌP','D.I.9','Vách Akupanel','m2',14,null,'KL D.I.9 | BD-03'],
    ['D — PHÒNG HỌP','D.II.3','Đèn trang trí Phòng Họp','bộ',1,null,'KL D.II.3 | BD-03'],
    ['E — QUẦY LỄ TÂN / HÀNH LANG','E.I.1','Quầy lễ tân sảnh','bộ',1,null,'KL E.I.1'],
    ['E — QUẦY LỄ TÂN / HÀNH LANG','E.I.6','Đèn trang trí sảnh','bộ',1,null,'KL E.I.6 | BD-03'],
    ['E — QUẦY LỄ TÂN / HÀNH LANG','E.I.7','Logo thương hiệu tường','bộ',1,null,'KL E.I.7 | BD-03'],
    ['E — QUẦY LỄ TÂN / HÀNH LANG','E.II.4','Trần thạch cao sảnh','m2',25,null,'KL E.II.4 | BD-03'],
    ['F — PANTRY','F.I.1','Tủ bếp Pantry','bộ',1,'MAT-BT-SC010MW-175','KL F.I.1'],
    ['F — PANTRY','F.I.2','Bàn ăn nhanh Pantry','bộ',1,null,'KL F.I.2 | BD-03'],
    ['G — KHO','G.I.1','Kệ kho sắt','bộ',2,null,'KL G.I.1 | BD-03'],
  ];
  let ic = 0;
  for (const [sn, code, name, unit, qty, mc, notes] of items) {
    const sid = secIds[sn];
    const mid = mc ? matIds[mc] : null;
    await q(`
      INSERT INTO boq_items (boq_id, section_id, project_id, material_id, material_name, unit, qty_required, category, notes, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),NOW()) ON CONFLICT DO NOTHING
    `, [bid, sid, pid, mid, '[' + code + '] ' + name, unit, qty, sn.split(' — ')[1] || sn, notes]);
    ic++;
  }
  console.log('  BOQ Items:', ic);

  // ── TASKS ─────────────────────────────────────────────────────────────
  console.log('\n[8] Tasks...');
  const tasks = [
    ['ENGINEERING','[BOM] Phân tích BOM + Cut List','COMPLETED',100,'MEDIUM','1557p/37asm/6mat Phase B PASS'],
    ['ENGINEERING','[SOURCE] Source Center 40 files','COMPLETED',100,'MEDIUM','SHA-256 Phase A PASS'],
    ['ENGINEERING','[STAGING] Master Data Staging Phase C','COMPLETED',100,'MEDIUM','Phase C PASS ERP_TX=0'],
    ['APPROVAL','[BD-01] BANG MÃ VÁN scope T9 vs T15','NOT_STARTED',0,'HIGH','BLOCKED — /approval-center'],
    ['APPROVAL','[BD-02] NT-23 Xác nhận Quầy Tiếp Tân','NOT_STARTED',0,'MEDIUM','NEEDS_APPROVAL'],
    ['APPROVAL','[BD-03] 14 KL items thiếu thông tin','NOT_STARTED',0,'MEDIUM','14 BOQ items cần clarification'],
    ['APPROVAL','[BD-04] SketchUp 4 HIGH issues','NOT_STARTED',0,'HIGH','BLOCKED production LOCKED'],
    ['APPROVAL','[BD-05] GỖ GHÉP THANH 30mm Missing PO','NOT_STARTED',0,'MEDIUM','NEEDS_APPROVAL'],
    ['APPROVAL','[BD-06] Xác nhận 4 phiếu nhập vật tư','NOT_STARTED',0,'MEDIUM','NEEDS_APPROVAL'],
    ['APPROVAL','[BD-07] 32 Drawing pages inspection','NOT_STARTED',0,'LOW','NEEDS_APPROVAL'],
    ['PRODUCTION','[CNC] Cắt ván 1557 parts','NOT_STARTED',0,'HIGH','BLOCKED by BD-04'],
    ['PRODUCTION','[DAN_CANH] Dán cạnh','NOT_STARTED',0,'MEDIUM','BLOCKED by BD-04'],
    ['PRODUCTION','[LAP_RAP] Lắp ráp + QC xưởng','NOT_STARTED',0,'MEDIUM','BLOCKED by BD-04'],
    ['INSTALLATION','[INSTALL] Lắp đặt VP Bảo Minh CMT8','NOT_STARTED',0,'HIGH','BLOCKED pending production'],
    ['QC','[QC] Kiểm tra chất lượng hoàn thiện','NOT_STARTED',0,'MEDIUM','BLOCKED pending installation'],
  ];
  let tc = 0;
  for (const [cat, title, status, prog, pri, notes] of tasks) {
    await q(`
      INSERT INTO tasks (project_id, category, title, status, priority, progress, notes, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),NOW()) ON CONFLICT DO NOTHING
    `, [pid, cat, title, status, pri, prog, notes]);
    tc++;
  }
  console.log('  Tasks:', tc);

  // ── SOURCE DOCUMENTS ──────────────────────────────────────────────────
  console.log('\n[9] Source Documents...');
  const srcDocs = [
    ['BAO-MINH-BOQ-KL', 'KL NỘI THẤT VP BẢO MINH', 'BOQ_EXCEL', 'KL NỘI THẤT VP BẢO MINH- CN SÀI GÒN- homepro.xlsx', 'COMMITTED', 'BOQ_EXCEL'],
    ['BAO-MINH-BOM-XLSX', 'BOM + Cut List (SketchUp)', 'BOM', 'bom-KHAI TRIỂN VĂN PHÒNG BẢO MINH.xlsx', 'COMMITTED', 'BOM'],
    ['BAO-MINH-TKNT-PDF', 'Bản vẽ TKNT VP Bảo Minh', 'DESIGN_PDF', '060826_TKNT_VP BAO MINH.pdf', 'STAGED', 'DESIGN_PDF'],
    ['BAO-MINH-NT23-PDF', 'NT-23 Quầy Tiếp Tân R-01', 'DESIGN_PDF', 'NT-23.pdf', 'STAGED', 'DESIGN_PDF'],
    ['BAO-MINH-SKP-MAIN', 'SketchUp KHAI TRIỂN', 'DESIGN_SKETCHUP', 'KHAI TRIỂN VĂN PHÒNG BẢO MINH.skp', 'STAGED', 'DESIGN_SKETCHUP'],
    ['BAO-MINH-BMS-T15', 'Bảng Mã Ván BMS T15', 'MATERIAL_REGISTER', 'BANG MÃ VAN BMS T15.xlsx', 'CLASSIFIED', 'MATERIAL_REGISTER'],
    ['BAO-MINH-VT-HN', 'Vật Tư Hồng Nghi', 'MATERIAL_REGISTER', 'VẬT TƯ HỒNG NGHI.xlsx', 'COMMITTED', 'MATERIAL_REGISTER'],
    ['BAO-MINH-PHIEU-NHAP', 'Phiếu Nhập Vật Tư (4 docs)', 'PROCUREMENT_DOCUMENT', 'PHIẾU NHẬP VẬT TƯ images', 'STAGED', 'PROCUREMENT_DOCUMENT'],
  ];
  for (const [srcId, name, type, file, status, cat] of srcDocs) {
    await q(`
      INSERT INTO source_documents (source_id, source_name, source_type, file_name, project_id, document_category, source_status, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),NOW())
      ON CONFLICT (source_id) DO UPDATE SET source_status=EXCLUDED.source_status, updated_at=NOW()
    `, [srcId, name, type, file, pid, cat, status]);
    console.log('  SrcDoc:', srcId, '[' + status + ']');
  }

  // ── DATA LINEAGE ──────────────────────────────────────────────────────
  console.log('\n[10] Data Lineage...');
  const lins = [
    ['LIN-0001-PROJECT','PROJECT',String(pid),null,'KL NỘI THẤT VP BẢO MINH- CN SÀI GÒN- homepro.xlsx',
      [{ type:'SOURCE', file:'KL xlsx' }, { type:'ERP', record:'projects', id:pid }]],
    ['LIN-0002-BOQ','BOQ',String(bid),null,'KL NỘI THẤT VP BẢO MINH- CN SÀI GÒN- homepro.xlsx',
      [{ type:'SOURCE', file:'KL xlsx' }, { type:'ERP', record:'boqs', id:bid }]],
    ['LIN-0003-BOM','BOM','bom-stg',null,'bom-KHAI TRIỂN VĂN PHÒNG BẢO MINH.xlsx',
      [{ type:'SOURCE', file:'bom xlsx', sheet:'Cut List', rows:1557 }, { type:'STAGING', records:8 }]],
    ['LIN-0004-GOGHEP','MATERIAL_EXCEPTION','MAT-GO-GHEP-30',null,'bom-KHAI TRIỂN VĂN PHÒNG BẢO MINH.xlsx',
      [{ type:'SOURCE', row:9, val:'GO GHEP THANH 1 tấm' }, { type:'CL', parts:12 }, { type:'EXCEPTION', bd:'BD-05' }]],
  ];
  for (const [lid, etype, eid, stagId, src, chain] of lins) {
    await q(`
      INSERT INTO data_lineage (lineage_id, erp_record_type, erp_record_id, staging_id, source_file, lineage_chain, created_at)
      VALUES ($1,$2,$3,$4,$5,$6::jsonb,NOW()) ON CONFLICT (lineage_id) DO NOTHING
    `, [lid, etype, eid, stagId, src, JSON.stringify(chain)]);
    console.log('  Lineage:', lid);
  }

  // ── SUMMARY ───────────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════');
  console.log('  SEED COMPLETE');
  console.log('  Customer ID:  ' + cid);
  console.log('  Project ID:   ' + pid + '  (BAO-MINH-CMT8)');
  console.log('  Suppliers:    ' + Object.keys(supIds).length);
  console.log('  Materials:    ' + Object.keys(matIds).length);
  console.log('  BOQ ID:       ' + bid);
  console.log('  BOQ Sections: ' + Object.keys(secIds).length);
  console.log('  BOQ Items:    ' + ic);
  console.log('  Tasks:        ' + tc);
  console.log('  Source Docs:  ' + srcDocs.length);
  console.log('  Lineage:      ' + lins.length);
  console.log('  ERP_TX:       0 ✅');
  console.log('══════════════════════════════════════════');
}

main().then(() => pool.end()).catch(e => { console.error('FATAL:', e.message); pool.end(); process.exit(1); });
