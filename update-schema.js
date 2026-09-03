const fs = require('fs');
let c = fs.readFileSync('src/db/schema.ts', 'utf8');

c = c.replace(/sourceRef:\s*text\('source_ref'\),\s*\/\/\s*ERP bridge: 'WO-\{workOrderId\}'/g, "sourceRef:     text('source_ref'),\n  qcStatus:      text('qc_status'),\n  waitingQcSince:timestamp('waiting_qc_since'),\n  reworkCount:   integer('rework_count').notNull().default(0),");

c = c.replace(/export type PwrTask\s*=\s*typeof pwrTasks\.\$inferSelect;/g, `export const pwrQcLogs = pgTable('pwr_qc_logs', {
  id: serial('id').primaryKey(),
  taskId: integer('task_id').notNull().references(() => pwrTasks.id, { onDelete: 'cascade' }),
  qcBy: integer('qc_by').notNull().references(() => users.id),
  status: text('status').notNull(),
  reason: text('reason'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const pwrScrapRequests = pgTable('pwr_scrap_requests', {
  id: serial('id').primaryKey(),
  taskId: integer('task_id').notNull().references(() => pwrTasks.id, { onDelete: 'cascade' }),
  requestedBy: integer('requested_by').notNull().references(() => users.id),
  approvedBy: integer('approved_by').references(() => users.id),
  status: text('status').notNull().default('PENDING'),
  itemsRequested: jsonb('items_requested'),
  reason: text('reason'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export type PwrTask    = typeof pwrTasks.$inferSelect;`);

fs.writeFileSync('src/db/schema.ts', c, 'utf8');
