CREATE TABLE "bom_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"bom_id" integer NOT NULL,
	"material_id" integer NOT NULL,
	"quantity" real NOT NULL,
	"unit" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "boms" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"name" text NOT NULL,
	"version" text DEFAULT '1.0' NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "machines" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "machines_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "material_consumptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"production_order_id" integer NOT NULL,
	"material_id" integer NOT NULL,
	"warehouse_id" integer NOT NULL,
	"planned_quantity" real NOT NULL,
	"actual_quantity" real DEFAULT 0 NOT NULL,
	"scrap_quantity" real DEFAULT 0 NOT NULL,
	"waste_quantity" real DEFAULT 0 NOT NULL,
	"user_id" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "production_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"project_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"bom_id" integer,
	"routing_id" integer,
	"planned_quantity" real NOT NULL,
	"completed_quantity" real DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"planned_start" timestamp,
	"planned_end" timestamp,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "production_orders_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "production_outputs" (
	"id" serial PRIMARY KEY NOT NULL,
	"output_number" text NOT NULL,
	"production_order_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"warehouse_id" integer NOT NULL,
	"quantity" real NOT NULL,
	"user_id" integer,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "production_outputs_output_number_unique" UNIQUE("output_number")
);
--> statement-breakpoint
CREATE TABLE "routing_steps" (
	"id" serial PRIMARY KEY NOT NULL,
	"routing_id" integer NOT NULL,
	"sequence" integer NOT NULL,
	"operation" text NOT NULL,
	"machine_type_id" integer,
	"estimated_minutes" real DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "routings" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"name" text NOT NULL,
	"version" text DEFAULT '1.0' NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "scrap_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"production_order_id" integer NOT NULL,
	"material_id" integer NOT NULL,
	"quantity" real NOT NULL,
	"reason" text NOT NULL,
	"user_id" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "stock_balances" (
	"id" serial PRIMARY KEY NOT NULL,
	"material_id" integer NOT NULL,
	"warehouse_id" integer NOT NULL,
	"location_id" text,
	"on_hand" real DEFAULT 0 NOT NULL,
	"reserved" real DEFAULT 0 NOT NULL,
	"available" real DEFAULT 0 NOT NULL,
	"unit_cost" real DEFAULT 0 NOT NULL,
	"last_updated" timestamp DEFAULT now(),
	CONSTRAINT "stock_balances_mat_wh_loc_idx" UNIQUE("material_id","warehouse_id","location_id")
);
--> statement-breakpoint
CREATE TABLE "stock_ledgers" (
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
	"user_id" integer,
	"movement_date" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"notes" text,
	CONSTRAINT "stock_ledgers_movement_number_unique" UNIQUE("movement_number")
);
--> statement-breakpoint
CREATE TABLE "warehouses" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"type" text DEFAULT 'MAIN_WAREHOUSE' NOT NULL,
	"address" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "warehouses_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "work_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"production_order_id" integer NOT NULL,
	"operation" text NOT NULL,
	"sequence" integer NOT NULL,
	"planned_quantity" real NOT NULL,
	"completed_quantity" real DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"assigned_user_id" integer,
	"machine_id" integer,
	"start_time" timestamp,
	"end_time" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "bom_items" ADD CONSTRAINT "bom_items_bom_id_boms_id_fk" FOREIGN KEY ("bom_id") REFERENCES "public"."boms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bom_items" ADD CONSTRAINT "bom_items_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boms" ADD CONSTRAINT "boms_product_id_materials_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."materials"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_consumptions" ADD CONSTRAINT "material_consumptions_production_order_id_production_orders_id_fk" FOREIGN KEY ("production_order_id") REFERENCES "public"."production_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_consumptions" ADD CONSTRAINT "material_consumptions_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_consumptions" ADD CONSTRAINT "material_consumptions_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_consumptions" ADD CONSTRAINT "material_consumptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_orders" ADD CONSTRAINT "production_orders_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_orders" ADD CONSTRAINT "production_orders_product_id_materials_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."materials"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_orders" ADD CONSTRAINT "production_orders_bom_id_boms_id_fk" FOREIGN KEY ("bom_id") REFERENCES "public"."boms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_orders" ADD CONSTRAINT "production_orders_routing_id_routings_id_fk" FOREIGN KEY ("routing_id") REFERENCES "public"."routings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_orders" ADD CONSTRAINT "production_orders_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_outputs" ADD CONSTRAINT "production_outputs_production_order_id_production_orders_id_fk" FOREIGN KEY ("production_order_id") REFERENCES "public"."production_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_outputs" ADD CONSTRAINT "production_outputs_product_id_materials_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."materials"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_outputs" ADD CONSTRAINT "production_outputs_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_outputs" ADD CONSTRAINT "production_outputs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routing_steps" ADD CONSTRAINT "routing_steps_routing_id_routings_id_fk" FOREIGN KEY ("routing_id") REFERENCES "public"."routings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routing_steps" ADD CONSTRAINT "routing_steps_machine_type_id_machines_id_fk" FOREIGN KEY ("machine_type_id") REFERENCES "public"."machines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routings" ADD CONSTRAINT "routings_product_id_materials_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."materials"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scrap_logs" ADD CONSTRAINT "scrap_logs_production_order_id_production_orders_id_fk" FOREIGN KEY ("production_order_id") REFERENCES "public"."production_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scrap_logs" ADD CONSTRAINT "scrap_logs_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scrap_logs" ADD CONSTRAINT "scrap_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_balances" ADD CONSTRAINT "stock_balances_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_balances" ADD CONSTRAINT "stock_balances_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_ledgers" ADD CONSTRAINT "stock_ledgers_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_ledgers" ADD CONSTRAINT "stock_ledgers_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_ledgers" ADD CONSTRAINT "stock_ledgers_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_ledgers" ADD CONSTRAINT "stock_ledgers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_production_order_id_production_orders_id_fk" FOREIGN KEY ("production_order_id") REFERENCES "public"."production_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_assigned_user_id_users_id_fk" FOREIGN KEY ("assigned_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_machine_id_machines_id_fk" FOREIGN KEY ("machine_id") REFERENCES "public"."machines"("id") ON DELETE no action ON UPDATE no action;