/**
 * BAO MINH CMT8 — PHASE 1A: SOURCE INVENTORY
 * Quét toàn bộ source folder, tạo SHA256, phân loại file.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const XLSX = require('xlsx');

const SOURCE_ROOT = 'D:\\XƯỞNG HOMEPRO SG\\9. THÁNG 08.2026\\3. VĂN PHÒNG BẢO MINH';
const OUT_DIR = 'docs/projects/BAO-MINH-CMT8';
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

function sha256(filePath) {
  try {
    const buf = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(buf).digest('hex');
  } catch (e) {
    return 'ERROR:' + e.message.substring(0, 50);
  }
}

function getExt(name) {
  const m = name.match(/\.([^.]+)$/);
  return m ? m[1].toUpperCase() : 'NO_EXT';
}

function classifySourceType(name, ext) {
  const n = name.toLowerCase();
  if (ext === 'PDF') {
    if (n.includes('tknt') || n.includes('060826')) return 'TECHNICAL_DRAWING';
    if (n.includes('kl') || n.includes('boq') || n.includes('klnt')) return 'QUANTITY_SCHEDULE';
    if (n.includes('tkyt') || n.includes('hs ')) return 'TECHNICAL_DRAWING_PREV';
    if (n.includes('nt-')) return 'DRAWING_SINGLE';
    return 'PDF_DOCUMENT';
  }
  if (ext === 'XLSX' || ext === 'XLS') {
    if (n.includes('kl') || n.includes('boq')) return 'QUANTITY_SCHEDULE';
    if (n.includes('bang ma') || n.includes('bom')) return 'BOM_MATERIAL';
    if (n.includes('vat tu')) return 'MATERIAL_LIST';
    return 'SPREADSHEET';
  }
  if (ext === 'SKP' || ext === 'SKB') return '3D_MODEL_SKETCHUP';
  if (['JPG','JPEG','PNG','BMP','TIFF','WEBP'].includes(ext)) return 'PHOTO_IMAGE';
  if (['DOC','DOCX'].includes(ext)) return 'DOCUMENT';
  if (['DWG','DXF'].includes(ext)) return 'CAD_DRAWING';
  if (['ZIP','RAR','7Z'].includes(ext)) return 'ARCHIVE';
  return 'OTHER';
}

function likelyPurpose(name, type) {
  const n = name.toLowerCase();
  if (n.includes('060826_tknt')) return 'PRIMARY TECHNICAL DRAWING SET — Phase 1 source';
  if (n.includes('tkyt') || n.includes('26.07.22')) return 'Previous technical drawing set (older revision reference)';
  if (n.includes('kl noi that') && n.endsWith('.xlsx')) return 'QUANTITY/COMMERCIAL SOURCE — KL BOQ (Phase 1 KL processed)';
  if (n.includes('kl noi that') && n.endsWith('.pdf')) return 'PDF export of KL BOQ (reference copy)';
  if (n.includes('bang ma van bms t15') && n.includes('file boq')) return 'Material code table T15 (BOM reference) — in FILE BOQ';
  if (n.includes('bang ma van bms t15')) return 'Material code table T15 (BOM reference) — root copy';
  if (n.includes('bom-khai trien')) return 'BOM export from SketchUp Khai Triển (needs verification)';
  if (n.includes('khai trien') && (n.endsWith('.skp') || n.endsWith('.skb'))) return '3D model — Khai Triển VP Bảo Minh (SketchUp)';
  if (n.includes('nt-23')) return 'Single drawing NT-23 (separate PDF extract)';
  if (n.includes('vat tu hong nghi')) return 'Hồng Nghi material specification list';
  if (n.includes('untitled')) return 'Unnamed SketchUp file (unknown purpose)';
  if (type === 'PHOTO_IMAGE' && name.includes('KICH THUOC')) return 'Site measurement photo';
  if (type === 'PHOTO_IMAGE' && name.includes('VAT LIEU')) return 'Material sample photo';
  return 'Unknown — needs review';
}

function scanDir(dir, results) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
  catch (e) { return; }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanDir(fullPath, results);
    } else {
      const stat = fs.statSync(fullPath);
      const ext = getExt(entry.name);
      const type = classifySourceType(entry.name, ext);
      const relPath = fullPath.replace(SOURCE_ROOT, '').replace(/\\/g, '/');
      results.push({
        seq: results.length + 1,
        filename: entry.name,
        relative_path: relPath,
        full_path: fullPath,
        extension: ext,
        size_bytes: stat.size,
        size_kb: Math.round(stat.size / 1024),
        modified: stat.mtime.toISOString(),
        sha256: sha256(fullPath),
        source_type: type,
        likely_purpose: likelyPurpose(entry.name, type),
      });
    }
  }
}

console.log('Scanning:', SOURCE_ROOT);
const inventory = [];
scanDir(SOURCE_ROOT, inventory);
console.log(`Found ${inventory.length} files`);

// Save JSON
const jsonOut = path.join(OUT_DIR, '01-SOURCE-INVENTORY.json');
fs.writeFileSync(jsonOut, JSON.stringify({
  scan_date: new Date().toISOString(),
  source_root: SOURCE_ROOT,
  file_count: inventory.length,
  files: inventory,
}, null, 2), 'utf8');
console.log('Written:', jsonOut);

// Save Excel
const wb = XLSX.utils.book_new();
const headers = ['seq','filename','relative_path','extension','size_kb','modified','sha256','source_type','likely_purpose'];
const rows = inventory.map(f => headers.map(h => f[h]));
const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
ws['!cols'] = [{ wch:5 },{ wch:55 },{ wch:45 },{ wch:8 },{ wch:10 },{ wch:22 },{ wch:66 },{ wch:28 },{ wch:70 }];
XLSX.utils.book_append_sheet(wb, ws, 'SOURCE_INVENTORY');
XLSX.writeFile(wb, path.join(OUT_DIR, '01-SOURCE-INVENTORY.xlsx'));
console.log('Written: 01-SOURCE-INVENTORY.xlsx');

// Print summary
const byType = {};
inventory.forEach(f => { byType[f.source_type] = (byType[f.source_type]||0)+1; });
console.log('\nSource type breakdown:');
Object.entries(byType).sort((a,b)=>b[1]-a[1]).forEach(([t,c]) => console.log(`  ${t.padEnd(30)} : ${c}`));
console.log('\nTotal size:', Math.round(inventory.reduce((s,f)=>s+f.size_bytes,0)/1024/1024), 'MB');
