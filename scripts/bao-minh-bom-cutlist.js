/**
 * BAO MINH CMT8 — BOM CUT LIST ANALYSIS (REVISED)
 * Properly parse bom-KHAI TRIỂN VĂN PHÒNG BẢO MINH.xlsx
 * Sheet 1: BOM (21 rows approx)
 * Sheet 2: Cut List (~1000 rows)
 */

const fs   = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const BOM_FILE = 'D:\\XƯỞNG HOMEPRO SG\\9. THÁNG 08.2026\\3. VĂN PHÒNG BẢO MINH\\FILE BOQ\\bom-KHAI TRIỂN VĂN PHÒNG BẢO MINH.xlsx';
const OUT_DIR  = 'docs/projects/BAO-MINH-CMT8';
const GEN_AT   = new Date().toISOString();

console.log('═══════════════════════════════════════════════════════════');
console.log('  BAO MINH CMT8 — BOM + CUT LIST ANALYSIS');
console.log('═══════════════════════════════════════════════════════════');

if (!fs.existsSync(BOM_FILE)) {
  console.error('FATAL: BOM file not found:', BOM_FILE);
  process.exit(1);
}

const wb = XLSX.readFile(BOM_FILE);
console.log('Sheets:', wb.SheetNames);

// ─── SHEET 1: BOM ─────────────────────────────────────────────────────────
console.log('\n[1] Parsing BOM sheet...');
const bomWs = wb.Sheets['BOM'];
const bomRaw = XLSX.utils.sheet_to_json(bomWs, { header: 1, defval: null });
console.log(`  Total rows (including empties): ${bomRaw.length}`);
console.log(`  Row 0 (header): ${JSON.stringify(bomRaw[0])}`);

// Find actual data rows (filter empty)
const bomDataRows = bomRaw.filter((row, i) => {
  if (i === 0) return false; // skip header
  return row.some(cell => cell !== null && cell !== '');
});
console.log(`  Data rows: ${bomDataRows.length}`);

// BOM headers from row 0
const bomHeaders = bomRaw[0] || [];
console.log(`  Headers: ${bomHeaders.join(' | ')}`);

const bomItems = bomDataRows.map((row, idx) => {
  const obj = {};
  bomHeaders.forEach((h, i) => {
    if (h !== null && h !== '') obj[String(h).trim()] = row[i];
  });
  return { row_idx: idx + 2, ...obj };
});

// Print all BOM items
console.log('\n  BOM Items:');
bomItems.forEach(item => {
  const vals = Object.entries(item)
    .filter(([k,v]) => v !== null && v !== '' && k !== 'row_idx')
    .map(([k,v]) => `${k}=${v}`)
    .join(', ');
  if (vals) console.log(`    Row ${item.row_idx}: ${vals}`);
});

// ─── SHEET 2: CUT LIST ────────────────────────────────────────────────────
console.log('\n[2] Parsing Cut List sheet...');
const clWs = wb.Sheets['Cut List'];
const clRaw = XLSX.utils.sheet_to_json(clWs, { header: 1, defval: null });
console.log(`  Total rows (including empties): ${clRaw.length}`);
console.log(`  Row 0 (header): ${JSON.stringify(clRaw[0])}`);
console.log(`  Row 1 (sample): ${JSON.stringify(clRaw[1])}`);
console.log(`  Row 2 (sample): ${JSON.stringify(clRaw[2])}`);
console.log(`  Row 10 (sample): ${JSON.stringify(clRaw[10])}`);
console.log(`  Row 50 (sample): ${JSON.stringify(clRaw[50])}`);
console.log(`  Row 100 (sample): ${JSON.stringify(clRaw[100])}`);

// Find the actual header row (may not be row 0)
let headerRowIdx = 0;
for (let i = 0; i < Math.min(10, clRaw.length); i++) {
  const row = clRaw[i];
  const nonNull = row.filter(c => c !== null && c !== '');
  if (nonNull.length >= 4) {
    // Check if looks like a header (has common column names)
    const rowStr = row.join(' ').toLowerCase();
    if (rowStr.includes('id') || rowStr.includes('tên') || rowStr.includes('vật liệu') ||
        rowStr.includes('material') || rowStr.includes('name') || rowStr.includes('chiều')) {
      headerRowIdx = i;
      console.log(`  Found header at row ${i}: ${JSON.stringify(row)}`);
      break;
    }
  }
}

const clHeaders = clRaw[headerRowIdx] || [];
console.log(`\n  Using headers from row ${headerRowIdx}: ${clHeaders.join(' | ')}`);

// Parse data rows (after header, skip fully empty rows)
const clDataRows = [];
for (let i = headerRowIdx + 1; i < clRaw.length; i++) {
  const row = clRaw[i];
  if (!row) continue;
  const nonNull = row.filter(c => c !== null && c !== '' && c !== undefined);
  if (nonNull.length >= 2) { // at least 2 non-empty cells
    const obj = { _row: i + 1 };
    clHeaders.forEach((h, j) => {
      const key = (h !== null && h !== '') ? String(h).trim() : `col_${j}`;
      obj[key] = row[j];
    });
    clDataRows.push(obj);
  }
}

console.log(`\n  Data rows after header: ${clDataRows.length}`);

