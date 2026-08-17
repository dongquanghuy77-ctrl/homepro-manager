/**
 * BAO MINH CMT8 — DESIGN INGESTION PHASES 1–3
 * Phase 1: Source Discovery
 * Phase 2: PDF Analysis (35-page design PDF)
 * Phase 3: Source Traceability (technical_document_pages)
 *
 * SOURCE PDF: 26.07.22 HS TKYT NOI THAT VP BAO MINH CHI NHANH.pdf
 * CONTROL: DO NOT infer quantities, prices, BOM, BOQ from 3D images.
 */
const fs   = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const crypto = require('crypto');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

// ══════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════
const SRC_DIR  = 'D:\\XƯỞNG HOMEPRO SG\\9. THÁNG 08.2026\\3. VĂN PHÒNG BẢO MINH';
const DESIGN_PDF = path.join(SRC_DIR, '26.07.22 HS TKYT NOI THAT VP BAO MINH CHI NHANH.pdf');
const TECH_PDF   = path.join(SRC_DIR, '060826_TKNT_VP BAO MINH.pdf');
const OUT_DIR    = 'docs/projects/BAO-MINH-CMT8';
const PROJECT_ID = 'BAO-MINH-CMT8';
const DOCUMENT_ID = 'BAO-MINH-CMT8-DESIGN-V01';

// SOURCE-DERIVED CONSTANTS (from directive — do not infer)
const SOURCE_META = {
  design_type:    'Interior Design I',
  version:        '01',
  date:           '07/2026',
  project_name:   'VĂN PHÒNG CHỨNG KHOÁN BẢO MINH CHI NHÁNH CMT8 - TP HỒ CHÍ MINH',
  owner:          'Công ty Cổ phần Chứng khoán Bảo Minh (BMSC)',
  floor:          'Tầng 15',
  address:        '201–203 Cách Mạng Tháng Tám, P.Bàn Cờ, Q.3, TP.HCM',
  survey_area_m2: 326.56,
  survey_area_source: 'PDF Page 2 — MẶT BẰNG HIỆN TRẠNG VP TẦNG 15',
};

// Page type hints from directive
const PAGE_HINTS = {
  1: { page_type: 'COVER',        title: 'Bìa / Project Information',         zone: 'ALL',       design_option: 'V01' },
  2: { page_type: 'EXISTING_PLAN',title: 'MẶT BẰNG HIỆN TRẠNG VP TẦNG 15',  zone: 'ALL',       design_option: 'EXISTING' },
  3: { page_type: 'DESIGN_PLAN',  title: 'Mặt bằng thiết kế',                zone: 'ALL',       design_option: 'V01' },
};
// Pages 4+ are 3D perspectives — zone identified from text extraction

// Zones to identify
const ZONE_KEYWORDS = {
  'CHU-TICH':   { name_vi: 'Phòng Chủ Tịch',            name_en: 'Chairman Room',         code: 'ZONE-CT' },
  'GIAM-DOC':   { name_vi: 'Phòng Giám Đốc Chi Nhánh',  name_en: 'Branch Director Room',  code: 'ZONE-GD' },
  'LAM-VIEC':   { name_vi: 'Phòng Làm Việc',             name_en: 'Open Office',           code: 'ZONE-LV' },
  'SANH':       { name_vi: 'Sảnh Chính',                 name_en: 'Main Lobby',            code: 'ZONE-SH' },
  'HOP':        { name_vi: 'Phòng Họp',                  name_en: 'Meeting Room',          code: 'ZONE-HP' },
  'PANTRY':     { name_vi: 'Pantry',                     name_en: 'Pantry',                code: 'ZONE-PT' },
  'KHO':        { name_vi: 'Kho',                        name_en: 'Storage Room',          code: 'ZONE-KH' },
  'HANH-LANG':  { name_vi: 'Hành Lang',                  name_en: 'Corridor',              code: 'ZONE-HL' },
};

// ══════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════
function fileHash(filePath) {
  try {
    const buf = fs.readFileSync(filePath);
    return crypto.createHash('md5').update(buf).digest('hex');
  } catch { return null; }
}

