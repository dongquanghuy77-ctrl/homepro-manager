CREATE TABLE "document_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"document_id" integer NOT NULL,
	"version_number" integer NOT NULL,
	"file_url" text NOT NULL,
	"file_type" text,
	"file_size" integer,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"status" text DEFAULT 'CURRENT' NOT NULL,
	"change_note" text
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"folder" text DEFAULT 'COMPANY' NOT NULL,
	"entity_type" text,
	"entity_id" integer,
	"owner_id" integer,
	"department_id" integer,
	"latest_version" integer DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "domain_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_name" text NOT NULL,
	"payload" jsonb NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"error_log" text,
	"created_at" timestamp DEFAULT now(),
	"processed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "inventory_balances" (
	"id" serial PRIMARY KEY NOT NULL,
	"material_id" integer NOT NULL,
	"warehouse_id" integer NOT NULL,
	"location_id" text,
	"quantity" real DEFAULT 0 NOT NULL,
	"reserved_quantity" real DEFAULT 0 NOT NULL,
	"available_quantity" real DEFAULT 0 NOT NULL,
	"unit_cost" real DEFAULT 0 NOT NULL,
	"last_updated" timestamp DEFAULT now(),
	CONSTRAINT "inventory_balances_mat_wh_loc_idx" UNIQUE("material_id","warehouse_id","location_id")
);
--> statement-breakpoint
CREATE TABLE "inventory_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"movement_number" text NOT NULL,
	"movement_type" text NOT NULL,
	"material_id" integer NOT NULL,
	"warehouse_id" integer NOT NULL,
	"location_id" text,
	"quantity" real NOT NULL,
	"unit_cost" real DEFAULT 0 NOT NULL,
	"total_cost" real DEFAULT 0 NOT NULL,
	"reference_type" text,
	"reference_id" integer,
	"project_id" integer,
	"created_by" integer,
	"movement_date" timestamp DEFAULT now() NOT NULL,
	"idempotency_key" text,
	"created_at" timestamp DEFAULT now(),
	"notes" text,
	CONSTRAINT "inventory_transactions_movement_number_unique" UNIQUE("movement_number"),
	CONSTRAINT "inventory_transactions_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "supplier_contacts" (
	"id" serial PRIMARY KEY NOT NULL,
	"supplier_id" integer NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"email" text,
	"position" text,
	"is_primary" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "supplier_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"supplier_id" integer NOT NULL,
	"material_id" integer NOT NULL,
	"supplier_item_code" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "supplier_prices" (
	"id" serial PRIMARY KEY NOT NULL,
	"supplier_item_id" integer NOT NULL,
	"price" real NOT NULL,
	"currency" text DEFAULT 'VND',
	"effective_date" timestamp NOT NULL,
	"end_date" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "stock_balances" DROP CONSTRAINT "stock_balances_mat_wh_loc_idx";--> statement-breakpoint
ALTER TABLE "leave_requests" ADD COLUMN "idempotency_key" text;--> statement-breakpoint
ALTER TABLE "monthly_payroll" ADD COLUMN "idempotency_key" text;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD COLUMN "idempotency_key" text;--> statement-breakpoint
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_balances" ADD CONSTRAINT "inventory_balances_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_balances" ADD CONSTRAINT "inventory_balances_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_contacts" ADD CONSTRAINT "supplier_contacts_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_items" ADD CONSTRAINT "supplier_items_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_items" ADD CONSTRAINT "supplier_items_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_prices" ADD CONSTRAINT "supplier_prices_supplier_item_id_supplier_items_id_fk" FOREIGN KEY ("supplier_item_id") REFERENCES "public"."supplier_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_idempotency_key_unique" UNIQUE("idempotency_key");--> statement-breakpoint
ALTER TABLE "monthly_payroll" ADD CONSTRAINT "monthly_payroll_idempotency_key_unique" UNIQUE("idempotency_key");--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_idempotency_key_unique" UNIQUE("idempotency_key");