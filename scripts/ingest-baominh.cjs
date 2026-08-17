const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_dbPWisDQA8F6@ep-floral-union-az31v0st.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
});

function classify(filePath, fileName) {
  const name = fileName.toLowerCase();
  const lowerPath = filePath.toLowerCase();
  const ext = path.extname(name).replace('.', '');

  if (ext === 'skp' || ext === 'skb') return { category: 'DESIGN_SKETCHUP', confidence: 0.99, routedTo: 'engineering/designs' };
  
  if (ext === 'xlsx' || ext === 'xls') {
    if (lowerPath.includes('boq') || name.includes('kl') || name.includes('khoi luong') || name.includes('bom')) return { category: 'BOQ_EXCEL', confidence: 0.95, routedTo: 'crm/boq' };
    if (name.includes('vat tu') || name.includes('vật tư') || name.includes('material')) return { category: 'BOQ_EXCEL', confidence: 0.90, routedTo: 'inventory/materials' };
    return { category: 'BOQ_EXCEL', confidence: 0.70, routedTo: 'crm/boq' };
  }
  
  if (ext === 'pdf') {
    if (name.includes('tknt') || name.includes('thiet ke') || name.includes('nt-')) return { category: 'DESIGN_PDF', confidence: 0.92, routedTo: 'engineering/designs' };
    if (name.includes('boq') || name.includes('kl') || name.includes('khoi luong') || lowerPath.includes('boq')) return { category: 'BOQ_PDF', confidence: 0.93, routedTo: 'crm/boq' };
    if (name.includes('hop dong') || name.includes('contract') || lowerPath.includes('contract')) return { category: 'CONTRACT', confidence: 0.95, routedTo: 'crm/contracts' };
    return { category: 'DESIGN_PDF', confidence: 0.60, routedTo: 'engineering/designs' };
  }
  
  if (['jpg','jpeg','png','webp'].includes(ext)) {
    if (lowerPath.includes('phiếu nhập') || lowerPath.includes('phieu nhap') || name.includes('chung tu')) return { category: 'PROCUREMENT_DOCUMENT', confidence: 0.88, routedTo: 'purchasing/requests' };
    if (name.includes('qc') || name.includes('kiem tra')) return { category: 'QC_EVIDENCE', confidence: 0.85, routedTo: 'qc' };
    if (lowerPath.includes('kich thuoc') || lowerPath.includes('kích thước') || name.includes('khảo')) return { category: 'SURVEY_IMAGE', confidence: 0.85, routedTo: 'engineering/surveys' };
    if (lowerPath.includes('vat lieu') || lowerPath.includes('vật liệu') || name.includes('material')) return { category: 'MATERIAL_IMAGE', confidence: 0.85, routedTo: 'inventory/materials' };
    return { category: 'SURVEY_IMAGE', confidence: 0.55, routedTo: 'engineering/surveys' };
  }
  
  return { category: 'OTHER', confidence: 0.30, routedTo: 'source-center' };
}

function getMimeType(ext) {
  const map = {
    'pdf': 'application/pdf',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'xls': 'application/vnd.ms-excel',
    'skp': 'application/octet-stream',
    'skb': 'application/octet-stream',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png'
  };
  return map[ext.toLowerCase().replace('.', '')] || 'application/octet-stream';
}

function walkSync(dir, filelist = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const dirFile = path.join(dir, file);
    const dirent = fs.statSync(dirFile);
    if (dirent.isDirectory()) {
      filelist = walkSync(dirFile, filelist);
    } else {
      filelist.push(dirFile);
    }
  }
  return filelist;
}

async function ingest() {
  const client = await pool.connect();
  try {
    const projName = 'VĂN PHÒNG CHỨNG KHOÁN BẢO MINH CHI NHÁNH CMT8 - TP HỒ CHÍ MINH';
    let res = await client.query("SELECT id FROM projects WHERE name = $1", [projName]);
    let projectId;
    if (res.rows.length === 0) {
      console.log('Project not found, creating it...');
      const insertRes = await client.query(
        "INSERT INTO projects (name, code, status) VALUES ($1, $2, 'ACTIVE') RETURNING id",
        [projName, 'PRJ-BAOMINH']
      );
      projectId = insertRes.rows[0].id;
    } else {
      projectId = res.rows[0].id;
    }
    
    // Default user
    const userRes = await client.query("SELECT id FROM users LIMIT 1");
    const userId = userRes.rows.length > 0 ? userRes.rows[0].id : null;

    const sourceDir = "D:\\XƯỞNG HOMEPRO SG\\9. THÁNG 08.2026\\3. VĂN PHÒNG BẢO MINH";
    const files = walkSync(sourceDir);

    console.log(`Found ${files.length} files total. Start processing...`);

    let ingested = 0;
    let skipped = 0;

    for (const file of files) {
      if (file.endsWith('.zip')) {
        skipped++;
        continue; // Skip zip
      }

      const fileName = path.basename(file);
      const ext = path.extname(file).replace('.', '');
      const stat = fs.statSync(file);
      const fileBuffer = fs.readFileSync(file);
      const hashSum = crypto.createHash('md5');
      hashSum.update(fileBuffer);
      const checksum = hashSum.digest('hex');

      // Check duplicate
      const existRes = await client.query(
        "SELECT id FROM source_documents WHERE file_name = $1 AND checksum = $2",
        [fileName, checksum]
      );
      if (existRes.rows.length > 0) {
        console.log(`[SKIP] Already exists: ${fileName}`);
        skipped++;
        continue;
      }

      const cls = classify(file, fileName);
      const sourceId = 'SRC-' + Date.now() + '-' + Math.random().toString(36).substr(2,6).toUpperCase();
      
      const insertSql = `
        INSERT INTO source_documents (
          source_id, source_name, source_type, file_name, original_path,
          file_size, checksum, mime_type, version, uploaded_by,
          project_id, document_category, source_status, auto_routed_to,
          classification_confidence, created_at, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,1,$9,$10,$11,'RAW',$12,$13,NOW(),NOW())
        RETURNING id
      `;

      const insertValues = [
        sourceId, fileName, ext.toUpperCase(), fileName, file,
        stat.size, checksum, getMimeType(ext), userId,
        projectId, cls.category, cls.routedTo, cls.confidence
      ];

      const inserted = await client.query(insertSql, insertValues);
      const rowId = inserted.rows[0].id;
      
      await client.query(`
        INSERT INTO source_audit_log (action, user_id, source_doc_id, module, created_at)
        VALUES ('UPLOAD_BATCH', $1, $2, 'source-center', NOW())
      `, [userId, rowId]);

      console.log(`[INGESTED] ${fileName} -> ${cls.category}`);
      ingested++;
    }

    console.log(`Done! Ingested: ${ingested}, Skipped: ${skipped}`);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    client.release();
    pool.end();
  }
}

ingest();