function classifyFile(name, ext) {
  const n = name.toLowerCase();
  const e = (ext||'').toLowerCase();
  if (e === '.pdf') {
    if (n.includes('tknt') || n.includes('tkyt') || n.includes('hs tkyt') || n.includes('hs_tkyt')) return 'PDF_TECHNICAL_DESIGN';
    if (n.includes('nt-') || n.includes('bang ma') || n.includes('shop')) return 'PDF_SHOP_DRAWING';
    return 'PDF_OTHER';
  }
  if (e === '.xlsx' || e === '.xls') {
    if (n.includes('kl ') || n.includes('kl_') || n.includes('noi that')) return 'EXCEL_BOQ_KL';
    if (n.includes('bang ma') || n.includes('bms')) return 'EXCEL_MATERIAL_CODE';
    if (n.includes('vat tu') || n.includes('hong nghi')) return 'EXCEL_MATERIAL_SPEC';
    if (n.includes('bom') || n.includes('khai trien')) return 'EXCEL_BOM_DRAFT';
    return 'EXCEL_OTHER';
  }
  if (e === '.skp') return 'CAD_SKETCHUP_MODEL';
  if (e === '.skb') return 'CAD_SKETCHUP_BACKUP';
  if (['.dwg','.dxf'].includes(e)) return 'CAD_DRAWING';
  if (['.jpg','.jpeg','.png','.bmp','.tif','.tiff'].includes(e)) return 'IMAGE';
  if (e === '.zip') return 'ARCHIVE';
  if (['.doc','.docx','.pdf'].includes(e)) return 'DOCUMENT';
  return 'OTHER';
}

function detectZone(text) {
  const t = (text||'').toLowerCase()
    .replace(/đ/g,'d').replace(/ă/g,'a').replace(/â/g,'a').replace(/ê/g,'e').replace(/ô/g,'o')
    .replace(/ơ/g,'o').replace(/ư/g,'u').replace(/á|à|ả|ã|ạ/g,'a').replace(/é|è|ẻ|ẽ|ẹ/g,'e')
    .replace(/í|ì|ỉ|ĩ|ị/g,'i').replace(/ó|ò|ỏ|õ|ọ/g,'o').replace(/ú|ù|ủ|ũ|ụ/g,'u')
    .replace(/ý|ỳ|ỷ|ỹ|ỵ/g,'y');
  const zones = [];
  if (t.includes('chu tich') || t.includes('chairman')) zones.push('CHU-TICH');
  if (t.includes('giam doc') || t.includes('gd cn') || t.includes('branch director')) zones.push('GIAM-DOC');
  if ((t.includes('lam viec') || t.includes('nhan vien') || t.includes('open office')) && !t.includes('giam doc')) zones.push('LAM-VIEC');
  if (t.includes('sanh') || t.includes('lobby') || t.includes('reception')) zones.push('SANH');
  if (t.includes('hop') && !t.includes('hop dong')) zones.push('HOP');
  if (t.includes('pantry') || t.includes('pan try')) zones.push('PANTRY');
  if (t.includes('kho') && !t.includes('khong')) zones.push('KHO');
  if (t.includes('hanh lang') || t.includes('corridor')) zones.push('HANH-LANG');
  return zones;
}

function detectPA2(text) {
  const t = (text||'').toUpperCase();
  return t.includes('PA2') || t.includes('PA 2') || t.includes('PHƯƠNG ÁN 2') || t.includes('PHUONG AN 2');
}

function detectPA1(text) {
  const t = (text||'').toUpperCase();
  return t.includes('PA1') || t.includes('PA 1') || t.includes('PHƯƠNG ÁN 1') || t.includes('PHUONG AN 1');
}

function detectPageType(text, pageNum) {
  const t = (text||'').toLowerCase();
  if (pageNum === 1) return 'COVER';
  if (pageNum === 2) return 'EXISTING_PLAN';
  if (pageNum === 3) return 'DESIGN_PLAN';
  if (t.includes('mat bang') || t.includes('floor plan') || t.includes('mặt bằng')) return 'FLOOR_PLAN';
  if (t.includes('phoi canh') || t.includes('phối cảnh') || t.includes('3d') || t.includes('perspective') || t.includes('noi that')) return '3D_PERSPECTIVE';
  if (t.includes('chi tiet') || t.includes('chi tiết') || t.includes('detail')) return 'DETAIL';
  if (t.includes('elevation') || t.includes('立面') || t.includes('khai trien') || t.includes('khai triển')) return 'ELEVATION';
  return '3D_PERSPECTIVE'; // default for pages 4+ in design PDF
}