// Identify key columns by name pattern
const colMaps = {};
clHeaders.forEach((h, i) => {
  if (!h) return;
  const hs = String(h).toLowerCase().trim();
  if (hs.includes('id') || hs === '#') colMaps.id = h;
  else if (hs.includes('tên') || hs.includes('name') || hs.includes('chi tiết')) colMaps.name = h;
  else if (hs.includes('nhóm') || hs.includes('group') || hs.includes('tên nhóm')) colMaps.group = h;
  else if (hs.includes('vật liệu') || hs.includes('material')) colMaps.material = h;
  else if (hs.includes('dày') || hs.includes('thickness') || hs.includes('t(mm)')) colMaps.thickness = h;
  else if (hs.includes('rộng') || hs.includes('width') || hs.includes('w(mm)')) colMaps.width = h;
  else if (hs.includes('dài') || hs.includes('length') || hs.includes('l(mm)')) colMaps.length = h;
  else if (hs.includes('số lượng') || hs.includes('qty') || hs.includes('sl')) colMaps.qty = h;
  else if (hs.includes('cạnh') || hs.includes('edge') || hs.includes('dán')) colMaps.edge = h;
  else if (hs.includes('chiều') || hs.includes('grain') || hs.includes('thớ')) colMaps.grain = h;
  else if (hs.includes('ghi chú') || hs.includes('note')) colMaps.note = h;
});
console.log('\n  Column mapping:', JSON.stringify(colMaps));

// Print first 20 data rows
console.log('\n  First 20 Cut List rows:');
clDataRows.slice(0, 20).forEach(r => {
  const id   = r[colMaps.id] || r['ID'] || r['col_0'] || '';
  const name = r[colMaps.name] || r['Tên chi tiết'] || '';
  const grp  = r[colMaps.group] || r['Tên nhóm'] || '';
  const mat  = r[colMaps.material] || r['Vật liệu'] || '';
  const thk  = r[colMaps.thickness] || '';
  const w    = r[colMaps.width] || '';
  const l    = r[colMaps.length] || '';
  const qty  = r[colMaps.qty] || '';
  console.log(`    Row ${r._row}: id=${id} | name=${String(name).substring(0,30)} | group=${String(grp).substring(0,20)} | mat=${String(mat).substring(0,20)} | ${thk}×${w}×${l} | qty=${qty}`);
});

// Statistics
const groups = new Set();
const materials = new Set();
const qcIssues = [];

clDataRows.forEach(r => {
  const grp = r[colMaps.group];
  const mat = r[colMaps.material];
  const qty = r[colMaps.qty];
  const id  = r[colMaps.id];
  const w   = r[colMaps.width];
  const l   = r[colMaps.length];
  const thk = r[colMaps.thickness];

  if (grp && String(grp).trim()) groups.add(String(grp).trim());
  if (mat && String(mat).trim()) materials.add(String(mat).trim());

  // QC checks
  if (!mat || String(mat).trim() === '') qcIssues.push({ row: r._row, type: 'MISSING_MATERIAL', id });
  if ((!w || !l) && !String(r[colMaps.name]||'').toLowerCase().includes('header'))
    qcIssues.push({ row: r._row, type: 'MISSING_DIMENSION', id });
  if (qty !== null && qty !== undefined && Number(qty) === 0)
    qcIssues.push({ row: r._row, type: 'QTY_ZERO', id });
});

console.log('\n  Statistics:');
console.log(`    Total data rows: ${clDataRows.length}`);
console.log(`    Unique groups: ${groups.size}`);
console.log(`    Unique materials: ${materials.size}`);
console.log(`    QC issues: ${qcIssues.length}`);
console.log(`    Groups: ${[...groups].slice(0,20).join(', ')}`);
console.log(`    Materials: ${[...materials].slice(0,10).join(', ')}`);

// Group breakdown
const groupBreakdown = {};
clDataRows.forEach(r => {
  const grp = r[colMaps.group] ? String(r[colMaps.group]).trim() : '(no group)';
  if (!groupBreakdown[grp]) groupBreakdown[grp] = { count: 0, materials: new Set() };
  groupBreakdown[grp].count++;
  const mat = r[colMaps.material];
  if (mat) groupBreakdown[grp].materials.add(String(mat).trim());
});

console.log('\n  Group breakdown (top 30):');
Object.entries(groupBreakdown).slice(0, 30).forEach(([g, v]) => {
  console.log(`    ${g}: ${v.count} parts, materials: ${[...v.materials].slice(0,3).join(', ')}`);
});

// ─── Save results ─────────────────────────────────────────────────────────
const result = {
  generated_at: GEN_AT,
  source_file: BOM_FILE,
  sheets: wb.SheetNames,
  bom: {
    headers: bomHeaders,
    total_rows: bomDataRows.length,
    items: bomItems
  },
  cut_list: {
    total_rows: clRaw.length,
    data_rows: clDataRows.length,
    header_row_idx: headerRowIdx,
    headers: clHeaders,
    col_maps: colMaps,
    unique_groups: [...groups],
    unique_materials: [...materials],
    group_count: groups.size,
    material_count: materials.size,
    group_breakdown: Object.fromEntries(
      Object.entries(groupBreakdown).map(([g, v]) => [g, { count: v.count, materials: [...v.materials] }])
    ),
    qc_issues: {
      total: qcIssues.length,
      missing_material: qcIssues.filter(q => q.type === 'MISSING_MATERIAL').length,
      missing_dimension: qcIssues.filter(q => q.type === 'MISSING_DIMENSION').length,
      qty_zero: qcIssues.filter(q => q.type === 'QTY_ZERO').length,
      sample: qcIssues.slice(0, 20)
    }
  }
};

fs.writeFileSync(path.join(OUT_DIR, 'bom-cutlist-analysis.json'), JSON.stringify(result, null, 2), 'utf8');
console.log('\n  Written: bom-cutlist-analysis.json');
console.log('\n═══════════════════════════════════════════════════════════');
console.log('  BOM PARSE COMPLETE — check bom-cutlist-analysis.json');
console.log('═══════════════════════════════════════════════════════════');
