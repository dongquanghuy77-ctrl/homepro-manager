import { pgTable, serial, text, integer, real, timestamp, boolean } from 'drizzle-orm/pg-core';



// ============================================================
// USERS
// ============================================================
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  password: text('password').notNull(),
  name: text('name').notNull(),
  position: text('position'),
  birthDate: text('birth_date'),
  role: text('role').notNull().default('WORKER'),
  phone: text('phone'),
  active: boolean('active').notNull().default(true),
  // ── HR Module 01 fields ──────────────────────────────────────
  employeeCode: text('employee_code').unique(),          // NV001, NV002...
  department: text('department'),                        // Xưởng gỗ | Thi công | Thiết kế | Kế toán | Quản lý
  employmentType: text('employment_type').default('FULL_TIME'), // FULL_TIME | PART_TIME | CONTRACT
  joinDate: text('join_date'),                           // DD/MM/YYYY
  managerId: integer('manager_id'),                      // FK to users.id (self-referential)
  employeeStatus: text('employee_status').default('ACTIVE'), // ACTIVE | INACTIVE | ON_LEAVE
  note: text('note'),
  // ─────────────────────────────────────────────────────────────
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});


// ============================================================
// PROJECTS
// ============================================================
export const projects = pgTable('projects', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  customer: text('customer'),
  manager: text('manager'),
  location: text('location'),
  contractValue: real('contract_value').default(0),
  status: text('status').notNull().default('ACTIVE'),
  startDate: text('start_date'),
  deadline: text('deadline'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ============================================================
// TASKS
// ============================================================
export const tasks = pgTable('tasks', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  category: text('category').notNull().default(''),
  title: text('title').notNull(),
  assignee: text('assignee'),
  startDate: text('start_date'),
  endDate: text('end_date'),
  deadline: text('deadline'),
  priority: text('priority').notNull().default('MEDIUM'),
  status: text('status').notNull().default('NOT_STARTED'),
  progress: integer('progress').default(0),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ============================================================
// QC ISSUES
// ============================================================
export const qcIssues = pgTable('qc_issues', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  taskId: integer('task_id').references(() => tasks.id, { onDelete: 'set null' }),
  code: text('code').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  location: text('location'),
  category: text('category'),
  severity: text('severity').notNull().default('MEDIUM'),
  status: text('status').notNull().default('OPEN'),
  reportedBy: text('reported_by'),
  assignedTo: text('assigned_to'),
  dueDate: text('due_date'),
  resolvedDate: text('resolved_date'),
  resolution: text('resolution'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ============================================================
// WORK LOGS
// ============================================================
export const workLogs = pgTable('work_logs', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  taskId: integer('task_id').references(() => tasks.id, { onDelete: 'set null' }),
  logDate: text('log_date').notNull(),
  category: text('category'),
  description: text('description').notNull(),
  workers: text('workers'),
  workerCount: integer('worker_count').default(0),
  hoursWorked: real('hours_worked').default(0),
  weather: text('weather'),
  progressNote: text('progress_note'),
  issues: text('issues'),
  recordedBy: text('recorded_by'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ============================================================
// MATERIALS
// ============================================================
export const materials = pgTable('materials', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  unit: text('unit').notNull().default('cái'),
  unitPrice: real('unit_price').default(0),
  stockQty: real('stock_qty').default(0),
  minStock: real('min_stock').default(0),
  category: text('category'),
  supplier: text('supplier'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ============================================================
// BOQ ITEMS
// ============================================================
export const boqItems = pgTable('boq_items', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  materialId: integer('material_id').references(() => materials.id, { onDelete: 'set null' }),
  taskId: integer('task_id').references(() => tasks.id, { onDelete: 'set null' }),
  materialName: text('material_name').notNull(),
  unit: text('unit').notNull().default('cái'),
  unitPrice: real('unit_price').default(0),
  qtyRequired: real('qty_required').notNull().default(0),
  qtyOrdered: real('qty_ordered').default(0),
  qtyReceived: real('qty_received').default(0),
  category: text('category'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ============================================================
// COSTS (CHI PHÍ PHÁT SINH DỰ ÁN)
// ============================================================
export const costs = pgTable('costs', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  amount: real('amount').notNull().default(0),
  category: text('category').default('Vật tư mua ngoài'), // 'Vật tư mua ngoài' | 'Vận chuyển' | 'Nhân công ngoài' | 'Máy móc' | 'Khác'
  costDate: text('cost_date').notNull(),
  notes: text('notes'),
  createdByName: text('created_by_name'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ============================================================
// CUSTOMERS (KHÁCH HÀNG / CRM)
// ============================================================
export const customers = pgTable('customers', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  phone: text('phone'),
  email: text('email'),
  address: text('address'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ============================================================
// SETTINGS (CÀI ĐẶT HỆ THỐNG XƯỞNG)
// ============================================================
export const settings = pgTable('settings', {
  id: serial('id').primaryKey(),
  key: text('key').notNull().unique(),
  value: text('value'),
  updatedAt: timestamp('updated_at').defaultNow(),
});


// ============================================================
// HR MODULE 01 – ATTENDANCE (CHẤM CÔNG)
// ============================================================
export const attendance = pgTable('attendance', {
  id: serial('id').primaryKey(),
  employeeId: integer('employee_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  workDate: text('work_date').notNull(),          // YYYY-MM-DD
  checkIn: timestamp('check_in'),                 // Server-generated timestamp
  checkOut: timestamp('check_out'),               // Server-generated timestamp
  status: text('status').notNull().default('NOT_CHECKED'), // PRESENT | ABSENT | LATE | HALF_DAY | ON_LEAVE | NOT_CHECKED
  lateMinutes: integer('late_minutes').default(0),
  earlyLeaveMinutes: integer('early_leave_minutes').default(0),
  totalHours: real('total_hours').default(0),
  note: text('note'),
  correctedBy: integer('corrected_by').references(() => users.id),
  correctedAt: timestamp('corrected_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ============================================================
// HR MODULE 01 – LEAVE REQUESTS (ĐƠN XIN NGHỈ)
// ============================================================
export const leaveRequests = pgTable('leave_requests', {
  id: serial('id').primaryKey(),
  employeeId: integer('employee_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  leaveType: text('leave_type').notNull().default('ANNUAL'), // ANNUAL | SICK | PERSONAL | UNPAID | OTHER
  startDate: text('start_date').notNull(),        // YYYY-MM-DD
  endDate: text('end_date').notNull(),            // YYYY-MM-DD
  totalDays: real('total_days').notNull().default(1),
  reason: text('reason'),
  status: text('status').notNull().default('PENDING'), // PENDING | APPROVED | REJECTED | CANCELLED
  reviewedBy: integer('reviewed_by').references(() => users.id),
  reviewedAt: timestamp('reviewed_at'),
  reviewNote: text('review_note'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ============================================================
// HR MODULE 01 – OVERTIME REQUESTS (TĂNG CA)
// ============================================================
export const overtimeRequests = pgTable('overtime_requests', {
  id: serial('id').primaryKey(),
  employeeId: integer('employee_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  workDate: text('work_date').notNull(),          // YYYY-MM-DD
  startTime: text('start_time').notNull(),        // HH:MM
  endTime: text('end_time').notNull(),            // HH:MM
  totalHours: real('total_hours').notNull().default(0),
  reason: text('reason'),
  projectId: integer('project_id').references(() => projects.id, { onDelete: 'set null' }),
  status: text('status').notNull().default('PENDING'), // PENDING | APPROVED | REJECTED | CANCELLED
  approvedBy: integer('approved_by').references(() => users.id),
  approvedAt: timestamp('approved_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ============================================================
// HR MODULE 01 – AUDIT LOGS (NHẬT KÝ THAO TÁC)
// ============================================================
export const hrAuditLogs = pgTable('hr_audit_logs', {
  id: serial('id').primaryKey(),
  action: text('action').notNull(),               // EMPLOYEE_CREATED | ATTENDANCE_CORRECTED | LEAVE_APPROVED ...
  entityType: text('entity_type').notNull(),      // employee | attendance | leave | overtime
  entityId: integer('entity_id'),
  actorId: integer('actor_id').references(() => users.id),
  actorName: text('actor_name'),
  oldValue: text('old_value'),                    // JSON string
  newValue: text('new_value'),                    // JSON string
  ipAddress: text('ip_address'),
  createdAt: timestamp('created_at').defaultNow(),
});

// ============================================================
// TYPE EXPORTS
// ============================================================
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type QcIssue = typeof qcIssues.$inferSelect;
export type NewQcIssue = typeof qcIssues.$inferInsert;
export type WorkLog = typeof workLogs.$inferSelect;
export type NewWorkLog = typeof workLogs.$inferInsert;
export type Material = typeof materials.$inferSelect;
export type NewMaterial = typeof materials.$inferInsert;
export type BoqItem = typeof boqItems.$inferSelect;
export type NewBoqItem = typeof boqItems.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Cost = typeof costs.$inferSelect;
export type NewCost = typeof costs.$inferInsert;
export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;
export type Setting = typeof settings.$inferSelect;
export type NewSetting = typeof settings.$inferInsert;
export type Attendance = typeof attendance.$inferSelect;
export type NewAttendance = typeof attendance.$inferInsert;
export type LeaveRequest = typeof leaveRequests.$inferSelect;
export type NewLeaveRequest = typeof leaveRequests.$inferInsert;
export type OvertimeRequest = typeof overtimeRequests.$inferSelect;
export type NewOvertimeRequest = typeof overtimeRequests.$inferInsert;
export type HrAuditLog = typeof hrAuditLogs.$inferSelect;

export type UserRole = 'ADMIN' | 'MANAGER' | 'SUPERVISOR' | 'WORKER' | 'VIEWER';
export type ProjectStatus = 'ACTIVE' | 'COMPLETED' | 'ON_HOLD' | 'CANCELLED';
export type TaskStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'PAUSED' | 'OVERDUE';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH';
export type QcSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type QcStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY' | 'ON_LEAVE' | 'NOT_CHECKED';
export type LeaveType = 'ANNUAL' | 'SICK' | 'PERSONAL' | 'UNPAID' | 'OTHER';
export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export type EmploymentType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT';
export type EmployeeStatus = 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE';
export type Department = 'Xưởng gỗ' | 'Thi công' | 'Thiết kế' | 'Kế toán' | 'Quản lý' | 'Khác';