async function extractPageText(pdfDoc, pageNum) {
  try {
    const page = await pdfDoc.getPage(pageNum);
    const content = await page.getTextContent();
    return content.items.map(item => item.str||'').join(' ').trim();
  } catch(e) { return ''; }
}

// ══════════════════════════════════════════
// PHASE 1 — SOURCE DISCOVERY
// ══════════════════════════════════════════
async function phase1_sourceDiscovery() {
  console.log('\n══════════════ PHASE 1: SOURCE DISCOVERY ══════════════');
  const inventory = [];

  function scanDir(dirPath, level) {
    let entries;
    try { entries = fs.readdirSync(dirPath, { withFileTypes: true }); } catch(e) { return; }
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        scanDir(fullPath, level + 1);
        continue;
      }
      const ext = path.extname(entry.name);
      let stat;
      try { stat = fs.statSync(fullPath); } catch { continue; }

      // Determine source priority
      let sourcePriority = 'REFERENCE';
      if (entry.name === '26.07.22 HS TKYT NOI THAT VP BAO MINH CHI NHANH.pdf') sourcePriority = 'PRIMARY_DESIGN';
      else if (entry.name === '060826_TKNT_VP BAO MINH.pdf') sourcePriority = 'PRIMARY_TECHNICAL';
      else if (ext === '.xlsx' && entry.name.includes('KL ')) sourcePriority = 'PRIMARY_COMMERCIAL';
      else if (ext === '.xlsx') sourcePriority = 'SUPPORTING';
      else if (ext === '.skp') sourcePriority = 'SUPPORTING_3D';

      // Version detection from filename
      let version = null;
      const vMatch = entry.name.match(/(?:v|ver|version|rev|r)\.?\s*(\d+)/i);
      if (vMatch) version = vMatch[1];
      if (entry.name.includes('26.07.22')) version = '01 (2022)';
      if (entry.name.includes('060826')) version = 'REV 0 (2026-08-06)';

      const fileHash_ = sourcePriority !== 'SUPPORTING_3D' ? fileHash(fullPath) : null;

      inventory.push({
        filename: entry.name,
        extension: ext || '(none)',
        path: fullPath,
        relative_path: path.relative(SRC_DIR, fullPath),
        size_bytes: stat.size,
        size_mb: (stat.size / 1024 / 1024).toFixed(2),
        modified: stat.mtime.toISOString(),
        hash_md5: fileHash_,
        classification: classifyFile(entry.name, ext),
        version,
        source_priority: sourcePriority,
        notes: '',
      });
    }
  }

  scanDir(SRC_DIR, 0);

  // Sort by source priority
  const PRIORITY_ORDER = { PRIMARY_DESIGN:1, PRIMARY_TECHNICAL:2, PRIMARY_COMMERCIAL:3, SUPPORTING:4, SUPPORTING_3D:5, REFERENCE:6 };
  inventory.sort((a,b) => (PRIORITY_ORDER[a.source_priority]||9) - (PRIORITY_ORDER[b.source_priority]||9));

  console.log(`  Found ${inventory.length} files`);
  inventory.forEach(f => console.log(`  [${f.source_priority}] ${f.filename} (${f.size_mb}MB)`));

  // Save JSON
  fs.writeFileSync(path.join(OUT_DIR, 'source-inventory.json'), JSON.stringify({ generated: new Date().toISOString(), project_id: PROJECT_ID, total_files: inventory.length, files: inventory }, null, 2), 'utf8');

  // Save MD
  const md = `# SOURCE INVENTORY — BAO MINH CMT8
## Quét thư mục: D:\\XƯỞNG HOMEPRO SG\\9. THÁNG 08.2026\\3. VĂN PHÒNG BẢO MINH
**Generated:** ${new Date().toISOString()} | **Total Files:** ${inventory.length}

## Version Control

| Version | File | Status |
|---|---|---|
| V01 (Design) | 26.07.22 HS TKYT NOI THAT VP BAO MINH CHI NHANH.pdf | ✅ PRIMARY DESIGN — THIS DIRECTIVE |
| REV 0 (Technical) | 060826_TKNT_VP BAO MINH.pdf | ✅ PRIMARY TECHNICAL (Phase 1 prior) |

> KHÔNG ghi đè file nào. Không xoá phiên bản cũ.

## File Inventory

| Priority | Filename | Size | Modified | Classification | Version |
|---|---|---|---|---|---|
${inventory.map(f => `| ${f.source_priority} | ${f.filename} | ${f.size_mb}MB | ${f.modified.slice(0,10)} | ${f.classification} | ${f.version||'—'} |`).join('\n')}

## Classification Summary

| Classification | Count |
|---|---|
${Object.entries(inventory.reduce((acc,f) => { acc[f.classification]=(acc[f.classification]||0)+1; return acc; }, {})).map(([k,v]) => `| ${k} | ${v} |`).join('\n')}
`;
  fs.writeFileSync(path.join(OUT_DIR, 'source-inventory.md'), md, 'utf8');

  // Save XLSX
  const wb = XLSX.utils.book_new();
  const headers = ['filename','extension','path','size_bytes','size_mb','modified','hash_md5','classification','version','source_priority','notes'];
  const data = inventory.map(f => headers.map(h => f[h]));
  const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
  ws['!cols'] = [{ wch:55 },{ wch:8 },{ wch:80 },{ wch:10 },{ wch:8 },{ wch:22 },{ wch:34 },{ wch:25 },{ wch:15 },{ wch:20 },{ wch:30 }];
  XLSX.utils.book_append_sheet(wb, ws, 'SOURCE_INVENTORY');
  XLSX.writeFile(wb, path.join(OUT_DIR, 'source-inventory.xlsx'));

  console.log('  ✅ Written: source-inventory.json/md/xlsx');
  return inventory;
}

