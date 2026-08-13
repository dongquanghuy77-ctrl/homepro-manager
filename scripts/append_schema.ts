import fs from 'fs';
import path from 'path';

const content = `
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
  quantity: real('quantity').notNull(),
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
  subtotal: real('subtotal').notNull().default(0),
  tax: real('tax').notNull().default(0),
  total: real('total').notNull().default(0),
  notes: text('notes'),
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
  quantity: real('quantity').notNull(),
  unit: text('unit').notNull(),
  unitPrice: real('unit_price').notNull().default(0),
  taxRate: real('tax_rate').default(0),
  taxAmount: real('tax_amount').default(0),
  lineTotal: real('line_total').notNull().default(0),
  receivedQuantity: real('received_quantity').notNull().default(0),
  invoicedQuantity: real('invoiced_quantity').notNull().default(0),
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
  orderedQuantity: real('ordered_quantity').notNull(),
  receivedQuantity: real('received_quantity').notNull(),
  acceptedQuantity: real('accepted_quantity').notNull().default(0),
  rejectedQuantity: real('rejected_quantity').notNull().default(0),
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
  subtotal: real('subtotal').notNull().default(0),
  tax: real('tax').notNull().default(0),
  total: real('total').notNull().default(0),
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
  quantity: real('quantity').notNull(),
  unitPrice: real('unit_price').notNull(),
  lineTotal: real('line_total').notNull()
});
`;

fs.appendFileSync(path.join(process.cwd(), 'src/db/schema.ts'), content);
console.log('Appended procurement schema');
