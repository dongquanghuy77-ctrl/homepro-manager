const fs = require('fs');

const contentToAppend = `
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
`;

fs.appendFileSync('src/db/schema.ts', contentToAppend);
console.log('Appended successfully');
