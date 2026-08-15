CREATE TABLE "job_cards" (
	"id" serial PRIMARY KEY NOT NULL,
	"work_order_id" integer NOT NULL,
	"employee_id" integer NOT NULL,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp,
	"duration_minutes" numeric(18, 4),
	"completed_quantity" numeric(18, 4) DEFAULT 0 NOT NULL,
	"rejected_quantity" numeric(18, 4) DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'IN_PROGRESS' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "production_costings" (
	"id" serial PRIMARY KEY NOT NULL,
	"production_order_id" integer NOT NULL,
	"material_cost_standard" numeric(20, 2) DEFAULT 0 NOT NULL,
	"material_cost_actual" numeric(20, 2) DEFAULT 0 NOT NULL,
	"labor_cost_standard" numeric(20, 2) DEFAULT 0 NOT NULL,
	"labor_cost_actual" numeric(20, 2) DEFAULT 0 NOT NULL,
	"machine_cost_standard" numeric(20, 2) DEFAULT 0 NOT NULL,
	"machine_cost_actual" numeric(20, 2) DEFAULT 0 NOT NULL,
	"overhead_cost_standard" numeric(20, 2) DEFAULT 0 NOT NULL,
	"overhead_cost_actual" numeric(20, 2) DEFAULT 0 NOT NULL,
	"total_cost_standard" numeric(20, 2) DEFAULT 0 NOT NULL,
	"total_cost_actual" numeric(20, 2) DEFAULT 0 NOT NULL,
	"calculated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "work_centers" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"department_id" integer,
	"manager_id" integer,
	"standard_hourly_cost" numeric(20, 2) DEFAULT 0,
	"daily_capacity_hours" numeric(18, 4) DEFAULT 8,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "work_centers_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "material_consumptions" ALTER COLUMN "planned_quantity" SET DATA TYPE numeric(18, 4);--> statement-breakpoint
ALTER TABLE "material_consumptions" ALTER COLUMN "actual_quantity" SET DATA TYPE numeric(18, 4);--> statement-breakpoint
ALTER TABLE "material_consumptions" ALTER COLUMN "scrap_quantity" SET DATA TYPE numeric(18, 4);--> statement-breakpoint
ALTER TABLE "material_consumptions" ALTER COLUMN "waste_quantity" SET DATA TYPE numeric(18, 4);--> statement-breakpoint
ALTER TABLE "production_orders" ALTER COLUMN "planned_quantity" SET DATA TYPE numeric(18, 4);--> statement-breakpoint
ALTER TABLE "production_orders" ALTER COLUMN "completed_quantity" SET DATA TYPE numeric(18, 4);--> statement-breakpoint
ALTER TABLE "scrap_logs" ALTER COLUMN "production_order_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "work_orders" ALTER COLUMN "planned_quantity" SET DATA TYPE numeric(18, 4);--> statement-breakpoint
ALTER TABLE "work_orders" ALTER COLUMN "completed_quantity" SET DATA TYPE numeric(18, 4);--> statement-breakpoint
ALTER TABLE "machines" ADD COLUMN "work_center_id" integer;--> statement-breakpoint
ALTER TABLE "scrap_logs" ADD COLUMN "work_order_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "scrap_logs" ADD COLUMN "product_id" integer;--> statement-breakpoint
ALTER TABLE "scrap_logs" ADD COLUMN "employee_id" integer;--> statement-breakpoint
ALTER TABLE "scrap_logs" ADD COLUMN "photo_url" text;--> statement-breakpoint
ALTER TABLE "job_cards" ADD CONSTRAINT "job_cards_work_order_id_work_orders_id_fk" FOREIGN KEY ("work_order_id") REFERENCES "public"."work_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_cards" ADD CONSTRAINT "job_cards_employee_id_users_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_costings" ADD CONSTRAINT "production_costings_production_order_id_production_orders_id_fk" FOREIGN KEY ("production_order_id") REFERENCES "public"."production_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_centers" ADD CONSTRAINT "work_centers_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_centers" ADD CONSTRAINT "work_centers_manager_id_users_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "machines" ADD CONSTRAINT "machines_work_center_id_work_centers_id_fk" FOREIGN KEY ("work_center_id") REFERENCES "public"."work_centers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scrap_logs" ADD CONSTRAINT "scrap_logs_work_order_id_work_orders_id_fk" FOREIGN KEY ("work_order_id") REFERENCES "public"."work_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scrap_logs" ADD CONSTRAINT "scrap_logs_product_id_materials_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."materials"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scrap_logs" ADD CONSTRAINT "scrap_logs_employee_id_users_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;