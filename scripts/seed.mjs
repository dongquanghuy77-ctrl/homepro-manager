// Seed script - runs once to populate demo data
// Run: node scripts/seed.mjs

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'homepro.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    customer TEXT NOT NULL,
    location TEXT,
    manager TEXT NOT NULL,
    start_date TEXT,
    deadline TEXT,
    contract_value REAL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    category TEXT,
    title TEXT NOT NULL,
    assignee TEXT,
    start_date TEXT,
    end_date TEXT,
    status TEXT NOT NULL DEFAULT 'NOT_STARTED',
    priority TEXT NOT NULL DEFAULT 'MEDIUM',
    progress INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// Check if demo project exists
const existing = db.prepare("SELECT id FROM projects WHERE code = 'DA-2026-001'").get();
if (existing) {
  console.log('✅ Demo data already exists. Skipping seed.');
  db.close();
  process.exit(0);
}

// Insert demo project
const insertProject = db.prepare(`
  INSERT INTO projects (code, name, customer, location, manager, start_date, deadline, contract_value, status, notes)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const projectResult = insertProject.run(
  'DA-2026-001',
  'Nhà anh Khánh',
  'Nguyễn Văn Khánh',
  'Quận 7, TP.HCM',
  'Huy',
  '2026-07-01',
  '2026-09-30',
  285000000,
  'ACTIVE',
  'Dự án nội thất toàn bộ căn hộ 3PN, phong cách hiện đại tối giản.'
);

const projectId = projectResult.lastInsertRowid;
console.log(`✅ Inserted project: DA-2026-001 (ID: ${projectId})`);

// Insert demo tasks
const insertTask = db.prepare(`
  INSERT INTO tasks (project_id, category, title, assignee, start_date, end_date, status, priority, progress, notes)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const demoTasks = [
  {
    category: 'Thiết kế',
    title: 'Đo đạc & khảo sát thực tế',
    assignee: 'Huy',
    start_date: '2026-07-01',
    end_date: '2026-07-03',
    status: 'COMPLETED',
    priority: 'HIGH',
    progress: 100,
    notes: 'Đã hoàn thành. Bản vẽ đính kèm.',
  },
  {
    category: 'Thiết kế',
    title: 'Thiết kế 3D phòng khách',
    assignee: 'Huy',
    start_date: '2026-07-04',
    end_date: '2026-07-10',
    status: 'COMPLETED',
    priority: 'HIGH',
    progress: 100,
    notes: 'Khách hàng đã phê duyệt ngày 11/07.',
  },
  {
    category: 'Thiết kế',
    title: 'Thiết kế 3D phòng ngủ master',
    assignee: 'Huy',
    start_date: '2026-07-07',
    end_date: '2026-07-14',
    status: 'COMPLETED',
    priority: 'HIGH',
    progress: 100,
    notes: 'Hoàn thành, chờ ký duyệt.',
  },
  {
    category: 'Vật tư',
    title: 'Đặt hàng gỗ MDF & cánh cửa',
    assignee: 'Tuấn',
    start_date: '2026-07-12',
    end_date: '2026-07-20',
    status: 'COMPLETED',
    priority: 'HIGH',
    progress: 100,
    notes: 'Đã nhận đủ vật tư.',
  },
  {
    category: 'Thi công',
    title: 'Thi công tủ bếp & countertop',
    assignee: 'Minh',
    start_date: '2026-07-21',
    end_date: '2026-08-05',
    status: 'COMPLETED',
    priority: 'HIGH',
    progress: 100,
    notes: 'Hoàn thành đúng tiến độ.',
  },
  {
    category: 'Thi công',
    title: 'Thi công tủ quần áo phòng master',
    assignee: 'Minh',
    start_date: '2026-08-01',
    end_date: '2026-08-15',
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    progress: 65,
    notes: 'Đang thi công phần thân tủ.',
  },
  {
    category: 'Thi công',
    title: 'Thi công kệ tivi & kệ trang trí',
    assignee: 'Minh',
    start_date: '2026-08-05',
    end_date: '2026-08-20',
    status: 'IN_PROGRESS',
    priority: 'MEDIUM',
    progress: 30,
    notes: 'Đang cắt vật liệu tại xưởng.',
  },
  {
    category: 'Thi công',
    title: 'Lắp đặt phòng ngủ 2',
    assignee: 'Long',
    start_date: '2026-08-10',
    end_date: '2026-08-25',
    status: 'NOT_STARTED',
    priority: 'MEDIUM',
    progress: 0,
    notes: '',
  },
  {
    category: 'QC',
    title: 'Kiểm tra chất lượng & nghiệm thu sơ bộ',
    assignee: 'Huy',
    start_date: '2026-09-01',
    end_date: '2026-09-10',
    status: 'NOT_STARTED',
    priority: 'HIGH',
    progress: 0,
    notes: 'Cần checklist QC đầy đủ trước khi bàn giao.',
  },
  {
    category: 'Hoàn thiện',
    title: 'Vệ sinh công trình & bàn giao',
    assignee: 'Huy',
    start_date: '2026-09-20',
    end_date: '2026-09-30',
    status: 'NOT_STARTED',
    priority: 'MEDIUM',
    progress: 0,
    notes: '',
  },
];

for (const task of demoTasks) {
  insertTask.run(
    projectId,
    task.category,
    task.title,
    task.assignee,
    task.start_date,
    task.end_date,
    task.status,
    task.priority,
    task.progress,
    task.notes
  );
}

console.log(`✅ Inserted ${demoTasks.length} demo tasks`);
console.log('🎉 Seed completed successfully!');
db.close();
