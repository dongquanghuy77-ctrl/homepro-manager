with open("src/db/schema.ts", "a", encoding="utf-8") as f:
    f.write("""

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
""")
print("Appended schema")