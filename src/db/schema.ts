import { pgTable, serial, text, integer, real, timestamp, boolean, primaryKey, unique, jsonb, numeric, doublePrecision, pgEnum } from 'drizzle-orm/pg-core';


// ============================================================
// DEPARTMENTS (PHÃ'NG BAN / Tá»")
// Bảng chính thức hóa phòng ban — thay thế trường text users.department
// ============================================================
export const departments = pgTable('departments', {
  id:        serial('id').primaryKey(),
  code:      text('code').notNull().unique(), // 'XUONG_GO' | 'THI_CONG' | 'KHO' | 'KE_TOAN' | 'THIET_KE'
  name:      text('name').notNull(),          // 'Xưởng Gỗ' | 'Thi Công' | ...
  block:     text('block'),                   // 'SAN_XUAT' | 'VAN_PHONG' | 'KHO'
  parentId:  integer('parent_id'),            // FK self-ref departments.id (Khối → Phòng)
  sortOrder: integer('sort_order').default(0),
  isActive:  boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow(),
});



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
  email: text('email'),
  active: boolean('active').notNull().default(true),
  pinHash: text('pin_hash'),                             // Nullable, chứa hash của mã PIN 6 số
  failedPinAttempts: integer('failed_pin_attempts').notNull().default(0), // Số lần nhập sai PIN liên tiếp
  pinLockedUntil: timestamp('pin_locked_until'),         // Thời điểm mở khóa tài khoản
  requirePasswordChange: boolean('require_password_change').notNull().default(false), // Bắt buộc đổi mật khẩu/PIN ở lần đăng nhập tiếp theo
  // ── HR Module 01 fields ──────────────────────────────────────
  employeeCode: text('employee_code').unique(),          // NV001, NV002...
  department: text('department'),                        // Xưởng gỗ | Thi công | Thiết kế | Kế toán | Quản lý
  employmentType: text('employment_type').default('FULL_TIME'), // FULL_TIME | PART_TIME | CONTRACT
  joinDate: text('join_date'),                           // DD/MM/YYYY
  managerId: integer('manager_id'),                      // FK to users.id (self-referential)
  departmentId: integer('department_id'),               // FK to departments.id (RBAC core — không dùng .references() tránh circular)
  employeeStatus: text('employee_status').default('ACTIVE'), // ACTIVE | INACTIVE | ON_LEAVE
  note: text('note'),
  // ── SPRINT 3 — Lương (Payroll Module) ────────────────────────────────────
  // official_salary: Lương chính thức (bao gồm phụ cấp) — dùng tính lương ngày thường
  //   Công thức: official_salary / 26 = đơn giá 1 ngày công (T2-T7)
  // basic_salary: Lương cơ bản (mức BHXH đóng) — dùng tính OT, Chủ nhật, Lễ
  //   Thường = 60-70% official_salary (theo Thông tư 23/2015/TT-BLĐTBXH)
  //   Công thức: basic_salary / 26 / 8 = đơn giá 1 giờ làm thêm
  officialSalary: numeric('official_salary', { precision: 20, scale: 2, mode: 'number' }).default(0),  // VND/tháng
  basicSalary:    numeric('basic_salary', { precision: 20, scale: 2, mode: 'number' }).default(0),     // VND/tháng
  // ── PWR Avatar & Push ──────────────────────────────────────────
  avatarUrl: text('avatar_url'),                         // URL ảnh đại diện (Vercel Blob hoặc data URI)
  pushSubscription: jsonb('push_subscription'),          // Lưu thông tin Web Push API
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
  customer: text('customer'), // Legacy text field
  customerId: integer('customer_id').references(() => customers.id),
  manager: text('manager'),
  location: text('location'),
  contractValue:      numeric('contract_value', { precision: 20, scale: 2, mode: 'number' }).default(0),
  targetMaterialCost: numeric('target_material_cost', { precision: 20, scale: 2, mode: 'number' }).default(0), // Ngân sách vật tư mục tiêu
  targetLaborCost:    numeric('target_labor_cost', { precision: 20, scale: 2, mode: 'number' }).default(0),    // Ngân sách nhân công mục tiêu
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
// QC / QMS MODULE
// ============================================================

