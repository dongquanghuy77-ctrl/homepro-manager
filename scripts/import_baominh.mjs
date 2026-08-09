import XLSX from 'xlsx';
import fs from 'fs';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '..', 'data', 'homepro.db');

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const filePath = 'd:\\DỰ ÁN QUẢN LÝ XƯỞNG\\KL NỘI THẤT VP BẢO MINH- CN SÀI GÒN- homepro.xlsx';
const buffer = fs.readFileSync(filePath);
const workbook = XLSX.read(buffer, { type: 'buffer' });

const sheet = workbook.Sheets['NT'] || workbook.Sheets[workbook.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

console.log(`Reading sheet with ${rows.length} rows...`);

let currentSection = 'Thi công chung';
let currentSubSection = '';
const items = [];

rows.forEach((r, idx) => {
  if (idx < 3) return;

  const col0 = String(r[0] || '').trim();
  const col1 = String(r[1] || '').trim();
  const col3 = String(r[3] || '').trim(); // ĐVT
  const col4 = r[4]; // Khối lượng
  const col5 = r[5]; // Đơn giá
  const col6 = r[6]; // Thành tiền
  const col7 = String(r[7] || '').trim(); // Ghi chú

  // Section headers
  if (/^[A-Z]$/.test(col0) && col1) {
    currentSection = col1.replace(/\r?\n/g, ' ');
    currentSubSection = '';
    return;
  }
  if (/^(I|II|III|IV|V|VI|VII|VIII|IX|X)$/.test(col0) && col1) {
    currentSubSection = col1.replace(/\r?\n/g, ' ');
    return;
  }

  // Item row
  if (col1 && (typeof col0 === 'number' || /^\d+$/.test(col0) || col3)) {
    const qty = typeof col4 === 'number' ? col4 : parseFloat(String(col4)) || 0;
    const price = typeof col5 === 'number' ? col5 : parseFloat(String(col5)) || 0;
    const amount = typeof col6 === 'number' ? col6 : parseFloat(String(col6)) || (qty * price) || 0;

    items.push({
      section: currentSection,
      subSection: currentSubSection,
      title: col1.replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim(),
      unit: col3,
      qty,
      price,
      amount,
      notes: col7,
    });
  }
});

console.log(`Parsed ${items.length} items from Excel file.`);

// 1. Create or Update Project: DA-2026-BM
const projectCode = 'DA-2026-BM';
const projectName = 'Văn Phòng Chứng Khoán Bảo Minh - CN Sài Gòn';

const existingProject = db.prepare('SELECT id FROM projects WHERE code = ?').get(projectCode);
let projectId;

if (existingProject) {
  projectId = existingProject.id;
  db.prepare(`
    UPDATE projects SET
      name = ?,
      customer = ?,
      location = ?,
      manager = ?,
      start_date = ?,
      deadline = ?,
      contract_value = ?,
      notes = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `).run(
    projectName,
    'Công ty CP Chứng Khoán Bảo Minh',
    '201-203 CMT8, Phường Bàn Cờ, TP.HCM',
    'Huy',
    '2026-08-01',
    '2026-11-15',
    485000000,
    'Gói thầu thiết kế & thi công hoàn thiện toàn bộ nội thất văn phòng chi nhánh Sài Gòn.',
    projectId
  );
  console.log(`Updated project ${projectCode} (ID: ${projectId})`);
} else {
  const insertProj = db.prepare(`
    INSERT INTO projects (code, name, customer, location, manager, start_date, deadline, contract_value, status, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const res = insertProj.run(
    projectCode,
    projectName,
    'Công ty CP Chứng Khoán Bảo Minh',
    '201-203 CMT8, Phường Bàn Cờ, TP.HCM',
    'Huy',
    '2026-08-01',
    '2026-11-15',
    485000000,
    'ACTIVE',
    'Gói thầu thiết kế & thi công hoàn thiện toàn bộ nội thất văn phòng chi nhánh Sài Gòn.'
  );
  projectId = res.lastInsertRowid;
  console.log(`Created new project ${projectCode} (ID: ${projectId})`);
}

// Clear old tasks for this project if re-importing
db.prepare('DELETE FROM tasks WHERE project_id = ?').run(projectId);

// Insert items as structured Tasks
const insertTask = db.prepare(`
  INSERT INTO tasks (project_id, category, title, assignee, start_date, end_date, status, priority, progress, notes)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const assigneesPool = ['Huy', 'Minh', 'Tuấn', 'Long', 'An'];
const categoriesMap = {
  'PHÒNG HỌP': 'Thi công',
  'PHÒNG GIÁM ĐỐC': 'Thi công',
  'KHU VỰC LỄ TÂN': 'Thiết kế',
  'KHU VỰC LÀM VIỆC': 'Vật tư',
  'PHÒNG PANTRY': 'Lắp đặt',
};

let insertedTasksCount = 0;

items.forEach((item, index) => {
  // Map category
  let category = 'Thi công';
  for (const [key, cat] of Object.entries(categoriesMap)) {
    if (item.section.toUpperCase().includes(key)) {
      category = cat;
      break;
    }
  }
  if (item.title.toLowerCase().includes('thiết kế') || item.title.toLowerCase().includes('bản vẽ')) {
    category = 'Thiết kế';
  } else if (item.title.toLowerCase().includes('đặt') || item.title.toLowerCase().includes('rèm') || item.title.toLowerCase().includes('thảm')) {
    category = 'Vật tư';
  } else if (item.title.toLowerCase().includes('nghiệm thu') || item.title.toLowerCase().includes('kiểm tra')) {
    category = 'QC';
  }

  // Assignee
  const assignee = assigneesPool[index % assigneesPool.length];

  // Schedule & Progress simulation
  let status = 'NOT_STARTED';
  let progress = 0;
  let priority = 'MEDIUM';
  let startDate = '2026-08-15';
  let endDate = '2026-09-30';

  if (index < 6) {
    status = 'COMPLETED';
    progress = 100;
    priority = 'HIGH';
    startDate = '2026-08-01';
    endDate = '2026-08-12';
  } else if (index < 18) {
    status = 'IN_PROGRESS';
    progress = Math.min(90, 20 + (index * 5) % 75);
    priority = index % 2 === 0 ? 'HIGH' : 'MEDIUM';
    startDate = '2026-08-10';
    endDate = '2026-09-10';
  } else if (index < 25) {
    status = 'NOT_STARTED';
    progress = 0;
    priority = 'MEDIUM';
    startDate = '2026-09-15';
    endDate = '2026-10-15';
  } else {
    status = 'NOT_STARTED';
    progress = 0;
    priority = 'LOW';
    startDate = '2026-10-01';
    endDate = '2026-11-10';
  }

  const titleWithQty = `${item.title}${item.qty ? ` (${item.qty} ${item.unit})` : ''}`;
  const notesText = item.notes ? `${item.section} - ${item.notes}` : item.section;

  insertTask.run(
    projectId,
    category,
    titleWithQty,
    assignee,
    startDate,
    endDate,
    status,
    priority,
    progress,
    notesText
  );
  insertedTasksCount++;
});

console.log(`✅ Successfully imported ${insertedTasksCount} tasks into Project DA-2026-BM!`);
db.close();
