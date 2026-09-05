const fs = require('fs');
let code = fs.readFileSync('src/db/schema.ts', 'utf8');

// Add new columns to pwrTasks
const taskInsertPoint = "reworkCount:   integer('rework_count').notNull().default(0),";
const newColumns = `    reworkCount:   integer('rework_count').notNull().default(0),
    reworkRefId:   integer('rework_ref_id'),
    defectBy:      integer('defect_by'),`;
code = code.replace(taskInsertPoint, newColumns);

// Add new tables at the end
const newTables = `
// ============================================================
// PWR V5 - NOTIFICATIONS & SCRAP LOGS (REWORK/RUSH ENGINE)
// ============================================================
export const pwrNotifications = pgTable('pwr_notifications', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }), // Có thể null nếu là broadcast cho trạm
  stationTeam: text('station_team'), // Để gửi cho tất cả thợ trong trạm (ví dụ: 'CNC')
  title: text('title').notNull(),
  content: text('content'),
  priority: text('priority').notNull().default('INFO'), // INFO, URGENT, CRITICAL
  isRead: boolean('is_read').notNull().default(false),
  relatedTaskId: integer('related_task_id'),
  createdAt: timestamp('created_at').defaultNow(),
});
export type PwrNotification = typeof pwrNotifications.$inferSelect;
export type NewPwrNotification = typeof pwrNotifications.$inferInsert;

export const pwrScrapLogs = pgTable('pwr_scrap_logs', {
  id: serial('id').primaryKey(),
  taskId: integer('task_id').references(() => pwrTasks.id, { onDelete: 'cascade' }),
  reporterId: integer('reporter_id').references(() => users.id),
  materialId: integer('material_id'),
  quantity: integer('quantity').notNull(),
  reason: text('reason'),
  createdAt: timestamp('created_at').defaultNow(),
});
export type PwrScrapLog = typeof pwrScrapLogs.$inferSelect;
export type NewPwrScrapLog = typeof pwrScrapLogs.$inferInsert;
`;
code += newTables;

fs.writeFileSync('src/db/schema.ts', code, 'utf8');
console.log('Schema updated.');