export const qcStandards = pgTable('qc_standards', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  groupName: text('group_name'),
  description: text('description'),
  unit: text('unit'),
  standardValue: text('standard_value'),
  tolerance: text('tolerance'),
  passCriteria: text('pass_criteria'),
  warningCriteria: text('warning_criteria'),
  status: text('status').notNull().default('ACTIVE'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const qcControlPoints = pgTable('qc_control_points', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  stage: text('stage').notNull(), // RAW_MATERIAL, CUTTING, EDGE_BANDING, DRILLING, ASSEMBLY, FINISHING, PACKAGING, INSTALLATION
  description: text('description'),
  isMandatory: boolean('is_mandatory').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const qcControlPointStandards = pgTable('qc_control_point_standards', {
  id: serial('id').primaryKey(),
  controlPointId: integer('control_point_id').notNull().references(() => qcControlPoints.id, { onDelete: 'cascade' }),
  standardId: integer('standard_id').notNull().references(() => qcStandards.id, { onDelete: 'cascade' })
});

export const qcInspections = pgTable('qc_inspections', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  projectId: integer('project_id').references(() => projects.id, { onDelete: 'cascade' }),
  productId: integer('product_id').references(() => materials.id),
  boqItemId: integer('boq_item_id').references(() => boqItems.id),
  bomId: integer('bom_id').references(() => boms.id),
  productionOrderId: integer('production_order_id').references(() => productionOrders.id, { onDelete: 'cascade' }),
  workOrderId: integer('work_order_id').references(() => workOrders.id),
  routingStepId: integer('routing_step_id').references(() => routingSteps.id),
  controlPointId: integer('control_point_id').references(() => qcControlPoints.id),
  inspectorId: integer('inspector_id').references(() => users.id),
  inspectionTime: timestamp('inspection_time').defaultNow(),
  result: text('result').notNull(), // PASS, FAIL, PASS_WITH_CONDITIONS, PENDING
  evidenceUrl: text('evidence_url'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// ============================================================
// QC ISSUES (Defects)
// ============================================================
export const qcIssues = pgTable('qc_issues', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  taskId: integer('task_id').references(() => tasks.id, { onDelete: 'set null' }),
  productId: integer('product_id'), // Will reference materials.id (FG)
  productionOrderId: integer('production_order_id'), // Will reference production_orders.id
  workOrderId: integer('work_order_id'), // Will reference work_orders.id
  jobCardId: integer('job_card_id'), // Will reference job_cards.id
  inspectionId: integer('inspection_id').references(() => qcInspections.id, { onDelete: 'set null' }),
  code: text('code').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  location: text('location'),
  category: text('category'),
  severity: text('severity').notNull().default('MEDIUM'),
  status: text('status').notNull().default('OPEN'),
  quantityAffected: doublePrecision('quantity_affected').default(0),
  detectedBy: text('detected_by'),
  rootCause: text('root_cause'),
  correctiveAction: text('corrective_action'),
  evidenceUrl: text('evidence_url'),
  reportedBy: text('reported_by'),
  assignedTo: text('assigned_to'),
  dueDate: text('due_date'),
  resolvedDate: text('resolved_date'),
  resolution: text('resolution'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const qcNcrs = pgTable('qc_ncrs', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  projectId: integer('project_id').references(() => projects.id, { onDelete: 'cascade' }),
  issueId: integer('issue_id').references(() => qcIssues.id),
  source: text('source'), // INSPECTION, CUSTOMER_COMPLAINT, INTERNAL_AUDIT
  description: text('description').notNull(),
  rootCause: text('root_cause'),
  responsibility: text('responsibility'),
  correctiveAction: text('corrective_action'),
  preventiveAction: text('preventive_action'),
  deadline: timestamp('deadline'),
  assigneeId: integer('assignee_id').references(() => users.id),
  status: text('status').notNull().default('OPEN'), // OPEN, INVESTIGATING, ACTION_TAKEN, CLOSED
  closedAt: timestamp('closed_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
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
  hoursWorked: doublePrecision('hours_worked').default(0),
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
  unitPrice: numeric('unit_price', { precision: 20, scale: 2, mode: 'number' }).default(0),
  stockQty: numeric('stock_qty', { precision: 18, scale: 4, mode: 'number' }).default(0),
  minStock: numeric('min_stock', { precision: 18, scale: 4, mode: 'number' }).default(0),
  type: text('type').default('MATERIAL'), // FINISHED_GOOD, SUB_ASSEMBLY, RAW_MATERIAL, HARDWARE
  category: text('category'),
  supplier: text('supplier'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});


// ============================================================
// BOQ (Bill of Quantities)
// ============================================================
export const boqs = pgTable('boqs', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  projectId: integer('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  version: text('version').notNull().default('1.0'),
  status: text('status').notNull().default('DRAFT'), // DRAFT, SUBMITTED, APPROVED, LOCKED
  revisionReason: text('revision_reason'),
  totalAmount: numeric('total_amount', { precision: 20, scale: 2, mode: 'number' }).default(0),
  createdBy: integer('created_by').references(() => users.id),
  approvedBy: integer('approved_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const boqSections = pgTable('boq_sections', {
  id: serial('id').primaryKey(),
  boqId: integer('boq_id').notNull().references(() => boqs.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  parentSectionId: integer('parent_section_id'), // For nested sections
  sequence: integer('sequence').notNull().default(0),
});

// ============================================================
// BOQ ITEMS
// ============================================================
export const boqItems = pgTable('boq_items', {
  id: serial('id').primaryKey(),
  boqId: integer('boq_id').references(() => boqs.id, { onDelete: 'cascade' }),
  sectionId: integer('section_id').references(() => boqSections.id),
  productId: integer('product_id').references(() => materials.id),
  projectId: integer('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  materialId: integer('material_id').references(() => materials.id, { onDelete: 'set null' }),
  taskId: integer('task_id').references(() => tasks.id, { onDelete: 'set null' }),
  materialName: text('material_name').notNull(),
  unit: text('unit').notNull().default('cái'),
  unitPrice: numeric('unit_price', { precision: 20, scale: 2, mode: 'number' }).default(0),
  qtyRequired: numeric('qty_required', { precision: 18, scale: 4, mode: 'number' }).notNull().default(0),
  qtyOrdered: numeric('qty_ordered', { precision: 18, scale: 4, mode: 'number' }).default(0),
  qtyReceived: numeric('qty_received', { precision: 18, scale: 4, mode: 'number' }).default(0),
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
  amount: numeric('amount', { precision: 20, scale: 2, mode: 'number' }).notNull().default(0),
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
  code: text('code').unique(),
  name: text('name').notNull(),
  taxCode: text('tax_code'),
  phone: text('phone'),
  email: text('email'),
  address: text('address'),
  projectAddress: text('project_address'),
  customerType: text('customer_type').default('INDIVIDUAL'), // INDIVIDUAL, ENTERPRISE
  customerGroup: text('customer_group'),
  assignedTo: integer('assigned_to').references(() => users.id),
  totalContractValue: doublePrecision('total_contract_value').default(0),
  totalDebt: doublePrecision('total_debt').default(0),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const contacts = pgTable('contacts', {
  id: serial('id').primaryKey(),
  customerId: integer('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  position: text('position'),
  phone: text('phone'),
  email: text('email'),
  zalo: text('zalo'),
  role: text('role'),
  isPrimary: boolean('is_primary').default(false),
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
  totalHours: doublePrecision('total_hours').default(0),

  // ─── ĐA KÊnh: Nguồn chấm công (Rule Engine đọc để ưu tiên GPS) ─────────────────────
  clockInSource:  text('clock_in_source').default('MANUAL'),
  // 'WEB_GPS' | 'HARDWARE' | 'MANUAL' | 'ADMIN_CORRECTION'
  clockOutSource: text('clock_out_source').default('MANUAL'),

  deviceId: text('device_id'),
  // ID thiết bị phần cứng (VD: 'terminal-A1', 'finger-02'); null nếu Web

  // ─── GPS COORDINATES (tách riêng, độ chính xác cao hơn text) ───────────────────
  // GPS Preservation Rule: không bao giờ ghi đè lat/lng có sẵn bằng null
  checkInLat:  doublePrecision('check_in_lat'),   // null nếu nguồn là HARDWARE
  checkInLng:  doublePrecision('check_in_lng'),
  checkOutLat: doublePrecision('check_out_lat'),
  checkOutLng: doublePrecision('check_out_lng'),
  location: text('location'),          // deprecated legacy field (lat,lng string)

  // ─── IDEMPOTENCY KEY ─────────────────────────────────────────────────────────
  // Format: "empId:workDate" — UNIQUE constraint ngăn cản INSERT song song
  idempotencyKey: text('idempotency_key').unique(),

  // ─── SOURCES LOG (audit trail đa kênh) ────────────────────────────────────
  // JSON array: '["WEB_GPS@06:00","HARDWARE@06:02"]'
  confirmSources: text('confirm_sources').default('[]'),

  note:        text('note'),
  correctedBy: integer('corrected_by').references(() => users.id),
  correctedAt: timestamp('corrected_at'),
  correctionReason: text('correction_reason'),

  // ─── LUỒNG DUYỆT 2 CẤP (Manager → HR) ───────────────────────────────────
  //
  // State machine:
  //   (after clock-out) PENDING_MANAGER
  //       ↓ Manager approve
  //   PENDING_HR
  //       ↓ HR 'Chốt công'
  //   APPROVED
  //       ↓ reject (either level)
  //   REJECTED
  //
  approvalStatus: text('approval_status').notNull().default('PENDING_MANAGER'),
  // PENDING_MANAGER | PENDING_HR | APPROVED | REJECTED

  // Cấp 1: Manager duyệt
  approvedByManager:   integer('approved_by_manager').references(() => users.id),
  approvedByManagerAt: timestamp('approved_by_manager_at'),
  managerNote:         text('manager_note'),

  // Cấp 2: HR chốt công
  approvedByHr:   integer('approved_by_hr').references(() => users.id),
  approvedByHrAt: timestamp('approved_by_hr_at'),
  hrNote:         text('hr_note'),

  // HR có thể điều chỉnh giờ công (override totalHours)
  adjustedHours:  doublePrecision('adjusted_hours'),   // null = dùng totalHours gốc
  adjustReason:   text('adjust_reason'),    // Lý do điều chỉnh

  // ─── LIÊN KẾT NGHỈ PHÉP (Sprint 2) ──────────────────────────────────────
  // Khi HR duyệt đơn nghỉ → upsert record với status='ON_LEAVE' + leaveRequestId
  // Rule Engine đọc leaveRequestId → không phạt vắng mặt
  leaveRequestId: integer('leave_request_id').references(() => leaveRequests.id, { onDelete: 'set null' }),

  // ─── OFFLINE SYNC & FRAUD DETECTION ──────────────────────────────────────
  isOfflineSync:    boolean('is_offline_sync').notNull().default(false),
  clientTimestamp:  timestamp('client_timestamp'),
  offlineSyncDelta: integer('offline_sync_delta'), // Lệch thời gian tính bằng phút
  isFlagged:        boolean('is_flagged').notNull().default(false),
  flagReason:       text('flag_reason'),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ============================================================
// HR MODULE 01 – LEAVE REQUESTS (ĐƠN XIN NGHỈ)
// ============================================================
export const leaveRequests = pgTable('leave_requests', {
  id: serial('id').primaryKey(),
  employeeId: integer('employee_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

  // ─── Loại phép ───────────────────────────────────────────────────────────
  leaveType:   text('leave_type').notNull().default('ANNUAL'), // Giữ text cho legacy compat
  leaveTypeId: integer('leave_type_id').references(() => leaveTypes.id, { onDelete: 'set null' }),

  // ─── Thời gian ───────────────────────────────────────────────────────────
  startDate:  text('start_date').notNull(),  // YYYY-MM-DD
  endDate:    text('end_date').notNull(),    // YYYY-MM-DD
  period:     text('period').notNull().default('FULL_DAY'), // FULL_DAY | MORNING | AFTERNOON
  totalDays:  doublePrecision('total_days').notNull().default(1),
  reason:     text('reason'),
  attachmentUrl: text('attachment_url'),    // Link giấy tờ (bệnh viện, v.v.)

  // ─── TRẠNG THÁI (State Machine) ──────────────────────────────────────────
  // PENDING → PENDING_HR → APPROVED
  //         ↘ REJECTED  (any level)
  // APPROVED → CANCELLED (NV hủy trước ngày nghỉ)
  status: text('status').notNull().default('PENDING'),

  // ─── APPROVAL LEVEL ĐỘNG (chống overlap nhiều cấp quản lý) ───────────────
  // Mỗi đơn chỉ hiển thị trong queue của 1 cấp duy nhất tại 1 thời điểm
  // Khi cấp N duyệt: currentApprovalLevel tăng lên N+1, chỉ cấp N+1 thấy
  currentApprovalLevel: integer('current_approval_level').notNull().default(1),
  maxApprovalLevels:    integer('max_approval_levels').notNull().default(2),
  // maxApprovalLevels lấy từ leaveTypes.approvalLevels khi tạo đơn

  // ─── Legacy 1-cấp duyệt (giữ compat) ────────────────────────────────────
  reviewedBy: integer('reviewed_by').references(() => users.id),
  reviewedAt: timestamp('reviewed_at'),
  reviewNote: text('review_note'),

  // ─── CẤP 1: Manager duyệt ────────────────────────────────────────────────
  approvedByManager:   integer('approved_by_manager').references(() => users.id),
  approvedByManagerAt: timestamp('approved_by_manager_at'),
  managerNote:         text('manager_note'),

  // ─── CẤP 2: HR chốt (chỉ với loại phép requiresApproval = 2) ─────────────
  approvedByHr:   integer('approved_by_hr').references(() => users.id),
  approvedByHrAt: timestamp('approved_by_hr_at'),
  hrNote:         text('hr_note'),

  // ─── Hủy đơn ─────────────────────────────────────────────────────────────
  cancelledAt:  timestamp('cancelled_at'),
  cancelReason: text('cancel_reason'),

  idempotencyKey: text('idempotency_key').unique(),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ============================================================
// SPRINT 2 – LEAVE TYPES (DANH MỤC LOẠI PHÉP)
// ============================================================
export const leaveTypes = pgTable('leave_types', {
  id:   serial('id').primaryKey(),
  code: text('code').notNull().unique(), // 'ANNUAL' | 'SICK' | 'UNPAID' | 'MATERNITY' | 'COMPENSATORY'
  name: text('name').notNull(),          // 'Nghỉ phép năm' | 'Nghỉ ốm' | ...
  description: text('description'),

  // ─── Quỹ phép ───────────────────────────────────────────────────────────
  maxDaysPerYear:  doublePrecision('max_days_per_year'),    // null = không giới hạn
  isPaid:          boolean('is_paid').notNull().default(true),
  isCarryOver:     boolean('is_carry_over').notNull().default(false),
  maxCarryOverDays: integer('max_carry_over_days').default(5),

  // ─── Duyệt ──────────────────────────────────────────────────────────────
  requiresApproval: boolean('requires_approval').notNull().default(true),
  approvalLevels:   integer('approval_levels').notNull().default(2), // 1 hoặc 2
  maxDaysNoDoc:     integer('max_days_no_doc').default(3),  // Ko cần giấy tờ nếu <= X ngày

  // ─── Ảnh hưởng lương (cho Payroll module sau) ────────────────────────────
  // 'NONE' = hưởng nguyên lương | 'DEDUCT_BASIC' = trừ lương BHXH | 'DEDUCT_FULL' = không lương
  payrollImpact: text('payroll_impact').notNull().default('NONE'),

  isActive: boolean('is_active').notNull().default(true),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ============================================================
// SPRINT 2 – LEAVE BALANCES (QUỸ PHÉP TỒN)
// ============================================================
export const leaveBalances = pgTable('leave_balances', {
  id:          serial('id').primaryKey(),
  employeeId:  integer('employee_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  leaveTypeId: integer('leave_type_id').notNull().references(() => leaveTypes.id, { onDelete: 'cascade' }),
  year:        integer('year').notNull(),

  // ─── Phân bổ ────────────────────────────────────────────────────────────
  totalDays:    doublePrecision('total_days').notNull().default(0),  // Phép được cấp trong năm
  carryOverDays: doublePrecision('carry_over_days').notNull().default(0), // Phép carry-over từ năm trước

  // ─── Theo dõi realtime ───────────────────────────────────────────────────
  // Invariant: remainingDays = totalDays + carryOverDays - usedDays
  usedDays:    doublePrecision('used_days').notNull().default(0),    // Đã APPROVED
  pendingDays: doublePrecision('pending_days').notNull().default(0), // Đang chờ duyệt (in-flight)

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
// UNIQUE: (employee_id, leave_type_id, year) — enforced via migration

// ============================================================
// HR MODULE 01 – OVERTIME REQUESTS (TĂNG CA)
// ============================================================
export const overtimeRequests = pgTable('overtime_requests', {
  id: serial('id').primaryKey(),
  employeeId: integer('employee_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  workDate: text('work_date').notNull(),          // YYYY-MM-DD
  startTime: text('start_time').notNull(),        // HH:MM
  endTime: text('end_time').notNull(),            // HH:MM
  totalHours: doublePrecision('total_hours').notNull().default(0),
  reason: text('reason'),
  projectId: integer('project_id').references(() => projects.id, { onDelete: 'set null' }),
  status: text('status').notNull().default('PENDING'), // PENDING | APPROVED | REJECTED | CANCELLED

  // ─── LUỒNG DUYỆT 2 CẤP (giống leave_requests) ─────────────────────────────
  currentApprovalLevel: integer('current_approval_level').notNull().default(1),
  maxApprovalLevels:    integer('max_approval_levels').notNull().default(1),

  // Cấp 1: Manager trực tiếp
  approvedBy: integer('approved_by').references(() => users.id),
  approvedAt: timestamp('approved_at'),
  approveNote: text('approve_note'),

  // Cấp 2: HR chốt (nếu max_approval_levels=2)
  approvedByHr:   integer('approved_by_hr').references(() => users.id),
  approvedByHrAt: timestamp('approved_by_hr_at'),
  hrNote:         text('hr_note'),

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
// PRODUCTION BOM LINES (B\u01af\u1edaC 2: C\u1ea5u ki\u1ec7n s\u1ea3n xu\u1ea5t theo Zone BOQ)
// Ph\u00e2n r\u00e3 nguy\u00ean v\u1eadt li\u1ec7u: v\u00e1n MDF, n\u1eb9p T inox, ch\u1ec9 d\u00e1n c\u1ea1nh, b\u1ea3n l\u1ec1, \u0111\u00e8n LED
// ============================================================
export const productionBomLines = pgTable('production_bom_lines', {
  id:              serial('id').primaryKey(),
  projectId:       integer('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  zoneId:          text('zone_id').notNull(),           // ZN-PH-01, ZN-PLV-02, ...
  zoneName:        text('zone_name'),                   // Ph\u00f2ng h\u1ecd p, Ph\u00f2ng l\u00e0m vi\u1ec7c, ...
  productName:     text('product_name').notNull(),      // T\u00ean s\u1ea3n ph\u1ea9m (sau Levenshtein)
  materialCode:    text('material_code'),               // M\u00e3 v\u00e1n MDF/inox/...
  materialId:      integer('material_id').references(() => materials.id, { onDelete: 'set null' }),
  unit:            text('unit').notNull().default('c\u00e1i'), // m2, md, c\u00e1i, h\u1ec7
  qty:             numeric('qty', { precision: 18, scale: 4, mode: 'number' }).notNull().default(0),
  unitPrice:       numeric('unit_price', { precision: 20, scale: 2, mode: 'number' }).default(0),
  total:           numeric('total', { precision: 20, scale: 2, mode: 'number' }).default(0),
  supplyType:      text('supply_type').notNull().default('HOMEPRO_PRODUCTION'), // INSTALLATION_ONLY | HOMEPRO_PRODUCTION
  note:            text('note'),
  sttInZone:       integer('stt_in_zone'),              // S\u1ed1 th\u1ee9 t\u1ef1 trong ph\u00e2n khu
  createdAt:       timestamp('created_at').defaultNow(),
  updatedAt:       timestamp('updated_at').defaultNow(),
});

// ============================================================
// MATERIAL TRACKING LOGS (B\u01af\u1edaC 2: Qu\u00e9t m\u00e3 QR theo c\u00f4ng \u0111o\u1ea1n t\u1ea1i x\u01b0\u1edfng)
// Vòng đời: C\u1eaft v\u00e1n CNC \u2192 D\u00e1n c\u1ea1nh \u2192 \u0110\u00f3ng g\u00f3i \u2192 L\u1eafp \u0111\u1eb7t t\u1ea1i c\u00f4ng tr\u00ecnh
// ============================================================
export const materialTrackingLogs = pgTable('material_tracking_logs', {
  id:            serial('id').primaryKey(),
  projectId:     integer('project_id').references(() => projects.id, { onDelete: 'set null' }),
  bomLineId:     integer('bom_line_id').references(() => productionBomLines.id, { onDelete: 'set null' }),
  qrCode:        text('qr_code'),                       // M\u00e3 QR g\u00e1n tr\u00ean c\u1ea5u ki\u1ec7n
  stage:         text('stage').notNull(),               // CNC | DAN_CANH | DONG_GOI | LAP_DAT
  stageLabel:    text('stage_label'),                   // C\u1eaft v\u00e1n CNC | D\u00e1n c\u1ea1nh | \u0110\u00f3ng g\u00f3i | L\u1eafp \u0111\u1eb7t
  scannedByName: text('scanned_by_name'),               // T\u00ean nh\u00e2n vi\u00ean qu\u00e9t
  scannedById:   integer('scanned_by_id').references(() => users.id, { onDelete: 'set null' }),
  location:      text('location'),                      // "lat,lon" ho\u1eb7c t\u00ean khu v\u1ef1c
  note:          text('note'),
  scannedAt:     timestamp('scanned_at').defaultNow(),
});

// ============================================================
// TYPE EXPORTS
// ============================================================
export type ProductionBomLine    = typeof productionBomLines.$inferSelect;
export type NewProductionBomLine = typeof productionBomLines.$inferInsert;
export type MaterialTrackingLog    = typeof materialTrackingLogs.$inferSelect;
export type NewMaterialTrackingLog = typeof materialTrackingLogs.$inferInsert;
export type SupplyType = 'INSTALLATION_ONLY' | 'HOMEPRO_PRODUCTION';
export type ProductionStage = 'CNC' | 'DAN_CANH' | 'DONG_GOI' | 'LAP_DAT';

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

export type UserRole = 'ADMIN' | 'HR' | 'MANAGER' | 'SUPERVISOR' | 'WORKER' | 'VIEWER';
// HR: Phụ trách nhân sự + lương — thấy toàn bộ module HR, KHÔNG thấy Dự án
// MANAGER: Trưởng phòng/Quản đốc — thấy dự án + duyệt team mình
// SUPERVISOR: Tổ phó/Trưởng nhóm — mục tiêu hợp lệ cho Manager ủy quyền (Delegation)
export type ProjectStatus = 'ACTIVE' | 'COMPLETED' | 'ON_HOLD' | 'CANCELLED';
export type TaskStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'PAUSED' | 'OVERDUE';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH';
export type QcSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type QcStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY' | 'ON_LEAVE' | 'SICK_LEAVE' | 'NOT_CHECKED' | 'PENDING_CHECKOUT' | 'EARLY_LEAVE' | 'LATE_EARLY_LEAVE';
export type LeaveTypeCode = 'ANNUAL' | 'SICK' | 'PERSONAL' | 'UNPAID' | 'MATERNITY' | 'PATERNITY' | 'COMPENSATORY' | 'OTHER';
export type LeaveType = LeaveTypeCode; // backwards compat alias
export type LeavePeriod = 'FULL_DAY' | 'MORNING' | 'AFTERNOON';
export type LeaveRequestStatus = 'PENDING' | 'PENDING_HR' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export type RequestStatus = LeaveRequestStatus; // backwards compat alias
export type PayrollImpact = 'NONE' | 'DEDUCT_BASIC' | 'DEDUCT_FULL';
export type EmploymentType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT';
export type EmployeeStatus = 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE';
export type Department = 'Xưởng gỗ' | 'Thi công' | 'Thiết kế' | 'Kế toán' | 'Quản lý' | 'Khác';

// Sprint 2 new types
export type LeaveTypeRow = typeof leaveTypes.$inferSelect;
export type NewLeaveTypeRow = typeof leaveTypes.$inferInsert;
export type LeaveBalance = typeof leaveBalances.$inferSelect;
export type NewLeaveBalance = typeof leaveBalances.$inferInsert;

// ============================================================
// SPRINT 3 – MONTHLY PAYROLL (BẢNG LƯƠNG THÁNG)
// ============================================================

export const monthlyPayroll = pgTable('monthly_payroll', {
  id:            serial('id').primaryKey(),
  employeeId:    integer('employee_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  month:         integer('month').notNull(),    // 1-12
  year:          integer('year').notNull(),

  // ── Snapshot lương tại thời điểm tính ────────────────────────────────────
  officialSalary:  numeric('official_salary', { precision: 20, scale: 2, mode: 'number' }).notNull().default(0),
  basicSalary:     numeric('basic_salary', { precision: 20, scale: 2, mode: 'number' }).notNull().default(0),

  // ── Ngày/giờ công tổng hợp từ DailyCalculations ─────────────────────────
  regularWorkedDays:        doublePrecision('regular_worked_days').notNull().default(0),
  paidLeaveDays:            doublePrecision('paid_leave_days').notNull().default(0),
  eveningOtHours:           doublePrecision('evening_ot_hours').notNull().default(0),
  nightOtHours:             doublePrecision('night_ot_hours').notNull().default(0),
  sundayHours:              doublePrecision('sunday_hours').notNull().default(0),
  sundayNightHours:         doublePrecision('sunday_night_hours').notNull().default(0),
  holidayDaysOff:           doublePrecision('holiday_days_off').notNull().default(0),
  holidayWorkedWeekdayDays: doublePrecision('holiday_worked_weekday_days').notNull().default(0),
  holidayWorkedSundayDays:  doublePrecision('holiday_worked_sunday_days').notNull().default(0),
  unpaidLeaveDays:          doublePrecision('unpaid_leave_days').notNull().default(0),
  absentDays:               doublePrecision('absent_days').notNull().default(0),

  // ── Phụ cấp chuyên cần ───────────────────────────────────────────────────
  attendanceAllowance:  numeric('attendance_allowance', { precision: 20, scale: 2, mode: 'number' }).notNull().default(0),
  totalLateEarlyMins:   doublePrecision('total_late_early_mins').notNull().default(0),

  // ── Kết quả tính toán ────────────────────────────────────────────────────
  grossEarnings:    numeric('gross_earnings', { precision: 20, scale: 2, mode: 'number' }).notNull().default(0),
  totalDeductions:  numeric('total_deductions', { precision: 20, scale: 2, mode: 'number' }).notNull().default(0),
  netSalary:        numeric('net_salary', { precision: 20, scale: 2, mode: 'number' }).notNull().default(0),
  bhxhEmployee:     numeric('bhxh_employee', { precision: 20, scale: 2, mode: 'number' }).notNull().default(0),
  bhxhEmployer:     numeric('bhxh_employer', { precision: 20, scale: 2, mode: 'number' }).notNull().default(0),

  // ── Khấu trừ cụ thể ──────────────────────────────────────────────────────
  advanceDeduction: doublePrecision('advance_deduction').notNull().default(0),
  otherDeductions:  doublePrecision('other_deductions').notNull().default(0),

  // ── Chi tiết dòng lương (JSON array of PayrollLineItem) ──────────────────
  lineItemsJson: jsonb('line_items_json'),    // PayrollLineItem[] — đầy đủ để audit
  warningsJson:  jsonb('warnings_json'),      // string[] — cảnh báo OT, dữ liệu thiếu

  // ── Trạng thái — CƠ CHẾ CÔNG BỐ ────────────────────────────────────────
  // DRAFT     : HR vừa chạy tính lương — chỉ HR/Admin thấy (nhân viên không thấy)
  // PUBLISHED : HR đã chốt sổ và công bố — nhân viên thấy trên phiếu lương cá nhân
  status: text('status').notNull().default('DRAFT'),
  // DRAFT | PUBLISHED

  // ── Phê duyệt & Thanh toán ───────────────────────────────────────────────
  publishedBy:  integer('published_by').references(() => users.id),
  publishedAt:  timestamp('published_at'),
  note:         text('note'),

  idempotencyKey: text('idempotency_key').unique(),

  calculatedAt: timestamp('calculated_at').defaultNow(),
  createdAt:    timestamp('created_at').defaultNow(),
  updatedAt:    timestamp('updated_at').defaultNow(),
}, (table) => ({
  unqPayrollEmpMonthYear: unique('uq_payroll_emp_month_year').on(table.employeeId, table.month, table.year),
}));

// Sprint 3 new types
export type MonthlyPayroll    = typeof monthlyPayroll.$inferSelect;
export type NewMonthlyPayroll = typeof monthlyPayroll.$inferInsert;
export type PayrollStatus     = 'DRAFT' | 'PUBLISHED';

// ============================================================
// SPRINT 3 – PAYSLIP DISPUTES (KHIẾU NẠI PHIẾU LƯƠNG)
// ============================================================
export const payslipDisputes = pgTable('payslip_disputes', {
  id:         serial('id').primaryKey(),

  // FK tới phiếu lương (1 phiếu lương → nhiều lần khiếu nại nếu CLOSED/RESOLVED cũ)
  payrollId:  integer('payroll_id').notNull().references(() => monthlyPayroll.id, { onDelete: 'cascade' }),
  // Denormalized để query nhanh theo nhân viên (không cần JOIN monthly_payroll)
  employeeId: integer('employee_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  month:      integer('month').notNull(),
  year:       integer('year').notNull(),

  // Nội dung khiếu nại của nhân viên
  reason:     text('reason').notNull(),

  // State machine:
  //   OPEN → HR xem xét → UNDER_REVIEW → giải quyết → RESOLVED hoặc CLOSED
  //   RESOLVED: HR chấp thuận và sẽ điều chỉnh
  //   CLOSED:   Bác bỏ / đã giải quyết xong
  status:     text('status').notNull().default('OPEN'),
  // OPEN | UNDER_REVIEW | RESOLVED | CLOSED

  // Phản hồi của HR
  hrResponse:  text('hr_response'),
  reviewedBy:  integer('reviewed_by').references(() => users.id),
  reviewedAt:  timestamp('reviewed_at'),

  createdAt:   timestamp('created_at').defaultNow(),
  updatedAt:   timestamp('updated_at').defaultNow(),
});

export type PayslipDispute    = typeof payslipDisputes.$inferSelect;
export type NewPayslipDispute = typeof payslipDisputes.$inferInsert;
export type DisputeStatus     = 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'CLOSED';


// ============================================================
// RBAC — MANAGER DEPARTMENTS (LÕI PHÂN QUYỀN)
// Bất kỳ user nào có role MANAGER phải tra cứu bảng này
// để biết họ được phép xem/duyệt phòng ban nào + ở cấp mấy
// ============================================================
export const managerDepartments = pgTable('manager_departments', {
  id:              serial('id').primaryKey(),
  managerId:       integer('manager_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  departmentId:    integer('department_id').notNull().references(() => departments.id, { onDelete: 'cascade' }),

  // Cấp quản lý trong phòng ban này — dùng khớp với currentApprovalLevel
  managementLevel: integer('management_level').notNull().default(1),
  // 1 = Tổ trưởng / Trưởng nhóm (duyệt cấp 1 — trực tiếp)
  // 2 = Quản đốc / Trưởng phòng  (duyệt cấp 2)
  // 3 = Giám đốc / BGĐ            (duyệt cấp 3 nếu cần)

  canView:    boolean('can_view').notNull().default(true),    // Xem dữ liệu phòng
  canApprove: boolean('can_approve').notNull().default(false), // Duyệt đơn từ phòng
  canManage:  boolean('can_manage').notNull().default(false),  // Tạo/sửa/xóa (trưởng phòng)

  createdAt:  timestamp('created_at').defaultNow(),
  // UNIQUE(manager_id, department_id) — enforced via migration
});


// ============================================================
// RBAC — DELEGATIONS (ỦY QUYỀN TẠM THỜI)
// Manager ủy quyền cho SUPERVISOR trong thời gian có giới hạn
// Nguyên tắc cứng: Delegate KHÔNG được re-delegate
// ============================================================
export const delegations = pgTable('delegations', {
  id:            serial('id').primaryKey(),
  delegatorId:   integer('delegator_id').notNull().references(() => users.id),
  // Người ủy quyền — phải là MANAGER
  delegateId:    integer('delegate_id').notNull().references(() => users.id),
  // Người nhận ủy quyền — phải là SUPERVISOR

  // Phạm vi quyền được ủy quyền
  scope:         text('scope').array().notNull(),
  // Ví dụ: ['APPROVE_ATTENDANCE', 'APPROVE_LEAVE', 'APPROVE_OT']

  // Phạm vi phòng ban — subset của phòng Manager quản lý
  departmentIds: integer('department_ids').array().notNull(),

  startAt:  timestamp('start_at').notNull(),
  endAt:    timestamp('end_at').notNull(),
  reason:   text('reason'),           // 'Đi công tác Hà Nội 3 ngày'

  isActive:  boolean('is_active').notNull().default(true),
  revokedAt: timestamp('revoked_at'),  // Thời điểm thu hồi sớm (nếu có)
  createdBy: integer('created_by').references(() => users.id), // Admin tạo
  createdAt: timestamp('created_at').defaultNow(),
});


// ============================================================
// RBAC — LEAVE APPROVALS (AUDIT TRAIL TỪNG CẤP DUYỆT)
// Ghi lại ai duyệt gì ở cấp nào — không thể xóa/sửa
// ============================================================
export const leaveApprovals = pgTable('leave_approvals', {
  id:            serial('id').primaryKey(),
  requestId:     integer('request_id').notNull().references(() => leaveRequests.id, { onDelete: 'cascade' }),
  approverId:    integer('approver_id').notNull().references(() => users.id),
  approvalLevel: integer('approval_level').notNull(),  // Cấp nào đã hành động (1, 2, 3)
  action:        text('action').notNull(),
  // 'APPROVED' | 'REJECTED' | 'DELEGATED_APPROVED' | 'DELEGATED_REJECTED'
  comment:       text('comment'),
  delegatedFor:  integer('delegated_for').references(() => users.id),
  // Nếu là ủy quyền: ID của Manager gốc (approver đang thay mặt ai)
  approvedAt:    timestamp('approved_at').defaultNow(),
});

// Type exports — RBAC
export type DepartmentRow    = typeof departments.$inferSelect;
export type NewDepartmentRow = typeof departments.$inferInsert;
export type ManagerDepartment    = typeof managerDepartments.$inferSelect;
export type NewManagerDepartment = typeof managerDepartments.$inferInsert;
export type Delegation    = typeof delegations.$inferSelect;
export type NewDelegation = typeof delegations.$inferInsert;
export type LeaveApproval    = typeof leaveApprovals.$inferSelect;
export type NewLeaveApproval = typeof leaveApprovals.$inferInsert;
export type ManagementLevel = 1 | 2 | 3;
export type DelegationScope = 'APPROVE_ATTENDANCE' | 'APPROVE_LEAVE' | 'APPROVE_OT' | 'VIEW_TEAM_PAYROLL';

// ============================================================
// PERMISSION ARCHITECTURE (P0.9.4)
// ============================================================
export const permissions = pgTable('permissions', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(), // e.g., PAYROLL_CALCULATE
  description: text('description'),
});

export const rolePermissions = pgTable('role_permissions', {
  role: text('role').notNull(), // text enum linking to UserRole
  permissionId: integer('permission_id').notNull().references(() => permissions.id, { onDelete: 'cascade' }),
  scope: text('scope').notNull().default('COMPANY'), // 'SELF' | 'DEPARTMENT' | 'COMPANY' | 'SYSTEM'
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.role, table.permissionId] }),
  };
});

export type Permission = typeof permissions.$inferSelect;
export type NewPermission = typeof permissions.$inferInsert;
export type RolePermission = typeof rolePermissions.$inferSelect;
export type NewRolePermission = typeof rolePermissions.$inferInsert;

// ============================================================
// P0.15 HR CORE DATA MODEL
// ============================================================

export const positions = pgTable('positions', {
  id: serial('id').primaryKey(),
  code: text('code').unique(),
  name: text('name').notNull(),
  status: text('status').notNull().default('ACTIVE'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ============================================================
// P12 – DOCUMENT CENTER
// ============================================================
export const documents = pgTable('documents', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  folder: text('folder').notNull().default('COMPANY'), // COMPANY, EMPLOYEE, CONTRACT, PROJECT, etc.
  
  // Link to other entities (Polymorphic-like structure via separate ID fields or single entityType/entityId)
  entityType: text('entity_type'), // user, project, customer, supplier, purchase_order, etc.
  entityId: integer('entity_id'),

  ownerId: integer('owner_id').references(() => users.id, { onDelete: 'set null' }),
  departmentId: integer('department_id').references(() => departments.id, { onDelete: 'set null' }), // for department-level access
  
  // Quick access to latest version info
  latestVersion: integer('latest_version').notNull().default(1),
  status: text('status').notNull().default('ACTIVE'), // ACTIVE, ARCHIVED, DELETED
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const documentVersions = pgTable('document_versions', {
  id: serial('id').primaryKey(),
  documentId: integer('document_id').notNull().references(() => documents.id, { onDelete: 'cascade' }),
  versionNumber: integer('version_number').notNull(),
  fileUrl: text('file_url').notNull(),
  fileType: text('file_type'),
  fileSize: integer('file_size'),
  
  createdBy: integer('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow(),
  status: text('status').notNull().default('CURRENT'), // CURRENT, SUPERSEDED
  changeNote: text('change_note'),
});

export type DocumentRow = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
export type DocumentVersion = typeof documentVersions.$inferSelect;
export type NewDocumentVersion = typeof documentVersions.$inferInsert;


export const employees = pgTable('employees', {
  id: serial('id').primaryKey(),
  employeeCode: text('employee_code').notNull().unique(),
  userId: integer('user_id').unique().references(() => users.id, { onDelete: 'set null' }),
  fullName: text('full_name').notNull(),
  departmentId: integer('department_id').notNull().references(() => departments.id, { onDelete: 'restrict' }),
  positionId: integer('position_id').references(() => positions.id, { onDelete: 'restrict' }),
  managerId: integer('manager_id'), // Evaluated at logic level to self
  employmentStatus: text('employment_status').notNull().default('ACTIVE'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const employmentContracts = pgTable('employment_contracts', {
  id: serial('id').primaryKey(),
  employeeId: integer('employee_id').references(() => employees.id, { onDelete: 'cascade' }), // Legacy
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }), // Canonical
  contractType: text('contract_type').notNull().default('FULL_TIME'),
  status: text('status').notNull().default('ACTIVE'),
  startDate: text('start_date').notNull(),
  endDate: text('end_date'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const salaryProfiles = pgTable('salary_profiles', {
  id: serial('id').primaryKey(),
  employeeId: integer('employee_id').references(() => employees.id, { onDelete: 'cascade' }), // Legacy
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }), // Canonical
  baseSalary: doublePrecision('base_salary').notNull().default(0),
  effectiveFrom: text('effective_from').notNull(),
  effectiveTo: text('effective_to'),
  status: text('status').notNull().default('ACTIVE'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const salaryComponents = pgTable('salary_components', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type').notNull(), // ALLOWANCE, DEDUCTION, etc.
  taxable: boolean('taxable').notNull().default(false),
  status: text('status').notNull().default('ACTIVE'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const employeeSalaryComponents = pgTable('employee_salary_components', {
  id: serial('id').primaryKey(),
  employeeId: integer('employee_id').references(() => employees.id, { onDelete: 'cascade' }), // Legacy
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }), // Canonical
  componentId: integer('component_id').notNull().references(() => salaryComponents.id, { onDelete: 'restrict' }),
  amount: numeric('amount', { precision: 20, scale: 2, mode: 'number' }).notNull().default(0),
  effectiveFrom: text('effective_from').notNull(),
  effectiveTo: text('effective_to'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ============================================================
// P2 ACCOUNTING CORE (FINANCIAL FOUNDATION)
// ============================================================

export const accounts = pgTable('accounts', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(), // 111, 112, 334, 642...
  name: text('name').notNull(),
  type: text('type').notNull(), // ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE
  parentId: integer('parent_id'), // recursive FK (can't reference self inside definition easily without AnyPgColumn, will handle via query or implicit)
  isGroup: boolean('is_group').notNull().default(false),
  currency: text('currency').notNull().default('VND'),
  status: text('status').notNull().default('ACTIVE'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const accountingPeriods = pgTable('accounting_periods', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(), // e.g., "08-2026"
  startDate: text('start_date').notNull(), // YYYY-MM-DD
  endDate: text('end_date').notNull(), // YYYY-MM-DD
  status: text('status').notNull().default('OPEN'), // OPEN, LOCKED, CLOSED
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const journalEntries = pgTable('journal_entries', {
  id: serial('id').primaryKey(),
  entryNo: text('entry_no').notNull().unique(), // JV-202608-0001
  postingDate: text('posting_date').notNull(),
  periodId: integer('period_id').notNull().references(() => accountingPeriods.id, { onDelete: 'restrict' }),
  referenceType: text('reference_type'), // PAYROLL, INVENTORY, MANUAL
  referenceId: integer('reference_id'),
  totalDebit: doublePrecision('total_debit').notNull().default(0),
  totalCredit: doublePrecision('total_credit').notNull().default(0),
  status: text('status').notNull().default('DRAFT'), // DRAFT, POSTED, CANCELLED, REVERSED
  description: text('description'),
  createdBy: integer('created_by').references(() => users.id, { onDelete: 'set null' }),
  postedBy: integer('posted_by').references(() => users.id, { onDelete: 'set null' }),
  postedAt: timestamp('posted_at'),
  reversedBy: integer('reversed_by').references(() => users.id, { onDelete: 'set null' }),
  reversalOf: integer('reversal_of'), // points to another journalEntries.id
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  unqRef: unique().on(table.referenceType, table.referenceId)
}));

export const journalEntryLines = pgTable('journal_entry_lines', {
  id: serial('id').primaryKey(),
  journalEntryId: integer('journal_entry_id').notNull().references(() => journalEntries.id, { onDelete: 'cascade' }),
  accountId: integer('account_id').notNull().references(() => accounts.id, { onDelete: 'restrict' }),
  departmentId: integer('department_id').references(() => departments.id, { onDelete: 'set null' }), // Cost Center
  projectId: integer('project_id').references(() => projects.id, { onDelete: 'set null' }), // Project Dimension
  partyType: text('party_type'), // EMPLOYEE, CUSTOMER, SUPPLIER
  partyId: integer('party_id'),
  debit: numeric('debit', { precision: 20, scale: 2, mode: 'number' }).notNull().default(0),
  credit: numeric('credit', { precision: 20, scale: 2, mode: 'number' }).notNull().default(0),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

import { relations } from 'drizzle-orm';

export const journalEntriesRelations = relations(journalEntries, ({ one, many }) => ({
  period: one(accountingPeriods, {
    fields: [journalEntries.periodId],
    references: [accountingPeriods.id],
  }),
  lines: many(journalEntryLines),
}));

export const journalEntryLinesRelations = relations(journalEntryLines, ({ one }) => ({
  journalEntry: one(journalEntries, {
    fields: [journalEntryLines.journalEntryId],
    references: [journalEntries.id],
  }),
  account: one(accounts, {
    fields: [journalEntryLines.accountId],
    references: [accounts.id],
  }),
  department: one(departments, {
    fields: [journalEntryLines.departmentId],
    references: [departments.id],
  }),
  project: one(projects, {
    fields: [journalEntryLines.projectId],
    references: [projects.id],
  })
}));

// ============================================================================
// P3 PROCUREMENT CORE SCHEMA
// ============================================================================

export const suppliers = pgTable('suppliers', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  taxCode: text('tax_code'),
  phone: text('phone'),
  email: text('email'),
  address: text('address'),
  paymentTerms: text('payment_terms'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const supplierContacts = pgTable('supplier_contacts', {
  id: serial('id').primaryKey(),
  supplierId: integer('supplier_id').notNull().references(() => suppliers.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  phone: text('phone'),
  email: text('email'),
  position: text('position'),
  isPrimary: boolean('is_primary').default(false),
  createdAt: timestamp('created_at').defaultNow()
});

export const supplierItems = pgTable('supplier_items', {
  id: serial('id').primaryKey(),
  supplierId: integer('supplier_id').notNull().references(() => suppliers.id, { onDelete: 'cascade' }),
  materialId: integer('material_id').notNull().references(() => materials.id, { onDelete: 'cascade' }),
  supplierItemCode: text('supplier_item_code'),
  createdAt: timestamp('created_at').defaultNow()
});

export const supplierPrices = pgTable('supplier_prices', {
  id: serial('id').primaryKey(),
  supplierItemId: integer('supplier_item_id').notNull().references(() => supplierItems.id, { onDelete: 'cascade' }),
  price: numeric('price', { precision: 20, scale: 2, mode: 'number' }).notNull(),
  currency: text('currency').default('VND'),
  effectiveDate: timestamp('effective_date').notNull(),
  endDate: timestamp('end_date'),
  createdAt: timestamp('created_at').defaultNow()
});

export const purchaseRequests = pgTable('purchase_requests', {
  id: serial('id').primaryKey(),
  requestNumber: text('request_number').notNull().unique(),
  requestDate: timestamp('request_date').notNull(),
  requesterId: integer('requester_id').references(() => users.id),
  departmentId: integer('department_id').references(() => departments.id),
  projectId: integer('project_id').references(() => projects.id),
  status: text('status').notNull().default('DRAFT'), // DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED, CONVERTED
  reason: text('reason'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  submittedBy: integer('submitted_by').references(() => users.id),
  submittedAt: timestamp('submitted_at'),
  approvedBy: integer('approved_by').references(() => users.id),
  approvedAt: timestamp('approved_at'),
  rejectedBy: integer('rejected_by').references(() => users.id),
  rejectedAt: timestamp('rejected_at')
});

export const purchaseRequestItems = pgTable('purchase_request_items', {
  id: serial('id').primaryKey(),
  requestId: integer('request_id').notNull().references(() => purchaseRequests.id, { onDelete: 'cascade' }),
  materialId: integer('material_id').references(() => materials.id),
  boqItemId: integer('boq_item_id').references(() => boqItems.id),
  description: text('description').notNull(),
  quantity: numeric('quantity', { precision: 18, scale: 4, mode: 'number' }).notNull(),
  unit: text('unit').notNull(),
  requiredDate: timestamp('required_date'),
  projectId: integer('project_id').references(() => projects.id)
});

export const purchaseOrders = pgTable('purchase_orders', {
  id: serial('id').primaryKey(),
  poNumber: text('po_number').notNull().unique(),
  supplierId: integer('supplier_id').notNull().references(() => suppliers.id),
  requestId: integer('request_id').references(() => purchaseRequests.id),
  projectId: integer('project_id').references(() => projects.id),
  costCenterId: integer('cost_center_id').references(() => departments.id), // Using dept as cost center placeholder
  orderDate: timestamp('order_date').notNull(),
  expectedDate: timestamp('expected_date'),
  status: text('status').notNull().default('DRAFT'), // DRAFT, SUBMITTED, APPROVED, SENT, PARTIALLY_RECEIVED, RECEIVED, PARTIALLY_INVOICED, INVOICED, CANCELLED, CLOSED
  currency: text('currency').default('VND'),
  subtotal: doublePrecision('subtotal').notNull().default(0),
  tax: doublePrecision('tax').notNull().default(0),
  total: numeric('total', { precision: 20, scale: 2, mode: 'number' }).notNull().default(0),
  notes: text('notes'),
  idempotencyKey: text('idempotency_key').unique(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  createdBy: integer('created_by').references(() => users.id),
  approvedBy: integer('approved_by').references(() => users.id),
  approvedAt: timestamp('approved_at')
});

export const purchaseOrderItems = pgTable('purchase_order_items', {
  id: serial('id').primaryKey(),
  poId: integer('po_id').notNull().references(() => purchaseOrders.id, { onDelete: 'cascade' }),
  materialId: integer('material_id').references(() => materials.id),
  description: text('description').notNull(),
  quantity: numeric('quantity', { precision: 18, scale: 4, mode: 'number' }).notNull(),
  unit: text('unit').notNull(),
  unitPrice: numeric('unit_price', { precision: 20, scale: 2, mode: 'number' }).notNull().default(0),
  taxRate: doublePrecision('tax_rate').default(0),
  taxAmount: doublePrecision('tax_amount').default(0),
  lineTotal: doublePrecision('line_total').notNull().default(0),
  receivedQuantity: numeric('received_quantity', { precision: 18, scale: 4, mode: 'number' }).notNull().default(0),
  invoicedQuantity: doublePrecision('invoiced_quantity').notNull().default(0),
  projectId: integer('project_id').references(() => projects.id)
});

export const goodsReceipts = pgTable('goods_receipts', {
  id: serial('id').primaryKey(),
  receiptNumber: text('receipt_number').notNull().unique(),
  poId: integer('po_id').notNull().references(() => purchaseOrders.id),
  supplierId: integer('supplier_id').notNull().references(() => suppliers.id),
  // warehouseId: integer('warehouse_id'), // Mocking warehouse for now, no warehouse table exists
  receiptDate: timestamp('receipt_date').notNull(),
  receivedBy: integer('received_by').references(() => users.id),
  status: text('status').notNull().default('DRAFT'), // DRAFT, POSTED, CANCELLED
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const goodsReceiptItems = pgTable('goods_receipt_items', {
  id: serial('id').primaryKey(),
  receiptId: integer('receipt_id').notNull().references(() => goodsReceipts.id, { onDelete: 'cascade' }),
  poItemId: integer('po_item_id').notNull().references(() => purchaseOrderItems.id),
  materialId: integer('material_id').references(() => materials.id),
  orderedQuantity: numeric('ordered_quantity', { precision: 18, scale: 4, mode: 'number' }).notNull(),
  receivedQuantity: numeric('received_quantity', { precision: 18, scale: 4, mode: 'number' }).notNull(),
  acceptedQuantity: doublePrecision('accepted_quantity').notNull().default(0),
  rejectedQuantity: doublePrecision('rejected_quantity').notNull().default(0),
  warehouseLocation: text('warehouse_location')
});

export const supplierInvoices = pgTable('supplier_invoices', {
  id: serial('id').primaryKey(),
  invoiceNumber: text('invoice_number').notNull().unique(),
  supplierId: integer('supplier_id').notNull().references(() => suppliers.id),
  poId: integer('po_id').notNull().references(() => purchaseOrders.id),
  receiptId: integer('receipt_id').references(() => goodsReceipts.id),
  invoiceDate: timestamp('invoice_date').notNull(),
  dueDate: timestamp('due_date'),
  subtotal: doublePrecision('subtotal').notNull().default(0),
  tax: doublePrecision('tax').notNull().default(0),
  total: numeric('total', { precision: 20, scale: 2, mode: 'number' }).notNull().default(0),
  status: text('status').notNull().default('DRAFT'), // DRAFT, SUBMITTED, APPROVED, POSTED, PAID, CANCELLED
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  createdBy: integer('created_by').references(() => users.id),
  approvedBy: integer('approved_by').references(() => users.id),
  approvedAt: timestamp('approved_at'),
  postedBy: integer('posted_by').references(() => users.id),
  postedAt: timestamp('posted_at')
});

export const supplierInvoiceItems = pgTable('supplier_invoice_items', {
  id: serial('id').primaryKey(),
  invoiceId: integer('invoice_id').notNull().references(() => supplierInvoices.id, { onDelete: 'cascade' }),
  poItemId: integer('po_item_id').notNull().references(() => purchaseOrderItems.id),
  description: text('description').notNull(),
  quantity: numeric('quantity', { precision: 18, scale: 4, mode: 'number' }).notNull(),
  unitPrice: numeric('unit_price', { precision: 20, scale: 2, mode: 'number' }).notNull(),
  lineTotal: doublePrecision('line_total').notNull()
});

// ============================================================================
// P4 INVENTORY & WAREHOUSE CORE SCHEMA
// ============================================================================

export const warehouses = pgTable('warehouses', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  type: text('type').notNull().default('MAIN_WAREHOUSE'), // MAIN_WAREHOUSE, WORKSHOP, PROJECT_SITE, TRANSIT
  address: text('address'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const inventoryBalances = pgTable('inventory_balances', {
  id: serial('id').primaryKey(),
  materialId: integer('material_id').notNull().references(() => materials.id),
  warehouseId: integer('warehouse_id').notNull().references(() => warehouses.id),
  locationId: text('location_id'),
  quantity: numeric('quantity', { precision: 18, scale: 4, mode: 'number' }).notNull().default(0),
  reservedQuantity: doublePrecision('reserved_quantity').notNull().default(0),
  availableQuantity: doublePrecision('available_quantity').notNull().default(0),
  unitCost: doublePrecision('unit_cost').notNull().default(0), // Weighted Average Cost
  lastUpdated: timestamp('last_updated').defaultNow()
}, (t) => ({
  unq_bal: unique('inventory_balances_mat_wh_loc_idx').on(t.materialId, t.warehouseId, t.locationId)
}));

export const inventoryTransactions = pgTable('inventory_transactions', {
  id: serial('id').primaryKey(),
  movementNumber: text('movement_number').notNull().unique(),
  movementType: text('movement_type').notNull(), // RECEIPT, ISSUE, TRANSFER, ADJUSTMENT, RESERVATION, RELEASE
  materialId: integer('material_id').notNull().references(() => materials.id),
  warehouseId: integer('warehouse_id').notNull().references(() => warehouses.id),
  locationId: text('location_id'),
  quantity: numeric('quantity', { precision: 18, scale: 4, mode: 'number' }).notNull(),
  unitCost: doublePrecision('unit_cost').notNull().default(0),
  totalCost: doublePrecision('total_cost').notNull().default(0),
  referenceType: text('reference_type'), // PO, PR, GR, ISSUE, TRANSFER, RETURN, PROD_ORDER
  referenceId: integer('reference_id'),
  projectId: integer('project_id').references(() => projects.id),
  createdBy: integer('created_by').references(() => users.id),
  movementDate: timestamp('movement_date').notNull().defaultNow(),
  idempotencyKey: text('idempotency_key').unique(),
  createdAt: timestamp('created_at').defaultNow(),
  notes: text('notes')
});




// ============================================================================
// P5 PRODUCTION / MANUFACTURING CORE SCHEMA
// ============================================================================


export const workCenters = pgTable('work_centers', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  departmentId: integer('department_id').references(() => departments.id),
  managerId: integer('manager_id').references(() => users.id),
  standardHourlyCost: numeric('standard_hourly_cost', { precision: 20, scale: 2, mode: 'number' }).default(0),
  dailyCapacityHours: numeric('daily_capacity_hours', { precision: 18, scale: 4, mode: 'number' }).default(8),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow()
});

export const machines = pgTable('machines', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  type: text('type').notNull(), // CNC, EDGE_BANDER, SAW, ASSEMBLY_STATION
  isActive: boolean('is_active').default(true),
  workCenterId: integer('work_center_id').references(() => workCenters.id),
  createdAt: timestamp('created_at').defaultNow()
});

export const boms = pgTable('boms', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').notNull().references(() => materials.id), // The material that represents the finished product
  name: text('name').notNull(),
  version: text('version').notNull().default('1.0'),
  status: text('status').notNull().default('ACTIVE'), // DRAFT, ACTIVE, OBSOLETE
  revisionReason: text('revision_reason'),
  createdBy: integer('created_by').references(() => users.id),
  approvedBy: integer('approved_by').references(() => users.id),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const bomItems = pgTable('bom_items', {
  id: serial('id').primaryKey(),
  bomId: integer('bom_id').notNull().references(() => boms.id, { onDelete: 'cascade' }),
  materialId: integer('material_id').notNull().references(() => materials.id),
  quantity: numeric('quantity', { precision: 18, scale: 4, mode: 'number' }).notNull(),
  unit: text('unit').notNull(),
  scrapPercentage: numeric('scrap_percentage', { precision: 18, scale: 4, mode: 'number' }).default(0),
  wastePercentage: numeric('waste_percentage', { precision: 18, scale: 4, mode: 'number' }).default(0),
  isRequired: boolean('is_required').default(true),
  position: text('position'),
  notes: text('notes'),
  workCenterId: integer('work_center_id').references(() => workCenters.id)
});

export const materialRequirements = pgTable('material_requirements', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  boqId: integer('boq_id').references(() => boqs.id, { onDelete: 'cascade' }),
  productionOrderId: integer('production_order_id').references(() => productionOrders.id, { onDelete: 'cascade' }),
  materialId: integer('material_id').notNull().references(() => materials.id),
  requiredQty: numeric('required_qty', { precision: 18, scale: 4, mode: 'number' }).notNull(),
  stockAtCalculation: numeric('stock_at_calculation', { precision: 18, scale: 4, mode: 'number' }).default(0),
  shortageQty: numeric('shortage_qty', { precision: 18, scale: 4, mode: 'number' }).notNull(),
  status: text('status').notNull().default('PENDING'), // PENDING, PR_CREATED, PO_CREATED, RECEIVED
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});


export const routings = pgTable('routings', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').notNull().references(() => materials.id),
  name: text('name').notNull(),
  version: text('version').notNull().default('1.0'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const routingSteps = pgTable('routing_steps', {
  id: serial('id').primaryKey(),
  routingId: integer('routing_id').notNull().references(() => routings.id, { onDelete: 'cascade' }),
  sequence: integer('sequence').notNull(),
  operation: text('operation').notNull(), // CUTTING, CNC, EDGE_BANDING, DRILLING, ASSEMBLY, QC
  workCenterId: integer('work_center_id').references(() => workCenters.id),
  estimatedMinutes: doublePrecision('estimated_minutes').default(0)
});

export const productionPlans = pgTable('production_plans', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  projectId: integer('project_id').notNull().references(() => projects.id),
  name: text('name').notNull(),
  status: text('status').notNull().default('DRAFT'), // DRAFT, APPROVED, IN_PROGRESS, COMPLETED, CANCELLED
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),
  notes: text('notes'),
  createdBy: integer('created_by').references(() => users.id),
  approvedBy: integer('approved_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const productionPlanItems = pgTable('production_plan_items', {
  id: serial('id').primaryKey(),
  planId: integer('plan_id').notNull().references(() => productionPlans.id, { onDelete: 'cascade' }),
  productId: integer('product_id').notNull().references(() => materials.id),
  bomId: integer('bom_id').references(() => boms.id),
  plannedQuantity: numeric('planned_quantity', { precision: 18, scale: 4, mode: 'number' }).notNull(),
  orderedQuantity: numeric('ordered_quantity', { precision: 18, scale: 4, mode: 'number' }).notNull().default(0),
  completedQuantity: numeric('completed_quantity', { precision: 18, scale: 4, mode: 'number' }).notNull().default(0),
  priority: text('priority').default('NORMAL'),
  plannedStart: timestamp('planned_start'),
  plannedEnd: timestamp('planned_end')
});

export const productionOrders = pgTable('production_orders', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  projectId: integer('project_id').notNull().references(() => projects.id),
  planId: integer('plan_id').references(() => productionPlans.id),
  planItemId: integer('plan_item_id').references(() => productionPlanItems.id),
  productId: integer('product_id').notNull().references(() => materials.id),
  bomId: integer('bom_id').references(() => boms.id),
  routingId: integer('routing_id').references(() => routings.id),
  plannedQuantity: numeric('planned_quantity', { precision: 18, scale: 4, mode: 'number' }).notNull(),
  completedQuantity: numeric('completed_quantity', { precision: 18, scale: 4, mode: 'number' }).notNull().default(0),
  status: text('status').notNull().default('DRAFT'), // DRAFT, PLANNED, RELEASED, IN_PROGRESS, COMPLETED, CANCELLED
  qcStatus: text('qc_status').notNull().default('PENDING'), // PENDING, PASS, FAIL
  requiresQc: boolean('requires_qc').default(false),
  priority: text('priority').default('NORMAL'),
  plannedStart: timestamp('planned_start'),
  plannedEnd: timestamp('planned_end'),
  createdBy: integer('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const workOrders = pgTable('work_orders', {
  id: serial('id').primaryKey(),
  productionOrderId: integer('production_order_id').notNull().references(() => productionOrders.id, { onDelete: 'cascade' }),
  operation: text('operation').notNull(),
  sequence: integer('sequence').notNull(),
  plannedQuantity: numeric('planned_quantity', { precision: 18, scale: 4, mode: 'number' }).notNull(),
  completedQuantity: numeric('completed_quantity', { precision: 18, scale: 4, mode: 'number' }).notNull().default(0),
  status: text('status').notNull().default('PENDING'), // PENDING, IN_PROGRESS, COMPLETED, BLOCKED
  requiresQc: boolean('requires_qc').default(false),
  assignedUserId: integer('assigned_user_id').references(() => users.id),
  workCenterId: integer('work_center_id').references(() => workCenters.id),
  machineId: integer('machine_id').references(() => machines.id),
  startTime: timestamp('start_time'),
  endTime: timestamp('end_time'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const materialConsumptions = pgTable('material_consumptions', {
  id: serial('id').primaryKey(),
  productionOrderId: integer('production_order_id').notNull().references(() => productionOrders.id),
  materialId: integer('material_id').notNull().references(() => materials.id),
  warehouseId: integer('warehouse_id').notNull().references(() => warehouses.id),
  plannedQuantity: numeric('planned_quantity', { precision: 18, scale: 4, mode: 'number' }).notNull(),
  actualQuantity: numeric('actual_quantity', { precision: 18, scale: 4, mode: 'number' }).notNull().default(0),
  scrapQuantity: numeric('scrap_quantity', { precision: 18, scale: 4, mode: 'number' }).notNull().default(0),
  wasteQuantity: numeric('waste_quantity', { precision: 18, scale: 4, mode: 'number' }).notNull().default(0),
  userId: integer('user_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow()
});

export const productionOutputs = pgTable('production_outputs', {
  id: serial('id').primaryKey(),
  outputNumber: text('output_number').notNull().unique(),
  productionOrderId: integer('production_order_id').notNull().references(() => productionOrders.id),
  productId: integer('product_id').notNull().references(() => materials.id),
  warehouseId: integer('warehouse_id').notNull().references(() => warehouses.id),
  quantity: numeric('quantity', { precision: 18, scale: 4, mode: 'number' }).notNull(),
  userId: integer('user_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow()
});



// ============================================================================
// P6 PROJECT COSTING & SCHEDULING
// ============================================================================

export const projectCosts = pgTable('project_costs', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').notNull().references(() => projects.id),
  costCategory: text('cost_category').notNull(), // MATERIAL, LABOR, SUBCONTRACTOR, OVERHEAD
  amount: numeric('amount', { precision: 20, scale: 2, mode: 'number' }).notNull(),
  referenceType: text('reference_type'), // PO, ISSUE, PAYROLL
  referenceId: integer('reference_id'),
  recordedAt: timestamp('recorded_at').defaultNow(),
  notes: text('notes')
});

export const projectSchedules = pgTable('project_schedules', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').notNull().references(() => projects.id),
  phaseName: text('phase_name').notNull(),
  plannedStart: timestamp('planned_start'),
  plannedEnd: timestamp('planned_end'),
  actualStart: timestamp('actual_start'),
  actualEnd: timestamp('actual_end'),
  status: text('status').notNull().default('PENDING')
});


// ============================================================================
// P7 SALES & CRM CORE
// ============================================================================

export const leads = pgTable('leads', {
  id: serial('id').primaryKey(),
  code: text('code'),
  name: text('name').notNull(),
  company: text('company'),
  phone: text('phone'),
  email: text('email'),
  address: text('address'),
  region: text('region'),
  source: text('source'),
  type: text('type'),
  status: text('status').notNull().default('NEW'), // NEW, CONTACTED, QUALIFIED, UNQUALIFIED, CONVERTED, LOST
  potentialLevel: text('potential_level'),
  estimatedValue: doublePrecision('estimated_value').default(0),
  assignedTo: integer('assigned_to').references(() => users.id),
  notes: text('notes'),
  followUpDate: timestamp('follow_up_date'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const opportunities = pgTable('opportunities', {
  id: serial('id').primaryKey(),
  code: text('code').unique(),
  name: text('name').notNull(),
  customerId: integer('customer_id').notNull().references(() => customers.id),
  leadId: integer('lead_id').references(() => leads.id),
  projectId: integer('project_id'),
  projectType: text('project_type'),
  location: text('location'),
  area: doublePrecision('area'),
  budget: doublePrecision('budget'),
  estimatedValue: doublePrecision('estimated_value').default(0),
  probability: integer('probability').default(0), // 0-100%
  status: text('status').notNull().default('NEW'), // NEW, PROPOSAL, NEGOTIATION, WON, LOST
  expectedCloseDate: timestamp('expected_close_date'),
  assignedTo: integer('assigned_to').references(() => users.id),
  source: text('source'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const quotes = pgTable('quotes', {
  id: serial('id').primaryKey(),
  quoteNumber: text('quote_number').notNull().unique(),
  version: integer('version').default(1),
  customerId: integer('customer_id').notNull().references(() => customers.id),
  opportunityId: integer('opportunity_id').references(() => opportunities.id),
  leadId: integer('lead_id').references(() => leads.id),
  projectId: integer('project_id'),
  totalAmount: doublePrecision('total_amount').notNull().default(0),
  costAmount: doublePrecision('cost_amount').default(0),
  margin: doublePrecision('margin').default(0),
  vat: doublePrecision('vat').default(0),
  paymentTerms: text('payment_terms'),
  deliveryTime: text('delivery_time'),
  productionTime: text('production_time'),
  status: text('status').notNull().default('DRAFT'), // DRAFT, SENT, ACCEPTED, REJECTED
  validUntil: timestamp('valid_until'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const quoteItems = pgTable('quote_items', {
  id: serial('id').primaryKey(),
  quoteId: integer('quote_id').notNull().references(() => quotes.id, { onDelete: 'cascade' }),
  description: text('description').notNull(),
  quantity: numeric('quantity', { precision: 18, scale: 4, mode: 'number' }).notNull(),
  unitPrice: numeric('unit_price', { precision: 20, scale: 2, mode: 'number' }).notNull(),
  totalPrice: doublePrecision('total_price').notNull()
});

export const contracts = pgTable('contracts', {
  id: serial('id').primaryKey(),
  contractNumber: text('contract_number').notNull().unique(),
  quoteId: integer('quote_id').references(() => quotes.id),
  customerId: integer('customer_id').notNull().references(() => customers.id),
  projectId: integer('project_id').references(() => projects.id),
  totalAmount: doublePrecision('total_amount').notNull().default(0),
  status: text('status').notNull().default('DRAFT'), // DRAFT, SIGNED, IN_PROGRESS, COMPLETED, CANCELLED
  signDate: timestamp('sign_date'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const salesOrders = pgTable('sales_orders', {
  id: serial('id').primaryKey(),
  orderNumber: text('order_number').notNull().unique(),
  quoteId: integer('quote_id').references(() => quotes.id),
  contractId: integer('contract_id').references(() => contracts.id),
  customerId: integer('customer_id').notNull().references(() => customers.id),
  projectId: integer('project_id').references(() => projects.id),
  totalAmount: doublePrecision('total_amount').notNull().default(0),
  status: text('status').notNull().default('NEW'), // NEW, PROCESSING, DELIVERED, INVOICED, CANCELLED
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});



// ============================================================================
// CRM ACTIVITIES — Lịch sử chăm sóc khách hàng
// ============================================================================

export const crmActivities = pgTable('crm_activities', {
  id: serial('id').primaryKey(),
  type: text('type').notNull(), // CALL, MEETING, SURVEY, QUOTE, EMAIL, NOTE, TASK
  title: text('title').notNull(),
  description: text('description'),
  leadId: integer('lead_id').references(() => leads.id),
  customerId: integer('customer_id').references(() => customers.id),
  contactId: integer('contact_id').references(() => contacts.id),
  opportunityId: integer('opportunity_id').references(() => opportunities.id),
  projectId: integer('project_id'),
  quoteId: integer('quote_id'),
  assignedTo: integer('assigned_to').references(() => users.id),
  dueDate: timestamp('due_date'),
  completedAt: timestamp('completed_at'),
  status: text('status').default('PENDING'), // PENDING, COMPLETED, CANCELLED
  priority: text('priority').default('MEDIUM'), // HIGH, MEDIUM, LOW
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// ============================================================================
// P2 THIẾT KẾ & KỸ THUẬT (ENGINEERING)
// ============================================================================

export const surveys = pgTable('surveys', {
  id: serial('id').primaryKey(),
  // opportunityId links to CRM (nullable — engineering surveys may link to project directly)
  opportunityId: integer('opportunity_id').references(() => opportunities.id, { onDelete: 'cascade' }),
  projectId: integer('project_id').references(() => projects.id, { onDelete: 'cascade' }),
  surveyDate: timestamp('survey_date'),
  status: text('status').notNull().default('PLANNED'), // PLANNED, SCHEDULED, COMPLETED, CANCELLED
  location: text('location'),
  projectType: text('project_type'),
  area: doublePrecision('area'),
  floors: integer('floors'),
  rooms: integer('rooms'),
  style: text('style'),
  budget: doublePrecision('budget'),
  materials: text('materials'),
  colors: text('colors'),
  equipment: text('equipment'),
  deadline: timestamp('deadline'),
  specialRequests: text('special_requests'),
  surveyorId: integer('surveyor_id').references(() => users.id),
  notes: text('notes'),
  documents: jsonb('documents'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const designs = pgTable('designs', {
  id: serial('id').primaryKey(),
  // opportunityId links to CRM flow
  opportunityId: integer('opportunity_id').references(() => opportunities.id),
  projectId: integer('project_id').references(() => projects.id, { onDelete: 'cascade' }),
  version: text('version').notNull(),
  status: text('status').notNull().default('DRAFT'), // DRAFT, INTERNAL_REVIEW, CUSTOMER_REVIEW, REVISION, APPROVED, REJECTED
  style: text('style'),
  designerId: integer('designer_id').references(() => users.id),
  customerApproved: boolean('customer_approved').default(false),
  approvalDate: timestamp('approval_date'),
  notes: text('notes'),
  files: jsonb('files'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const approvals = pgTable('approvals', {
  id: serial('id').primaryKey(),
  designId: integer('design_id').notNull().references(() => designs.id, { onDelete: 'cascade' }),
  customerId: integer('customer_id').references(() => customers.id),
  approvedBy: integer('approved_by').references(() => users.id),
  status: text('status').notNull().default('PENDING'), // PENDING, APPROVED, REJECTED
  comments: text('comments'),
  approvalDate: timestamp('approval_date'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const productionReleases = pgTable('production_releases', {
  id: serial('id').primaryKey(),
  designId: integer('design_id').notNull().references(() => designs.id),
  projectId: integer('project_id').notNull().references(() => projects.id),
  status: text('status').notNull().default('PENDING'), // PENDING, RELEASED
  releasedBy: integer('released_by').references(() => users.id),
  releaseDate: timestamp('release_date'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// ============================================================================
// P5 SHOP FLOOR & JOB CARDS
// ============================================================================

export const jobCards = pgTable('job_cards', {
  id: serial('id').primaryKey(),
  workOrderId: integer('work_order_id').notNull().references(() => workOrders.id, { onDelete: 'cascade' }),
  employeeId: integer('employee_id').notNull().references(() => users.id),
  startTime: timestamp('start_time').notNull(),
  endTime: timestamp('end_time'),
  durationMinutes: numeric('duration_minutes', { precision: 18, scale: 4, mode: 'number' }),
  completedQuantity: numeric('completed_quantity', { precision: 18, scale: 4, mode: 'number' }).notNull().default(0),
  rejectedQuantity: numeric('rejected_quantity', { precision: 18, scale: 4, mode: 'number' }).notNull().default(0),
  status: text('status').notNull().default('IN_PROGRESS'), // IN_PROGRESS, PAUSED, COMPLETED, CANCELLED
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow()
});

export const scrapLogs = pgTable('scrap_logs', {
  id: serial('id').primaryKey(),
  workOrderId: integer('work_order_id').notNull().references(() => workOrders.id),
  productionOrderId: integer('production_order_id').references(() => productionOrders.id),
  materialId: integer('material_id').notNull().references(() => materials.id), // If raw material
  productId: integer('product_id').references(() => materials.id), // If finished good scrap
  quantity: numeric('quantity', { precision: 18, scale: 4, mode: 'number' }).notNull(),
  reason: text('reason').notNull(), // Phế liệu, Hỏng, Lỗi CNC, Sai kích thước, Lệch vân, v.v.
  employeeId: integer('employee_id').references(() => users.id),
  userId: integer('user_id').references(() => users.id),
  photoUrl: text('photo_url'),
  createdAt: timestamp('created_at').defaultNow()
});


export const productionCostings = pgTable('production_costings', {
  id: serial('id').primaryKey(),
  productionOrderId: integer('production_order_id').notNull().references(() => productionOrders.id, { onDelete: 'cascade' }),
  materialCostStandard: numeric('material_cost_standard', { precision: 20, scale: 2, mode: 'number' }).notNull().default(0),
  materialCostActual: numeric('material_cost_actual', { precision: 20, scale: 2, mode: 'number' }).notNull().default(0),
  laborCostStandard: numeric('labor_cost_standard', { precision: 20, scale: 2, mode: 'number' }).notNull().default(0),
  laborCostActual: numeric('labor_cost_actual', { precision: 20, scale: 2, mode: 'number' }).notNull().default(0),
  machineCostStandard: numeric('machine_cost_standard', { precision: 20, scale: 2, mode: 'number' }).notNull().default(0),
  machineCostActual: numeric('machine_cost_actual', { precision: 20, scale: 2, mode: 'number' }).notNull().default(0),
  overheadCostStandard: numeric('overhead_cost_standard', { precision: 20, scale: 2, mode: 'number' }).notNull().default(0),
  overheadCostActual: numeric('overhead_cost_actual', { precision: 20, scale: 2, mode: 'number' }).notNull().default(0),
  totalCostStandard: numeric('total_cost_standard', { precision: 20, scale: 2, mode: 'number' }).notNull().default(0),
  totalCostActual: numeric('total_cost_actual', { precision: 20, scale: 2, mode: 'number' }).notNull().default(0),
  calculatedAt: timestamp('calculated_at').defaultNow()
});



export const materialConversions = pgTable('material_conversions', {
  id: serial('id').primaryKey(),
  materialId: integer('material_id').notNull().references(() => materials.id, { onDelete: 'cascade' }),
  fromUnit: text('from_unit').notNull(),
  toUnit: text('to_unit').notNull(),
  conversionFactor: numeric('conversion_factor', { precision: 18, scale: 4, mode: 'number' }).notNull(),
});

// ============================================================================
// P8 QUALITY CONTROL & ACCEPTANCE
// ============================================================================

export const inspections = pgTable('inspections', {
  id: serial('id').primaryKey(),
  referenceType: text('reference_type').notNull(), // PROD_ORDER, RECEIPT, PROJECT_PHASE
  referenceId: integer('reference_id').notNull(),
  inspectorId: integer('inspector_id').notNull().references(() => users.id),
  status: text('status').notNull().default('PENDING'), // PENDING, PASSED, FAILED, CONDITIONAL_PASS
  notes: text('notes'),
  inspectionDate: timestamp('inspection_date').defaultNow()
});

export const handovers = pgTable('handovers', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').notNull().references(() => projects.id),
  customerId: integer('customer_id').notNull().references(() => customers.id),
  handoverDate: timestamp('handover_date').notNull(),
  status: text('status').notNull().default('DRAFT'), // DRAFT, SIGNED, REJECTED
  signedByCustomer: boolean('signed_by_customer').default(false),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow()
});


// ============================================================================
// P9 ADVANCED MRP & LOGISTICS
// ============================================================================

export const deliveryNotes = pgTable('delivery_notes', {
  id: serial('id').primaryKey(),
  deliveryNumber: text('delivery_number').notNull().unique(),
  salesOrderId: integer('sales_order_id').references(() => salesOrders.id),
  projectId: integer('project_id').references(() => projects.id),
  driverId: integer('driver_id').references(() => users.id),
  vehicleDetails: text('vehicle_details'),
  deliveryDate: timestamp('delivery_date'),
  status: text('status').notNull().default('PENDING'), // PENDING, IN_TRANSIT, DELIVERED, RETURNED
  createdAt: timestamp('created_at').defaultNow()
});

export const deliveryNoteItems = pgTable('delivery_note_items', {
  id: serial('id').primaryKey(),
  deliveryNoteId: integer('delivery_note_id').notNull().references(() => deliveryNotes.id, { onDelete: 'cascade' }),
  materialId: integer('material_id').references(() => materials.id), // If delivering specific products
  description: text('description').notNull(),
  quantity: numeric('quantity', { precision: 18, scale: 4, mode: 'number' }).notNull()
});

// ============================================================================
// PHASE 8: INSTALLATION & HANDOVER (Lắp đặt & Bàn giao)
// ============================================================================

export const installations = pgTable('installations', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  projectId: integer('project_id').notNull().references(() => projects.id),
  deliveryNoteId: integer('delivery_note_id').references(() => deliveryNotes.id),
  teamLeaderId: integer('team_leader_id').references(() => users.id),
  plannedStartDate: timestamp('planned_start_date'),
  plannedEndDate: timestamp('planned_end_date'),
  actualStartDate: timestamp('actual_start_date'),
  actualEndDate: timestamp('actual_end_date'),
  status: text('status').notNull().default('PLANNED'), // PLANNED, IN_PROGRESS, COMPLETED, DELAYED, CANCELLED
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const installationChecklists = pgTable('installation_checklists', {
  id: serial('id').primaryKey(),
  installationId: integer('installation_id').notNull().references(() => installations.id, { onDelete: 'cascade' }),
  itemTask: text('item_task').notNull(), // VD: "Kiểm tra bản lề", "Vệ sinh mặt kính"
  isCompleted: boolean('is_completed').default(false),
  checkedBy: integer('checked_by').references(() => users.id),
  checkedAt: timestamp('checked_at'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow()
});

export const kcsRecords = pgTable('kcs_records', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  projectId: integer('project_id').notNull().references(() => projects.id),
  installationId: integer('installation_id').references(() => installations.id),
  inspectorId: integer('inspector_id').references(() => users.id),
  inspectionDate: timestamp('inspection_date').defaultNow(),
  status: text('status').notNull().default('PENDING'), // PENDING, PASS, FAIL, CONDITIONAL_PASS
  customerRepresentative: text('customer_representative'),
  customerSignatureUrl: text('customer_signature_url'),
  remarks: text('remarks'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// ============================================================================
// PHASE 9: FINANCE & ACCOUNTING (Tài chính & Kế toán)
// ============================================================================

export const paymentVouchers = pgTable('payment_vouchers', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  type: text('type').notNull(), // RECEIPT (Thu), PAYMENT (Chi)
  amount: numeric('amount', { precision: 18, scale: 4, mode: 'number' }).notNull(),
  currency: text('currency').notNull().default('VND'),
  date: timestamp('date').notNull().defaultNow(),
  referenceId: integer('reference_id'), // Could be PO, SO, Project, etc.
  referenceType: text('reference_type'), // 'PO', 'SO', 'PROJECT', 'OTHER'
  payerPayeeName: text('payer_payee_name').notNull(),
  description: text('description'),
  status: text('status').notNull().default('COMPLETED'), // DRAFT, PENDING, COMPLETED, CANCELLED
  createdBy: integer('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const debts = pgTable('debts', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  type: text('type').notNull(), // RECEIVABLE (Phải thu), PAYABLE (Phải trả)
  partnerId: integer('partner_id'), // customer_id or supplier_id
  partnerType: text('partner_type').notNull(), // 'CUSTOMER', 'SUPPLIER', 'OTHER'
  totalAmount: numeric('total_amount', { precision: 18, scale: 4, mode: 'number' }).notNull(),
  paidAmount: numeric('paid_amount', { precision: 18, scale: 4, mode: 'number' }).notNull().default(0),
  remainingAmount: numeric('remaining_amount', { precision: 18, scale: 4, mode: 'number' }).notNull(),
  dueDate: timestamp('due_date'),
  status: text('status').notNull().default('UNPAID'), // UNPAID, PARTIAL, PAID, OVERDUE
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// ============================================================================
// EVENT / JOB ARCHITECTURE
// ============================================================================

export const domainEvents = pgTable('domain_events', {
  id: serial('id').primaryKey(),
  eventName: text('event_name').notNull(),
  payload: jsonb('payload').notNull(),
  status: text('status').notNull().default('PENDING'), // PENDING, PROCESSING, COMPLETED, FAILED
  retryCount: integer('retry_count').notNull().default(0),
  errorLog: text('error_log'),
  createdAt: timestamp('created_at').defaultNow(),
  processedAt: timestamp('processed_at')
});

// ============================================================================
// QR TRACKING MODULE
// ============================================================================
export const qrCodes = pgTable('qr_codes', {
  id: serial('id').primaryKey(),
  entityType: text('entity_type').notNull(), // PROJECT, BOQ_ITEM, PRODUCT, BOM, MATERIAL, INVENTORY_LOT, PRODUCTION_ORDER, WORK_ORDER, JOB_CARD, FINISHED_GOODS, QC_ISSUE, ASSET
  entityId: integer('entity_id').notNull(),
  qrValue: text('qr_value').notNull().unique(),
  status: text('status').notNull().default('ACTIVE'), // GENERATED, ACTIVE, DEACTIVATED
  createdBy: integer('created_by'),
  createdAt: timestamp('created_at').defaultNow(),
  metadata: jsonb('metadata')
});

// ============================================================================
// BUDGET MODULE
// ============================================================================
export const budgets = pgTable('budgets', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  version: integer('version').notNull().default(1),
  status: text('status').notNull().default('DRAFT'), // DRAFT, SUBMITTED, APPROVED, LOCKED, REVISED
  totalBudget: numeric('total_budget', { precision: 20, scale: 2, mode: 'number' }).notNull().default(0),
  committedCost: numeric('committed_cost', { precision: 20, scale: 2, mode: 'number' }).notNull().default(0),
  actualCost: numeric('actual_cost', { precision: 20, scale: 2, mode: 'number' }).notNull().default(0),
  variance: numeric('variance', { precision: 20, scale: 2, mode: 'number' }).notNull().default(0),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  approvedBy: integer('approved_by'),
  approvedAt: timestamp('approved_at')
});

export const budgetLines = pgTable('budget_lines', {
  id: serial('id').primaryKey(),
  budgetId: integer('budget_id').notNull().references(() => budgets.id, { onDelete: 'cascade' }),
  category: text('category').notNull(), // MATERIAL, LABOR, MACHINE, PROCUREMENT, LOGISTICS, QC_REWORK, OVERHEAD, OTHER
  budgetedAmount: numeric('budgeted_amount', { precision: 20, scale: 2, mode: 'number' }).notNull().default(0),
  committedAmount: numeric('committed_amount', { precision: 20, scale: 2, mode: 'number' }).notNull().default(0),
  actualAmount: numeric('actual_amount', { precision: 20, scale: 2, mode: 'number' }).notNull().default(0),
  variance: numeric('variance', { precision: 20, scale: 2, mode: 'number' }).notNull().default(0),
  notes: text('notes')
});

export const budgetTransactions = pgTable('budget_transactions', {
  id: serial('id').primaryKey(),
  budgetId: integer('budget_id').notNull().references(() => budgets.id, { onDelete: 'cascade' }),
  budgetLineId: integer('budget_line_id').references(() => budgetLines.id),
  type: text('type').notNull(), // COMMITTED, ACTUAL
  category: text('category').notNull(),
  amount: numeric('amount', { precision: 20, scale: 2, mode: 'number' }).notNull(),
  referenceType: text('reference_type'), // PO, PR, WORK_ORDER, INVENTORY_ISSUE, QC_REWORK
  referenceId: integer('reference_id'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow()
});

// ============================================================================
// INVENTORY COUNTS (STOCKTAKE)
// ============================================================================
export const inventoryCounts = pgTable('inventory_counts', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  warehouseId: integer('warehouse_id').notNull().references(() => warehouses.id),
  status: text('status').notNull().default('DRAFT'), // DRAFT, COMPLETED, CANCELLED
  assignedTo: integer('assigned_to').references(() => users.id),
  scheduledDate: timestamp('scheduled_date'),
  completedDate: timestamp('completed_date'),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

export const inventoryCountItems = pgTable('inventory_count_items', {
  id: serial('id').primaryKey(),
  countId: integer('count_id').notNull().references(() => inventoryCounts.id, { onDelete: 'cascade' }),
  materialId: integer('material_id').notNull().references(() => materials.id),
  locationId: text('location_id'),
  systemQuantity: numeric('system_quantity').notNull().default('0'),
  countedQuantity: numeric('counted_quantity'),
  variance: numeric('variance'),
  status: text('status').notNull().default('PENDING'), // PENDING, MATCHED, VARIED, ADJUSTED
  notes: text('notes')
});

// ============================================================================
// INVENTORY RESERVATIONS
// ============================================================================
export const inventoryReservations = pgTable('inventory_reservations', {
  id: serial('id').primaryKey(),
  materialId: integer('material_id').notNull().references(() => materials.id),
  warehouseId: integer('warehouse_id').notNull().references(() => warehouses.id),
  quantity: numeric('quantity', { precision: 18, scale: 4, mode: 'number' }).notNull(),
  status: text('status').notNull().default('ACTIVE'), // ACTIVE, ISSUED, CANCELLED
  referenceType: text('reference_type').notNull(), // PROJECT, PRODUCTION
  referenceId: text('reference_id').notNull(), // e.g., "PRJ-101", "PO-202"
  reservedAt: timestamp('reserved_at').notNull().defaultNow(),
  expiresAt: timestamp('expires_at'),
  notes: text('notes')
});

// ============================================================
// SOURCE DATA CENTER — LAYER 1
// Kiến trúc 4 tầng: SOURCE → STAGING → MASTER → TRANSACTION
// ============================================================

// TABLE 1: source_documents — registry bất biến của mọi file nguồn
export const sourceDocuments = pgTable('source_documents', {
  id:                      serial('id').primaryKey(),
  sourceId:                text('source_id').notNull().unique(),
  sourceName:              text('source_name').notNull(),
  sourceType:              text('source_type').notNull(), // XLSX, PDF, JPG, PNG, SKP, ZIP, MANUAL
  fileName:                text('file_name').notNull(),
  originalPath:            text('original_path'),
  storagePath:             text('storage_path'),
  fileSize:                integer('file_size'),
  checksum:                text('checksum'),
  mimeType:                text('mime_type'),
  version:                 integer('version').notNull().default(1),
  parentSourceId:          integer('parent_source_id'), // FK self-ref for versioning
  uploadedBy:              integer('uploaded_by').references(() => users.id),
  uploadedAt:              timestamp('uploaded_at').notNull().defaultNow(),
  projectId:               integer('project_id').references(() => projects.id),
  documentCategory:        text('document_category').notNull(),
  // BOQ_EXCEL|BOQ_PDF|DESIGN_PDF|DESIGN_SKETCHUP|SURVEY_IMAGE|MATERIAL_IMAGE
  // PROCUREMENT_DOCUMENT|PRODUCTION_EVIDENCE|QC_EVIDENCE|DELIVERY_DOCUMENT
  // INSTALLATION_DOCUMENT|FINANCIAL_DOCUMENT|CONTRACT|MANUAL_ENTRY|OTHER
  sourceStatus:            text('source_status').notNull().default('RAW'),
  // RAW|INGESTING|PARSED|CLASSIFIED|NORMALIZED|STAGED|MATCHED|APPROVED|REJECTED|ARCHIVED
  autoRoutedTo:            text('auto_routed_to'),
  classificationConfidence: numeric('classification_confidence', { precision: 5, scale: 4 }),
  extractedAt:             timestamp('extracted_at'),
  stagedAt:                timestamp('staged_at'),
  approvedAt:              timestamp('approved_at'),
  approvedBy:              integer('approved_by').references(() => users.id),
  rejectionReason:         text('rejection_reason'),
  notes:                   text('notes'),
  tags:                    text('tags').array(),
  metadata:                jsonb('metadata'),
  createdAt:               timestamp('created_at').notNull().defaultNow(),
  updatedAt:               timestamp('updated_at').notNull().defaultNow(),
});

// TABLE 2: source_document_lines — dòng dữ liệu phân tích từ source doc
export const sourceDocumentLines = pgTable('source_document_lines', {
  id:                serial('id').primaryKey(),
  lineId:            text('line_id').notNull().unique(),
  sourceDocId:       integer('source_doc_id').notNull().references(() => sourceDocuments.id, { onDelete: 'cascade' }),
  lineNumber:        integer('line_number').notNull(),
  rawValue:          text('raw_value'),
  parsedValue:       text('parsed_value'),
  normalizedValue:   text('normalized_value'),
  fieldType:         text('field_type'), // MATERIAL|QUANTITY|PRICE|SUPPLIER|DATE|CUSTOMER|PROJECT
  confidence:        text('confidence').notNull().default('LOW'), // HIGH|MEDIUM|LOW|NONE
  needsReview:       boolean('needs_review').notNull().default(false),
  reviewNote:        text('review_note'),
  linkedMaterialId:  integer('linked_material_id').references(() => materials.id),
  linkedSupplierId:  integer('linked_supplier_id').references(() => suppliers.id),
  linkedBoqItemId:   integer('linked_boq_item_id').references(() => boqItems.id),
  stagedRecordType:  text('staged_record_type'),
  stagedRecordId:    text('staged_record_id'),
  erpRecordType:     text('erp_record_type'),
  erpRecordId:       text('erp_record_id'),
  metadata:          jsonb('metadata'),
  createdAt:         timestamp('created_at').notNull().defaultNow(),
});

// TABLE 3: source_versions — lịch sử phiên bản khi source thay đổi
export const sourceVersions = pgTable('source_versions', {
  id:            serial('id').primaryKey(),
  sourceDocId:   integer('source_doc_id').notNull().references(() => sourceDocuments.id),
  version:       integer('version').notNull(),
  changeType:    text('change_type').notNull(), // INITIAL|UPDATED|CORRECTED|REPLACED
  changedBy:     integer('changed_by').references(() => users.id),
  changedAt:     timestamp('changed_at').notNull().defaultNow(),
  changeSummary: text('change_summary'),
  diffData:      jsonb('diff_data'), // { added: [], removed: [], changed: [], conflicts: [] }
  snapshotPath:  text('snapshot_path'),
});

// TABLE 4: staging_records — vùng kiểm duyệt trước khi vào ERP
export const stagingRecords = pgTable('staging_records', {
  id:               serial('id').primaryKey(),
  stagingId:        text('staging_id').notNull().unique(),
  sourceDocId:      integer('source_doc_id').notNull().references(() => sourceDocuments.id),
  sourceLineId:     integer('source_line_id').references(() => sourceDocumentLines.id),
  targetModule:     text('target_module').notNull(),
  // CRM|PROJECT|BOQ|PROCUREMENT|INVENTORY|PRODUCTION|QC|DELIVERY|INSTALLATION|FINANCE
  targetEntityType: text('target_entity_type').notNull(),
  // CUSTOMER|SUPPLIER|MATERIAL|BOQ_ITEM|PURCHASE_REQUEST|PURCHASE_ORDER|GRN|etc.
  stagingStatus:    text('staging_status').notNull().default('PENDING'),
  // PENDING|REVIEW|APPROVED|REJECTED|POSTED|CONFLICT|DUPLICATE
  rawData:          jsonb('raw_data').notNull().default('{}'),
  normalizedData:   jsonb('normalized_data'),
  finalData:        jsonb('final_data'),
  validationErrors: jsonb('validation_errors'),
  matchResult:      jsonb('match_result'),
  confidence:       text('confidence').notNull().default('LOW'),
  reviewedBy:       integer('reviewed_by').references(() => users.id),
  reviewedAt:       timestamp('reviewed_at'),
  reviewNote:       text('review_note'),
  postedBy:         integer('posted_by').references(() => users.id),
  postedAt:         timestamp('posted_at'),
  erpRecordType:    text('erp_record_type'),
  erpRecordId:      text('erp_record_id'),
  createdAt:        timestamp('created_at').notNull().defaultNow(),
  updatedAt:        timestamp('updated_at').notNull().defaultNow(),
});

// TABLE 5: data_lineage — truy ngược ERP record về file nguồn gốc
export const dataLineage = pgTable('data_lineage', {
  id:            serial('id').primaryKey(),
  lineageId:     text('lineage_id').notNull().unique(),
  erpRecordType: text('erp_record_type').notNull(),
  erpRecordId:   text('erp_record_id').notNull(),
  stagingId:     text('staging_id'),
  sourceDocId:   integer('source_doc_id').references(() => sourceDocuments.id),
  sourceLineId:  integer('source_line_id').references(() => sourceDocumentLines.id),
  sourceFile:    text('source_file'),
  lineageChain:  jsonb('lineage_chain'), // [{type:'SOURCE',id,...},{type:'STAGING',...},{type:'ERP',...}]
  createdAt:     timestamp('created_at').notNull().defaultNow(),
});

// TABLE 6: source_audit_log — log bất biến mọi thao tác trên source
export const sourceAuditLog = pgTable('source_audit_log', {
  id:          serial('id').primaryKey(),
  action:      text('action').notNull(),
  // UPLOAD|PARSE|CLASSIFY|STAGE|APPROVE|REJECT|POST|VERSION|UPDATE|DELETE
  userId:      integer('user_id').references(() => users.id),
  sourceDocId: integer('source_doc_id').references(() => sourceDocuments.id),
  stagingId:   text('staging_id'),
  erpRecordId: text('erp_record_id'),
  module:      text('module'),
  beforeData:  jsonb('before_data'),
  afterData:   jsonb('after_data'),
  ipAddress:   text('ip_address'),
  userAgent:   text('user_agent'),
  createdAt:   timestamp('created_at').notNull().defaultNow(),
});

// ============================================================
// TYPE EXPORTS — Source Data Center
// ============================================================
export type SourceDocumentRow    = typeof sourceDocuments.$inferSelect;
export type NewSourceDocumentRow = typeof sourceDocuments.$inferInsert;
export type SourceDocumentLineRow    = typeof sourceDocumentLines.$inferSelect;
export type NewSourceDocumentLineRow = typeof sourceDocumentLines.$inferInsert;
export type SourceVersionRow    = typeof sourceVersions.$inferSelect;
export type NewSourceVersionRow = typeof sourceVersions.$inferInsert;
export type StagingRecordRow    = typeof stagingRecords.$inferSelect;
export type NewStagingRecordRow = typeof stagingRecords.$inferInsert;
export type DataLineageRow    = typeof dataLineage.$inferSelect;
export type NewDataLineageRow = typeof dataLineage.$inferInsert;
export type SourceAuditLogRow    = typeof sourceAuditLog.$inferSelect;
export type NewSourceAuditLogRow = typeof sourceAuditLog.$inferInsert;

// ============================================================
// BUSINESS DECISIONS — Per-project approval gate
// ============================================================
export const businessDecisions = pgTable('business_decisions', {
  id:               serial('id').primaryKey(),
  decisionId:       text('decision_id').notNull().unique(), // 'BD-01', 'BD-02'...
  projectId:        integer('project_id').notNull().references(() => projects.id),
  title:            text('title').notNull(),
  category:         text('category').notNull(), // SCOPE|MATERIAL|DRAWING|STRUCTURAL|PROCUREMENT|PRODUCTION
  sourceDocument:   text('source_document'),
  evidence:         text('evidence'),
  currentValue:     text('current_value'),
  proposedValue:    text('proposed_value'),
  riskLevel:        text('risk_level').notNull().default('MEDIUM'), // HIGH|MEDIUM|LOW
  status:           text('status').notNull().default('PENDING'), // PENDING|APPROVED|REJECTED|SUPERSEDED|BLOCKED
  impactDescription: text('impact_description'),
  blockedModules:   text('blocked_modules').array(), // ['PRODUCTION','PROCUREMENT']
  reviewedBy:       integer('reviewed_by').references(() => users.id),
  reviewedAt:       timestamp('reviewed_at'),
  rejectionReason:  text('rejection_reason'),
  resolutionNote:   text('resolution_note'),
  auditTrail:       jsonb('audit_trail').default('[]'),
  createdAt:        timestamp('created_at').notNull().defaultNow(),
  updatedAt:        timestamp('updated_at').notNull().defaultNow(),
});

export type BusinessDecisionRow    = typeof businessDecisions.$inferSelect;
export type NewBusinessDecisionRow = typeof businessDecisions.$inferInsert;


// ============================================================
// HQ-PWR — PERSONAL WORK & REPORTING SYSTEM
// Module quản lý công việc cá nhân của Manager
// Prefix: pwr_ — tránh conflict với tasks, work_logs hiện tại
// ============================================================

export type PwrStatus      = 'INBOX' | 'TODO' | 'IN_PROGRESS' | 'WAITING' | 'DEFERRED' | 'DONE' | 'CANCELLED';
export type PwrCategory    = 'PRODUCTION' | 'MATERIAL' | 'EQUIPMENT' | 'PERSONNEL' | 'ORDER' | 'PROJECT' | 'ADMIN' | 'INCIDENT' | 'OTHER';
export type PwrPriority    = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type PwrLogType     = 'PROGRESS_UPDATE' | 'ISSUE_LOG' | 'RESOLUTION_LOG' | 'HANDOFF_LOG' | 'COMPLETION_LOG' | 'NOTE' | 'SYSTEM';
export type PwrAuditAction = 'CREATED' | 'STATUS_CHANGED' | 'FIELD_UPDATED' | 'DELETED' | 'RESTORED' | 'REOPENED';

export const pwrTasks = pgTable('pwr_tasks', {
  id:            serial('id').primaryKey(),
  userId:        integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title:         text('title').notNull(),
  description:   text('description'),
  category:      text('category').notNull().default('OTHER'),
  projectRef:    text('project_ref'),
  tags:          text('tags').array(),
  priority:      text('priority').notNull().default('MEDIUM'),
  status:        text('status').notNull().default('INBOX'),
  startDate:     text('start_date'),
  dueDate:       text('due_date'),
  deferredTo:    text('deferred_to'),
  completedAt:   timestamp('completed_at'),
  stationTeam:   text('station_team'),             // 'CNC' | 'DAN_CANH' | 'KHOAN_CAM' | null
  completedBy:   integer('completed_by').references(() => users.id),
  quantityDone:  integer('quantity_done').default(0),
  sourceRef:     text('source_ref'),
  qcStatus:      text('qc_status'),
  waitingQcSince:timestamp('waiting_qc_since'),
  reworkCount:   integer('rework_count').notNull().default(0),
  deletedAt:     timestamp('deleted_at'),
  waitingFor:    text('waiting_for'),
  assignedTo:    text('assigned_to'),
  relatedPerson: text('related_person'),
  result:        text('result'),
  cancelReason:  text('cancel_reason'),
  source:            text('source').default('SELF'),
  startTime:         text('start_time'),
  endTime:           text('end_time'),
  estimatedMinutes:  integer('estimated_minutes'),
  actualMinutes:     integer('actual_minutes'),
  sourceType:        text('source_type').default('MANUAL'),    // MANUAL | FROM_CHECKLIST
  taskType:          text('task_type').default('PROJECT_TASK'), // PROJECT_TASK | OPERATIONAL_TASK | GATE_CHECK
  projectId:         integer('project_id'),  // FK to pwr_projects.id (enforced at DB level)
  createdAt:         timestamp('created_at').defaultNow(),
  updatedAt:         timestamp('updated_at').defaultNow(),
});

export const pwrQcLogs = pgTable('pwr_qc_logs', {
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

export type PwrTask    = typeof pwrTasks.$inferSelect;
export type NewPwrTask = typeof pwrTasks.$inferInsert;

export const pwrWorkLogs = pgTable('pwr_work_logs', {
  id:              serial('id').primaryKey(),
  taskId:          integer('task_id').notNull().references(() => pwrTasks.id, { onDelete: 'cascade' }),
  userId:          integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  logType:         text('log_type').notNull().default('NOTE'),
  content:         text('content').notNull(),
  result:          text('result'),
  issue:           text('issue'),
  nextAction:      text('next_action'),
  waitingFor:      text('waiting_for'),
  durationMinutes: integer('duration_minutes'),
  statusFrom:      text('status_from'),
  statusTo:        text('status_to'),
  isSystemLog:     boolean('is_system_log').notNull().default(false),
  editedAt:        timestamp('edited_at'),
  createdAt:       timestamp('created_at').defaultNow(),
});

export type PwrWorkLog    = typeof pwrWorkLogs.$inferSelect;
export type NewPwrWorkLog = typeof pwrWorkLogs.$inferInsert;

export const pwrTaskAuditLog = pgTable('pwr_task_audit_log', {
  id:        serial('id').primaryKey(),
  taskId:    integer('task_id').notNull().references(() => pwrTasks.id, { onDelete: 'no action' }),
  userId:    integer('user_id').notNull().references(() => users.id,    { onDelete: 'no action' }),
  action:    text('action').notNull(),
  fieldName: text('field_name'),
  oldValue:  text('old_value'),
  newValue:  text('new_value'),
  reason:    text('reason'),
  createdAt: timestamp('created_at').defaultNow(),
});

export type PwrTaskAuditLog    = typeof pwrTaskAuditLog.$inferSelect;
export type NewPwrTaskAuditLog = typeof pwrTaskAuditLog.$inferInsert;

export const pwrContacts = pgTable('pwr_contacts', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const pwrProjects = pgTable('pwr_projects', {
  id:        serial('id').primaryKey(),
  userId:    integer('user_id').notNull(),
  name:      text('name').notNull(),
  customer:  text('customer'),
  deadline:  text('deadline'),
  status:    text('status').default('ACTIVE'),   // ACTIVE | COMPLETED | ON_HOLD | CANCELLED
  notes:     text('notes'),
  color:     text('color').default('BLUE'),
  createdAt: timestamp('created_at').defaultNow(),
});
export type PwrProject = typeof pwrProjects.$inferSelect;

// PWR V2 — Checklist
export const pwrChecklists = pgTable('pwr_checklists', {
  id:        serial('id').primaryKey(),
  taskId:    integer('task_id').notNull().references(() => pwrTasks.id, { onDelete: 'cascade' }),
  content:   text('content').notNull(),
  isDone:    boolean('is_done').notNull().default(false),
  position:  integer('position').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow(),
});
export type PwrChecklist    = typeof pwrChecklists.$inferSelect;
export type NewPwrChecklist = typeof pwrChecklists.$inferInsert;

// PWR V2 — Task Dependencies
// depType: BLOCKED_BY | RESOURCE_LOCK | GATE | TRIGGER | PRECONDITION
// time_window_days: if depType=GATE, blockerTask must be DONE within last N days
export const pwrTaskDependencies = pgTable('pwr_task_dependencies', {
  id:             serial('id').primaryKey(),
  taskId:         integer('task_id').notNull().references(() => pwrTasks.id, { onDelete: 'cascade' }),
  dependsOnId:    integer('depends_on_id').notNull().references(() => pwrTasks.id, { onDelete: 'cascade' }),
  depType:        text('dep_type').notNull().default('BLOCKED_BY'),
  timeWindowDays: integer('time_window_days'),
  createdAt:      timestamp('created_at').defaultNow(),
});
export type PwrTaskDependency = typeof pwrTaskDependencies.$inferSelect;

// ─── PWR V3 — Vận Hành ↔ Dự Án Data Model ────────────────────────────────────

// Recurring rules engine: generates operational tasks automatically
// recurrence_type: DAILY | WEEKLY | MONTHLY | CUSTOM
// recurrence_days_of_week: JSONB array e.g. [1,5] = Mon+Fri
export const pwrRecurringRules = pgTable('pwr_recurring_rules', {
  id:                    serial('id').primaryKey(),
  userId:                integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title:                 text('title').notNull(),
  description:           text('description'),
  category:              text('category').notNull().default('OTHER'),
  priority:              text('priority').notNull().default('MEDIUM'),
  taskType:              text('task_type').notNull().default('OPERATIONAL_TASK'),
  projectId:             integer('project_id').references(() => pwrProjects.id, { onDelete: 'set null' }),
  recurrenceType:        text('recurrence_type').notNull().default('WEEKLY'),
  recurrenceInterval:    integer('recurrence_interval').notNull().default(1),
  recurrenceDaysOfWeek:  text('recurrence_days_of_week'),  // JSON string: "[1,5]"
  recurrenceDayOfMonth:  integer('recurrence_day_of_month'),
  advanceDays:           integer('advance_days').notNull().default(1),
  timeWindowDays:        integer('time_window_days'),    // gate validity window
  isGate:                boolean('is_gate').notNull().default(false),
  isActive:              boolean('is_active').notNull().default(true),
  lastGeneratedDate:     text('last_generated_date'),
  nextOccurrenceDate:    text('next_occurrence_date'),
  createdAt:             timestamp('created_at').defaultNow(),
  updatedAt:             timestamp('updated_at').defaultNow(),
});
export type PwrRecurringRule    = typeof pwrRecurringRules.$inferSelect;
export type NewPwrRecurringRule = typeof pwrRecurringRules.$inferInsert;

// Resources: machines, workers, spaces that tasks can be assigned to
// resource_type: MACHINE | PERSON | SPACE | TOOL
export const pwrResources = pgTable('pwr_resources', {
  id:                  serial('id').primaryKey(),
  userId:              integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name:                text('name').notNull(),
  resourceType:        text('resource_type').notNull().default('MACHINE'),
  capacityHoursPerDay: text('capacity_hours_per_day').default('8.0'),
  notes:               text('notes'),
  isActive:            boolean('is_active').notNull().default(true),
  createdAt:           timestamp('created_at').defaultNow(),
});
export type PwrResource    = typeof pwrResources.$inferSelect;
export type NewPwrResource = typeof pwrResources.$inferInsert;

// Junction: task → resource assignment for conflict detection
export const pwrTaskResources = pgTable('pwr_task_resources', {
  id:             serial('id').primaryKey(),
  taskId:         integer('task_id').notNull().references(() => pwrTasks.id, { onDelete: 'cascade' }),
  resourceId:     integer('resource_id').notNull().references(() => pwrResources.id, { onDelete: 'cascade' }),
  estimatedHours: text('estimated_hours'),
  reservedDate:   text('reserved_date'),
  createdAt:      timestamp('created_at').defaultNow(),
});
export type PwrTaskResource    = typeof pwrTaskResources.$inferSelect;
export type NewPwrTaskResource = typeof pwrTaskResources.$inferInsert;



// ============================================================
// PWR V4 — MATERIAL & SUPPLIER CATALOG (2-TIER ARCHITECTURE)
// ============================================================

// TẦNG 1: KHO BÁCH KHOA TOÀN THƯ (Supplier Catalogs - Read Only Reference)
export const pwrSupplierCatalogs = pgTable('pwr_supplier_catalogs', {
  id:                 serial('id').primaryKey(),
  supplierName:       text('supplier_name').notNull(), // An Cường, Ba Thanh...
  skuCode:            text('sku_code').notNull(),      // MDF-AC-388
  name:               text('name').notNull(),          // Ván MDF 17mm Phủ Melamine 388
  category:           text('category').default('VÁN'), // VÁN, NẸP, PHỤ KIỆN
  unit:               text('unit').default('TẤM'),     // TẤM, MÉT, CÁI
  price:              integer('price').default(0),
  specs:              text('specs'),                   // 1220x2440x17
  isDiscontinued:     boolean('is_discontinued').notNull().default(false), // Flag cho upsert năm sau
  createdAt:          timestamp('created_at').defaultNow(),
  updatedAt:          timestamp('updated_at').defaultNow(),
});
export type PwrSupplierCatalog    = typeof pwrSupplierCatalogs.$inferSelect;
export type NewPwrSupplierCatalog = typeof pwrSupplierCatalogs.$inferInsert;

// TẦNG 2: KHO SINH TỒN (Active Inventory for the Workshop)
export const pwrMaterials = pgTable('pwr_materials', {
  id:                 serial('id').primaryKey(),
  catalogRefId:       integer('catalog_ref_id').references(() => pwrSupplierCatalogs.id, { onDelete: 'set null' }), // Link to Tầng 1
  skuCode:            text('sku_code').notNull().unique(), // Unique trong xưởng
  name:               text('name').notNull(),
  category:           text('category').default('VÁN'),
  unit:               text('unit').default('TẤM'),
  stockLevel:         integer('stock_level').notNull().default(0),    // Số lượng thực tế
  reservedLevel:      integer('reserved_level').notNull().default(0), // Số lượng đang bị "giữ chỗ" bởi các Task chưa Done
  minStockLevel:      integer('min_stock_level').default(0),          // Điểm re-order (Báo động hết hàng)
  isActive:           boolean('is_active').notNull().default(true),
  createdAt:          timestamp('created_at').defaultNow(),
  updatedAt:          timestamp('updated_at').defaultNow(),
});
export type PwrMaterial    = typeof pwrMaterials.$inferSelect;
export type NewPwrMaterial = typeof pwrMaterials.$inferInsert;

// BẢNG LOG GIAO DỊCH VẬT TƯ (Bắt buộc cho Vòng lặp chống thất thoát)
export const pwrMaterialTransactions = pgTable('pwr_material_transactions', {
  id:                 serial('id').primaryKey(),
  materialId:         integer('material_id').notNull().references(() => pwrMaterials.id, { onDelete: 'cascade' }),
  userId:             integer('user_id').notNull().references(() => users.id),
  taskId:             integer('task_id').references(() => pwrTasks.id, { onDelete: 'set null' }),
  transactionType:    text('transaction_type').notNull(), // IMPORT (Nhập), EXPORT (Xuất), RESERVE (Giữ chỗ), UNRESERVE
  quantity:           integer('quantity').notNull(),
  balanceAfter:       integer('balance_after').notNull(), // Tồn kho sau giao dịch (Audit)
  notes:              text('notes'),
  createdAt:          timestamp('created_at').defaultNow(),
});
export type PwrMaterialTransaction    = typeof pwrMaterialTransactions.$inferSelect;
export type NewPwrMaterialTransaction = typeof pwrMaterialTransactions.$inferInsert;


export const pwrResourceCalendar = pgTable('pwr_resource_calendar', {
  id: serial('id').primaryKey(),
  resourceId: integer('resource_id').notNull().references(() => pwrResources.id, { onDelete: 'cascade' }),
  dateStr: text('date_str').notNull(),
  capacityHours: numeric('capacity_hours').notNull(),
  reason: text('reason'),
  createdAt: timestamp('created_at').defaultNow()
});

export type PwrResourceCalendar = typeof pwrResourceCalendar.$inferSelect;
export type NewPwrResourceCalendar = typeof pwrResourceCalendar.$inferInsert;

// ============================================================
// PWR V5 - GAMIFICATION & USER STATS
// ============================================================
export const pwrUserStats = pgTable('pwr_user_stats', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
  totalPoints: integer('total_points').notNull().default(0),
  currentLevel: integer('current_level').notNull().default(1),
  tasksCompleted: integer('tasks_completed').notNull().default(0),
  lastActiveAt: timestamp('last_active_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
export type PwrUserStat = typeof pwrUserStats.$inferSelect;
export type NewPwrUserStat = typeof pwrUserStats.$inferInsert;

// ============================================================
// PWR V5 - STATION USERS (MOBILE AUTH)
// ============================================================
export const pwrStationUsers = pgTable('pwr_station_users', {
  id: serial('id').primaryKey(),
  workerCode: text('worker_code').notNull().unique(), // VD: T01, T02
  fullName: text('full_name').notNull(),
  pinCode: text('pin_code').notNull(), // Mã PIN 4-6 số
  stationRole: text('station_role').notNull(), // CNC, DAN_CANH, KHOAN_CAM
  avatarUrl: text('avatar_url'),
  points: integer('points').notNull().default(0),
  level: integer('level').notNull().default(1),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
export type PwrStationUser = typeof pwrStationUsers.$inferSelect;
export type NewPwrStationUser = typeof pwrStationUsers.$inferInsert;