// ══════════════════════════════════════════
// PHASE 2 — PDF ANALYSIS
// ══════════════════════════════════════════
async function phase2_pdfAnalysis() {
  console.log('\n══════════════ PHASE 2: PDF ANALYSIS ══════════════');

  // Check file
  if (!fs.existsSync(DESIGN_PDF)) {
    throw new Error(`DESIGN PDF NOT FOUND: ${DESIGN_PDF}`);
  }
  const stat = fs.statSync(DESIGN_PDF);
  console.log(`  File: ${path.basename(DESIGN_PDF)}`);
  console.log(`  Size: ${(stat.size/1024/1024).toFixed(2)}MB`);

  const buf = fs.readFileSync(DESIGN_PDF);
  const uint8 = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  const loadTask = pdfjsLib.getDocument({ data: uint8 });
  const pdfDoc = await loadTask.promise;
  const numPages = pdfDoc.numPages;
  console.log(`  Pages: ${numPages}`);

  const pageAnalyses = [];
  let hasPA2 = false;
  const pa2Pages = [];
  const pa1Pages = [];
  const zonesFound = new Set();

  for (let i = 1; i <= numPages; i++) {
    const text = await extractPageText(pdfDoc, i);
    const hint = PAGE_HINTS[i];
    const isPA2 = detectPA2(text);
    const isPA1 = detectPA1(text);
    const zones = detectZone(text);
    const pageType = hint ? hint.page_type : detectPageType(text, i);
    let designOption = hint ? hint.design_option : 'V01';
    if (isPA2) { designOption = 'PA2'; hasPA2 = true; pa2Pages.push(i); }
    if (isPA1) pa1Pages.push(i);
    zones.forEach(z => zonesFound.add(z));

    // Detect title from text
    let title = hint ? hint.title : '';
    if (!title) {
      // Try to extract title from first significant line
      const lines = text.split(/\s{3,}|\n/).filter(l => l.trim().length > 3);
      title = lines.slice(0,3).join(' | ').substring(0,80) || `Page ${i}`;
    }

    // Detect materials in perspectives (LOG ONLY — no BOQ creation)
    const materialKW = ['MDF','MFC','Melamin','Mica','Inox','Gold','gương','kính','thảm','rèm','len','laminate','PVC','than tre','simili'];
    const materialsDetected = materialKW.filter(kw => text.includes(kw));

    pageAnalyses.push({
      page_number: i,
      page_type: pageType,
      title: title || `Page ${i}`,
      zone: zones.join(', ') || (hint ? hint.zone : 'UNRESOLVED_ZONE'),
      design_option: designOption,
      is_pa2: isPA2,
      is_pa1: isPA1,
      zones_detected: zones,
      materials_detected_log: materialsDetected,
      text_chars: text.length,
      text_preview: text.substring(0, 120).replace(/\n/g,' '),
      has_boq_data: false,   // CONTROL: no BOQ from 3D
      has_quantity: false,   // CONTROL
      has_price: false,      // CONTROL
      control_note: pageType === '3D_PERSPECTIVE' ? 'DESIGN REFERENCE ONLY — NO BOQ CREATION' : '',
      source_file: path.basename(DESIGN_PDF),
      confidence: text.length > 100 ? 'HIGH' : (text.length > 20 ? 'MEDIUM' : 'LOW_TEXT_LAYER'),
    });

    process.stdout.write(`  Page ${String(i).padStart(2,'0')}/${numPages}: ${pageType.padEnd(20)} zone=${zones[0]||'—'} opt=${designOption} chars=${text.length}\n`);
  }

  const pdfMeta = {
    filename: path.basename(DESIGN_PDF),
    path: DESIGN_PDF,
    size_bytes: stat.size,
    num_pages: numPages,
    design_type: SOURCE_META.design_type,
    version: SOURCE_META.version,
    date: SOURCE_META.date,
    project_name: SOURCE_META.project_name,
    owner: SOURCE_META.owner,
    floor: SOURCE_META.floor,
    address: SOURCE_META.address,
    has_pa2: hasPA2,
    pa2_pages: pa2Pages,
    pa1_pages: pa1Pages,
    zones_found: Array.from(zonesFound),
    page_analyses: pageAnalyses,
    extraction_method: 'pdfjs-dist@3.11.174 text layer',
    extracted_at: new Date().toISOString(),
  };

  fs.writeFileSync(path.join(OUT_DIR, 'design-pdf-analysis.json'), JSON.stringify(pdfMeta, null, 2), 'utf8');
  console.log('\n  PDF Analysis summary:');
  console.log(`    Total pages   : ${numPages}`);
  console.log(`    Has PA2       : ${hasPA2} ${pa2Pages.length ? '— Pages: '+pa2Pages.join(',') : ''}`);
  console.log(`    Has PA1       : ${pa1Pages.length > 0} ${pa1Pages.length ? '— Pages: '+pa1Pages.join(',') : ''}`);
  console.log(`    Zones found   : ${Array.from(zonesFound).join(', ')||'(detected from page keyword hints)'}`);
  console.log('  ✅ Written: design-pdf-analysis.json');

  return { numPages, pageAnalyses, hasPA2, pa2Pages, zonesFound, pdfMeta };
}

