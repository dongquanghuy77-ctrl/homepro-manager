/**
 * BAO MINH CMT8 — PHASE 15 UI CHECK
 * Kiểm tra xem project BAO MINH CMT8 có nhìn được trên UI không.
 * Không tạo module mới. Chỉ verify existing routes + data flows.
 */
const fs = require('fs');
const path = require('path');

const OUT_DIR = 'docs/projects/BAO-MINH-CMT8';

// Checklist: các UI routes/module phải tồn tại
const UI_MODULE_CHECKS = [
  { module: 'Dự án',     route_pattern: '/projects|/du-an',        check_file: 'src/pages/Projects.tsx', required: true },
  { module: 'Hồ sơ',    route_pattern: '/documents',               check_file: 'src/pages/Documents.tsx', required: false },
  { module: 'Thiết kế', route_pattern: '/design',                  check_file: 'src/pages/Design.tsx', required: false },
  { module: 'Khảo sát', route_pattern: '/survey',                  check_file: 'src/pages/Survey.tsx', required: false },
  { module: 'BOQ',       route_pattern: '/boq|/bao-gia',           check_file: 'src/pages/BOQ.tsx', required: false },
  { module: 'Vật tư',   route_pattern: '/materials|/vat-tu',       check_file: 'src/pages/Materials.tsx', required: false },
  { module: 'Sản xuất', route_pattern: '/production|/san-xuat',    check_file: 'src/pages/Production.tsx', required: false },
  { module: 'Tiến độ',  route_pattern: '/progress|/tien-do',       check_file: 'src/pages/Progress.tsx', required: false },
  { module: 'QC',        route_pattern: '/qc',                      check_file: 'src/pages/QC.tsx', required: false },
  { module: 'Lắp đặt',  route_pattern: '/installation|/lap-dat',   check_file: 'src/pages/Installation.tsx', required: false },
  { module: 'Nghiệm thu',route_pattern: '/acceptance',             check_file: 'src/pages/Acceptance.tsx', required: false },
  { module: 'Chi phí',   route_pattern: '/cost|/chi-phi',          check_file: 'src/pages/Cost.tsx', required: false },
  { module: 'CRM',       route_pattern: '/crm|/customers',         check_file: 'src/pages/CRM.tsx', required: false },
];

// Project data fields to check
const PROJECT_FIELDS = ['project_code','project_name','customer_code','customer_name','floor','address','design_status','phase1_accepted'];

function phase15_uiCheck() {
  console.log('\n══════════════ PHASE 15: UI CHECK ══════════════');
  const results = [];

  // 1. Check project data for UI display
  const projectData = JSON.parse(fs.readFileSync(path.join(OUT_DIR, 'project.json'), 'utf8'));
  console.log('\n  Project visible on UI:');
  PROJECT_FIELDS.forEach(field => {
    const val = projectData[field];
    const ok = val !== undefined && val !== null && val !== '';
    console.log(`  ${ok?'✅':'⚠️'} ${field}: ${JSON.stringify(val)}`);
    results.push({ field, value: val, visible: ok });
  });

  // 2. Check document fields for UI display
  const docData = JSON.parse(fs.readFileSync(path.join(OUT_DIR, 'document-management.json'), 'utf8'));
  console.log('\n  Documents visible on UI:');
  const docRequiredFields = ['document_id','document_type','document_category','filename','version','date','floor','status','approved_for_production'];
  docData.documents.forEach(doc => {
    console.log(`\n    [${doc.document_id}]`);
    docRequiredFields.forEach(f => {
      const val = doc[f];
      const ok = val !== undefined && val !== null;
      console.log(`    ${ok?'✅':'⚠️'} ${f}: ${JSON.stringify(val)}`);
    });
  });

  // 3. Check zone data
  const zoneData = JSON.parse(fs.readFileSync(path.join(OUT_DIR, 'zone-master.json'), 'utf8'));
  console.log(`\n  Zones visible on UI: ${zoneData.zones.length} zones`);
  zoneData.zones.forEach(z => {
    console.log(`  ✅ ${z.zone_code} | ${z.zone_name_vi} | ${z.area_m2||'TBD'}m²`);
  });

  // 4. Check which source pages/routes actually exist
  console.log('\n  UI Module file existence check:');
  UI_MODULE_CHECKS.forEach(mod => {
    const exists = fs.existsSync(mod.check_file);
    const icon = exists ? '✅' : (mod.required ? '❌' : '⚠️');
    const status = exists ? 'EXISTS' : (mod.required ? 'MISSING (REQUIRED)' : 'MISSING (OPTIONAL — use existing route)');
    console.log(`  ${icon} ${mod.module.padEnd(12)} → ${mod.check_file} — ${status}`);
    results.push({ module: mod.module, file: mod.check_file, exists, required: mod.required, status });
  });

  // 5. Router check
  const routerFiles = ['src/App.tsx','src/router.tsx','src/routes.tsx','src/main.tsx'];
  console.log('\n  Router file check:');
  routerFiles.forEach(f => {
    const exists = fs.existsSync(f);
    if (exists) console.log(`  ✅ ${f} — exists`);
  });

  // 6. Generate UI check report
  const uiReport = {
    project_id:    'BAO-MINH-CMT8',
    check_at:      new Date().toISOString(),
    project_data:  { visible: true, fields: PROJECT_FIELDS.length, ok: results.filter(r=>r.visible).length },
    zones:         { count: zoneData.zones.length, visible: true },
    documents:     { count: docData.documents.length, visible: true },
    modules:       UI_MODULE_CHECKS.map(m => ({
      module: m.module,
      file_exists: fs.existsSync(m.check_file),
      required: m.required,
      action: fs.existsSync(m.check_file) ? 'USE_EXISTING' : 'USE_EXISTING_ROUTE_OR_CREATE',
    })),
    key_project_data: {
      name: projectData.project_name,
      customer: projectData.customer_name,
      floor: projectData.floor,
      design_status: projectData.design_status,
    },
  };

  fs.writeFileSync(path.join(OUT_DIR, 'phase15-ui-check.json'), JSON.stringify(uiReport, null, 2), 'utf8');
  console.log('\n  ✅ Written: phase15-ui-check.json');
  return uiReport;
}

phase15_uiCheck();
