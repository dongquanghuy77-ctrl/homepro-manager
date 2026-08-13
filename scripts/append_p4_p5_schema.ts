import fs from 'fs';
import path from 'path';

const content = `
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

export const stockBalances = pgTable('stock_balances', {
  id: serial('id').primaryKey(),
  materialId: integer('material_id').notNull().references(() => materials.id),
  warehouseId: integer('warehouse_id').notNull().references(() => warehouses.id),
  locationId: text('location_id'),
  onHand: real('on_hand').notNull().default(0),
  reserved: real('reserved').notNull().default(0),
  available: real('available').notNull().default(0),
  unitCost: real('unit_cost').notNull().default(0), // Weighted Average Cost
  lastUpdated: timestamp('last_updated').defaultNow()
}, (t) => ({
  unq_bal: unique('stock_balances_mat_wh_loc_idx').on(t.materialId, t.warehouseId, t.locationId)
}));

export const stockLedgers = pgTable('stock_ledgers', {
  id: serial('id').primaryKey(),
  movementNumber: text('movement_number').notNull().unique(),
  movementType: text('movement_type').notNull(), // RECEIPT, ISSUE, TRANSFER_IN, TRANSFER_OUT, RETURN, ADJUSTMENT_IN, ADJUSTMENT_OUT
  materialId: integer('material_id').notNull().references(() => materials.id),
  warehouseId: integer('warehouse_id').notNull().references(() => warehouses.id),
  locationId: text('location_id'),
  quantity: real('quantity').notNull(),
  unitCost: real('unit_cost').notNull().default(0),
  totalCost: real('total_cost').notNull().default(0),
  referenceType: text('reference_type'), // PO, PR, GR, ISSUE, TRANSFER, RETURN, PROD_ORDER
  referenceId: integer('reference_id'),
  projectId: integer('project_id').references(() => projects.id),
  userId: integer('user_id').references(() => users.id),
  movementDate: timestamp('movement_date').notNull().defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
  notes: text('notes')
});


// ============================================================================
// P5 PRODUCTION / MANUFACTURING CORE SCHEMA
// ============================================================================

export const machines = pgTable('machines', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  type: text('type').notNull(), // CNC, EDGE_BANDER, SAW, ASSEMBLY_STATION
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow()
});

export const boms = pgTable('boms', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').notNull().references(() => materials.id), // The material that represents the finished product
  name: text('name').notNull(),
  version: text('version').notNull().default('1.0'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const bomItems = pgTable('bom_items', {
  id: serial('id').primaryKey(),
  bomId: integer('bom_id').notNull().references(() => boms.id, { onDelete: 'cascade' }),
  materialId: integer('material_id').notNull().references(() => materials.id),
  quantity: real('quantity').notNull(),
  unit: text('unit').notNull()
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
  machineTypeId: integer('machine_type_id').references(() => machines.id),
  estimatedMinutes: real('estimated_minutes').default(0)
});

export const productionOrders = pgTable('production_orders', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  projectId: integer('project_id').notNull().references(() => projects.id),
  productId: integer('product_id').notNull().references(() => materials.id),
  bomId: integer('bom_id').references(() => boms.id),
  routingId: integer('routing_id').references(() => routings.id),
  plannedQuantity: real('planned_quantity').notNull(),
  completedQuantity: real('completed_quantity').notNull().default(0),
  status: text('status').notNull().default('DRAFT'), // DRAFT, PLANNED, RELEASED, IN_PROGRESS, COMPLETED, CANCELLED
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
  plannedQuantity: real('planned_quantity').notNull(),
  completedQuantity: real('completed_quantity').notNull().default(0),
  status: text('status').notNull().default('PENDING'), // PENDING, IN_PROGRESS, COMPLETED, BLOCKED
  assignedUserId: integer('assigned_user_id').references(() => users.id),
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
  plannedQuantity: real('planned_quantity').notNull(),
  actualQuantity: real('actual_quantity').notNull().default(0),
  scrapQuantity: real('scrap_quantity').notNull().default(0),
  wasteQuantity: real('waste_quantity').notNull().default(0),
  userId: integer('user_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow()
});

export const productionOutputs = pgTable('production_outputs', {
  id: serial('id').primaryKey(),
  outputNumber: text('output_number').notNull().unique(),
  productionOrderId: integer('production_order_id').notNull().references(() => productionOrders.id),
  productId: integer('product_id').notNull().references(() => materials.id),
  warehouseId: integer('warehouse_id').notNull().references(() => warehouses.id),
  quantity: real('quantity').notNull(),
  userId: integer('user_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow()
});

export const scrapLogs = pgTable('scrap_logs', {
  id: serial('id').primaryKey(),
  productionOrderId: integer('production_order_id').notNull().references(() => productionOrders.id),
  materialId: integer('material_id').notNull().references(() => materials.id),
  quantity: real('quantity').notNull(),
  reason: text('reason').notNull(),
  userId: integer('user_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow()
});
`;

fs.appendFileSync(path.join(process.cwd(), 'src/db/schema.ts'), content);
console.log('Appended P4 & P5 schema');
