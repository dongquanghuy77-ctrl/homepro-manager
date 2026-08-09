import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '..', 'data', 'homepro.db');

const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS materials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    unit TEXT NOT NULL DEFAULT 'cai',
    unit_price REAL DEFAULT 0,
    stock_qty REAL DEFAULT 0,
    min_stock REAL DEFAULT 0,
    category TEXT,
    supplier TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS boq_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    material_id INTEGER REFERENCES materials(id) ON DELETE SET NULL,
    task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
    material_name TEXT NOT NULL,
    unit TEXT NOT NULL DEFAULT 'cai',
    unit_price REAL DEFAULT 0,
    qty_required REAL NOT NULL DEFAULT 0,
    qty_ordered REAL DEFAULT 0,
    qty_received REAL DEFAULT 0,
    category TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('✅ Sprint 4 Migration OK!');
console.log('Tables:', tables.map(t => t.name).join(', '));
db.close();
