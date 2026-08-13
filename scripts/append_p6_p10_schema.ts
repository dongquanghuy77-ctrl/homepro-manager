import fs from 'fs';
import path from 'path';

const content = `
// ============================================================================
// P6 PROJECT COSTING & SCHEDULING
// ============================================================================

export const projectCosts = pgTable('project_costs', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').notNull().references(() => projects.id),
  costCategory: text('cost_category').notNull(), // MATERIAL, LABOR, SUBCONTRACTOR, OVERHEAD
  amount: real('amount').notNull(),
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
  name: text('name').notNull(),
  phone: text('phone'),
  email: text('email'),
  source: text('source'),
  status: text('status').notNull().default('NEW'), // NEW, CONTACTED, QUALIFIED, LOST, CONVERTED
  assignedTo: integer('assigned_to').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow()
});

export const quotes = pgTable('quotes', {
  id: serial('id').primaryKey(),
  quoteNumber: text('quote_number').notNull().unique(),
  customerId: integer('customer_id').notNull().references(() => customers.id),
  leadId: integer('lead_id').references(() => leads.id),
  totalAmount: real('total_amount').notNull().default(0),
  status: text('status').notNull().default('DRAFT'), // DRAFT, SENT, ACCEPTED, REJECTED
  validUntil: timestamp('valid_until'),
  createdAt: timestamp('created_at').defaultNow()
});

export const quoteItems = pgTable('quote_items', {
  id: serial('id').primaryKey(),
  quoteId: integer('quote_id').notNull().references(() => quotes.id, { onDelete: 'cascade' }),
  description: text('description').notNull(),
  quantity: real('quantity').notNull(),
  unitPrice: real('unit_price').notNull(),
  totalPrice: real('total_price').notNull()
});

export const salesOrders = pgTable('sales_orders', {
  id: serial('id').primaryKey(),
  orderNumber: text('order_number').notNull().unique(),
  quoteId: integer('quote_id').references(() => quotes.id),
  customerId: integer('customer_id').notNull().references(() => customers.id),
  projectId: integer('project_id').references(() => projects.id),
  totalAmount: real('total_amount').notNull().default(0),
  status: text('status').notNull().default('NEW'), // NEW, PROCESSING, DELIVERED, INVOICED, CANCELLED
  createdAt: timestamp('created_at').defaultNow()
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
  quantity: real('quantity').notNull()
});
`;

fs.appendFileSync(path.join(process.cwd(), 'src/db/schema.ts'), content);
console.log('Appended P6-P10 schema');