// ══════════════════════════════════════════
// PHASE 3 — SOURCE TRACEABILITY
// ══════════════════════════════════════════
async function phase3_traceability(numPages, pageAnalyses) {
  console.log('\n══════════════ PHASE 3: SOURCE TRACEABILITY ══════════════');

  const docPages = pageAnalyses.map(pa => ({
    project_id:          PROJECT_ID,
    document_id:         DOCUMENT_ID,
    page_number:         pa.page_number,
    page_type:           pa.page_type,
    title:               pa.title,
    zone:                pa.zone,
    design_option:       pa.design_option,
    is_pa2:              pa.is_pa2,
    source_file:         pa.source_file,
    source_path:         DESIGN_PDF,
    extraction_status:   pa.text_chars > 20 ? 'TEXT_EXTRACTED' : 'IMAGE_ONLY_NO_TEXT',
    confidence:          pa.confidence,
    materials_detected:  pa.materials_detected_log.join('; '),
    control_note:        pa.control_note,
    has_boq_data:        false,
    has_quantity:        false,
    has_price:           false,
    zones_detected:      pa.zones_detected.join(', '),
    text_chars:          pa.text_chars,
    text_preview:        pa.text_preview,
  }));

  // Save JSON
  fs.writeFileSync(
    path.join(OUT_DIR, 'technical_document_pages.json'),
    JSON.stringify({ document_id: DOCUMENT_ID, project_id: PROJECT_ID, total_pages: numPages, pages: docPages }, null, 2),
    'utf8'
  );

  // Save XLSX
  const wb = XLSX.utils.book_new();
  const headers = ['project_id','document_id','page_number','page_type','title','zone','design_option','is_pa2',
    'source_file','extraction_status','confidence','materials_detected','control_note','has_boq_data','has_quantity','has_price','zones_detected','text_chars','text_preview'];
  const data = docPages.map(p => headers.map(h => p[h]));
  const ws = XLSX.utils.aoa_to_sheet([headers,...data]);
  ws['!cols'] = [{wch:16},{wch:25},{wch:8},{wch:18},{wch:55},{wch:25},{wch:12},{wch:7},
    {wch:45},{wch:18},{wch:8},{wch:40},{wch:45},{wch:8},{wch:8},{wch:8},{wch:25},{wch:8},{wch:80}];
  XLSX.utils.book_append_sheet(wb, ws, 'DOCUMENT_PAGES');

  // PA2 pages sheet
  const pa2Data = docPages.filter(p=>p.is_pa2);
  if (pa2Data.length > 0) {
    const wsPA2 = XLSX.utils.aoa_to_sheet([headers,...pa2Data.map(p=>headers.map(h=>p[h]))]);
    XLSX.utils.book_append_sheet(wb, wsPA2, 'PA2_PAGES');
  }

  XLSX.writeFile(wb, path.join(OUT_DIR, 'technical_document_pages.xlsx'));

  // Generate MD
  const md = `# TECHNICAL DOCUMENT PAGES
## ${DOCUMENT_ID}
**Generated:** ${new Date().toISOString()} | **Total Pages:** ${numPages}

### Control Notice
> PAGES 4+ ARE DESIGN REFERENCES ONLY.
> NO BOQ, NO QTY, NO PRICE, NO BOM MAY BE CREATED FROM 3D PERSPECTIVE PAGES.
> PA2 PAGES ARE TRACKED SEPARATELY — KHÔNG TRỘN VỚI V01.

## Page Register

| Page | Type | Title | Zone | Design Option | Extraction | Confidence |
|---|---|---|---|---|---|---|
${docPages.map(p => `| ${p.page_number} | ${p.page_type} | ${p.title.substring(0,40)} | ${p.zone.substring(0,25)} | ${p.design_option} | ${p.extraction_status} | ${p.confidence} |`).join('\n')}

## PA2 Pages (Separate Design Option)

${pa2Data.length > 0
  ? pa2Data.map(p=>`- Page ${p.page_number}: ${p.title} → Zone: ${p.zone}`).join('\n')
  : '- Không phát hiện PA2 trong text layer. Xem design-pdf-analysis.json để xác nhận.'}

## Zone Detection

| Zone Key | Zone Name | Pages Detected |
|---|---|---|
${Object.entries(ZONE_KEYWORDS).map(([key,z]) => {
  const pgs = docPages.filter(p=>p.zones_detected.includes(key)).map(p=>p.page_number);
  return `| ${key} | ${z.name_vi} | ${pgs.length > 0 ? pgs.join(', ') : '— (text layer limited)'}  |`;
}).join('\n')}
`;
  fs.writeFileSync(path.join(OUT_DIR, 'technical_document_pages.md'), md, 'utf8');

  console.log(`  ✅ Written: technical_document_pages.json/xlsx/md`);
  console.log(`  PA2 pages (detected): ${pa2Data.length}`);
  return docPages;
}

// ══════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════
async function main() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║  BAO MINH CMT8 — DESIGN INGESTION PHASES 1–3          ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log(`  Start: ${new Date().toISOString()}`);
  console.log(`  Design PDF: ${path.basename(DESIGN_PDF)}`);

  const inventory = await phase1_sourceDiscovery();
  const { numPages, pageAnalyses, hasPA2, pa2Pages, zonesFound, pdfMeta } = await phase2_pdfAnalysis();
  const docPages = await phase3_traceability(numPages, pageAnalyses);

  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║  PHASES 1–3 COMPLETE                                   ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log(`  Files discovered : ${inventory.length}`);
  console.log(`  PDF pages        : ${numPages}`);
  console.log(`  PA2 detected     : ${hasPA2} (pages: ${pa2Pages.join(',')||'none in text layer'})`);
  console.log(`  Zones in text    : ${Array.from(zonesFound).join(', ')||'(image-based pages)'}`);
  console.log(`  Doc page records : ${docPages.length}`);

  // Return summary for phases 4-12
  return { inventory, numPages, pageAnalyses, docPages, hasPA2, pa2Pages, pdfMeta, zonesFound };
}

main().then(result => {
  fs.writeFileSync(path.join(OUT_DIR, '_phase1-3-result.json'), JSON.stringify(result, null, 2), 'utf8');
  console.log('\n  ✅ Phase 1-3 result saved for phases 4-12.');
}).catch(e => { console.error('FATAL:', e.message, '\n', e.stack); process.exit(1); });
