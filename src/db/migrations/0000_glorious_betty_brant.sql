CREATE TABLE "attendance" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"work_date" text NOT NULL,
	"check_in" timestamp,
	"check_out" timestamp,
	"status" text DEFAULT 'NOT_CHECKED' NOT NULL,
	"late_minutes" integer DEFAULT 0,
	"early_leave_minutes" integer DEFAULT 0,
	"total_hours" real DEFAULT 0,
	"clock_in_source" text DEFAULT 'MANUAL',
	"clock_out_source" text DEFAULT 'MANUAL',
	"device_id" text,
	"check_in_lat" real,
	"check_in_lng" real,
	"check_out_lat" real,
	"check_out_lng" real,
	"location" text,
	"idempotency_key" text,
	"confirm_sources" text DEFAULT '[]',
	"note" text,
	"corrected_by" integer,
	"corrected_at" timestamp,
	"correction_reason" text,
	"approval_status" text DEFAULT 'PENDING_MANAGER' NOT NULL,
	"approved_by_manager" integer,
	"approved_by_manager_at" timestamp,
	"manager_note" text,
	"approved_by_hr" integer,
	"approved_by_hr_at" timestamp,
	"hr_note" text,
	"adjusted_hours" real,
	"adjust_reason" text,
	"leave_request_id" integer,
	"is_offline_sync" boolean DEFAULT false NOT NULL,
	"client_timestamp" timestamp,
	"offline_sync_delta" integer,
	"is_flagged" boolean DEFAULT false NOT NULL,
	"flag_reason" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "attendance_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "boq_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"material_id" integer,
	"task_id" integer,
	"material_name" text NOT NULL,
	"unit" text DEFAULT 'cái' NOT NULL,
	"unit_price" real DEFAULT 0,
	"qty_required" real DEFAULT 0 NOT NULL,
	"qty_ordered" real DEFAULT 0,
	"qty_received" real DEFAULT 0,
	"category" text,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "costs" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"title" text NOT NULL,
	"amount" real DEFAULT 0 NOT NULL,
	"category" text DEFAULT 'Vật tư mua ngoài',
	"cost_date" text NOT NULL,
	"notes" text,
	"created_by_name" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"email" text,
	"address" text,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "delegations" (
	"id" serial PRIMARY KEY NOT NULL,
	"delegator_id" integer NOT NULL,
	"delegate_id" integer NOT NULL,
	"scope" text[] NOT NULL,
	"department_ids" integer[] NOT NULL,
	"start_at" timestamp NOT NULL,
	"end_at" timestamp NOT NULL,
	"reason" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"revoked_at" timestamp,
	"created_by" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "departments" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"block" text,
	"parent_id" integer,
	"sort_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "departments_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "hr_audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" integer,
	"actor_id" integer,
	"actor_name" text,
	"old_value" text,
	"new_value" text,
	"ip_address" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "leave_approvals" (
	"id" serial PRIMARY KEY NOT NULL,
	"request_id" integer NOT NULL,
	"approver_id" integer NOT NULL,
	"approval_level" integer NOT NULL,
	"action" text NOT NULL,
	"comment" text,
	"delegated_for" integer,
	"approved_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "leave_balances" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"leave_type_id" integer NOT NULL,
	"year" integer NOT NULL,
	"total_days" real DEFAULT 0 NOT NULL,
	"carry_over_days" real DEFAULT 0 NOT NULL,
	"used_days" real DEFAULT 0 NOT NULL,
	"pending_days" real DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "leave_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"leave_type" text DEFAULT 'ANNUAL' NOT NULL,
	"leave_type_id" integer,
	"start_date" text NOT NULL,
	"end_date" text NOT NULL,
	"period" text DEFAULT 'FULL_DAY' NOT NULL,
	"total_days" real DEFAULT 1 NOT NULL,
	"reason" text,
	"attachment_url" text,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"current_approval_level" integer DEFAULT 1 NOT NULL,
	"max_approval_levels" integer DEFAULT 2 NOT NULL,
	"reviewed_by" integer,
	"reviewed_at" timestamp,
	"review_note" text,
	"approved_by_manager" integer,
	"approved_by_manager_at" timestamp,
	"manager_note" text,
	"approved_by_hr" integer,
	"approved_by_hr_at" timestamp,
	"hr_note" text,
	"cancelled_at" timestamp,
	"cancel_reason" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "leave_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"max_days_per_year" real,
	"is_paid" boolean DEFAULT true NOT NULL,
	"is_carry_over" boolean DEFAULT false NOT NULL,
	"max_carry_over_days" integer DEFAULT 5,
	"requires_approval" boolean DEFAULT true NOT NULL,
	"approval_levels" integer DEFAULT 2 NOT NULL,
	"max_days_no_doc" integer DEFAULT 3,
	"payroll_impact" text DEFAULT 'NONE' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "leave_types_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "manager_departments" (
	"id" serial PRIMARY KEY NOT NULL,
	"manager_id" integer NOT NULL,
	"department_id" integer NOT NULL,
	"management_level" integer DEFAULT 1 NOT NULL,
	"can_view" boolean DEFAULT true NOT NULL,
	"can_approve" boolean DEFAULT false NOT NULL,
	"can_manage" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "material_tracking_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer,
	"bom_line_id" integer,
	"qr_code" text,
	"stage" text NOT NULL,
	"stage_label" text,
	"scanned_by_name" text,
	"scanned_by_id" integer,
	"location" text,
	"note" text,
	"scanned_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "materials" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"unit" text DEFAULT 'cái' NOT NULL,
	"unit_price" real DEFAULT 0,
	"stock_qty" real DEFAULT 0,
	"min_stock" real DEFAULT 0,
	"category" text,
	"supplier" text,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "materials_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "monthly_payroll" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"month" integer NOT NULL,
	"year" integer NOT NULL,
	"official_salary" real DEFAULT 0 NOT NULL,
	"basic_salary" real DEFAULT 0 NOT NULL,
	"regular_worked_days" real DEFAULT 0 NOT NULL,
	"paid_leave_days" real DEFAULT 0 NOT NULL,
	"evening_ot_hours" real DEFAULT 0 NOT NULL,
	"night_ot_hours" real DEFAULT 0 NOT NULL,
	"sunday_hours" real DEFAULT 0 NOT NULL,
	"sunday_night_hours" real DEFAULT 0 NOT NULL,
	"holiday_days_off" real DEFAULT 0 NOT NULL,
	"holiday_worked_weekday_days" real DEFAULT 0 NOT NULL,
	"holiday_worked_sunday_days" real DEFAULT 0 NOT NULL,
	"unpaid_leave_days" real DEFAULT 0 NOT NULL,
	"absent_days" real DEFAULT 0 NOT NULL,
	"attendance_allowance" real DEFAULT 0 NOT NULL,
	"total_late_early_mins" real DEFAULT 0 NOT NULL,
	"gross_earnings" real DEFAULT 0 NOT NULL,
	"total_deductions" real DEFAULT 0 NOT NULL,
	"net_salary" real DEFAULT 0 NOT NULL,
	"bhxh_employee" real DEFAULT 0 NOT NULL,
	"bhxh_employer" real DEFAULT 0 NOT NULL,
	"advance_deduction" real DEFAULT 0 NOT NULL,
	"other_deductions" real DEFAULT 0 NOT NULL,
	"line_items_json" jsonb,
	"warnings_json" jsonb,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"published_by" integer,
	"published_at" timestamp,
	"note" text,
	"calculated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "uq_payroll_emp_month_year" UNIQUE("employee_id","month","year")
);
--> statement-breakpoint
CREATE TABLE "overtime_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"work_date" text NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"total_hours" real DEFAULT 0 NOT NULL,
	"reason" text,
	"project_id" integer,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"current_approval_level" integer DEFAULT 1 NOT NULL,
	"max_approval_levels" integer DEFAULT 1 NOT NULL,
	"approved_by" integer,
	"approved_at" timestamp,
	"approve_note" text,
	"approved_by_hr" integer,
	"approved_by_hr_at" timestamp,
	"hr_note" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "payslip_disputes" (
	"id" serial PRIMARY KEY NOT NULL,
	"payroll_id" integer NOT NULL,
	"employee_id" integer NOT NULL,
	"month" integer NOT NULL,
	"year" integer NOT NULL,
	"reason" text NOT NULL,
	"status" text DEFAULT 'OPEN' NOT NULL,
	"hr_response" text,
	"reviewed_by" integer,
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"description" text,
	CONSTRAINT "permissions_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "production_bom_lines" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"zone_id" text NOT NULL,
	"zone_name" text,
	"product_name" text NOT NULL,
	"material_code" text,
	"material_id" integer,
	"unit" text DEFAULT 'cái' NOT NULL,
	"qty" real DEFAULT 0 NOT NULL,
	"unit_price" real DEFAULT 0,
	"total" real DEFAULT 0,
	"supply_type" text DEFAULT 'HOMEPRO_PRODUCTION' NOT NULL,
	"note" text,
	"stt_in_zone" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"customer" text,
	"manager" text,
	"location" text,
	"contract_value" real DEFAULT 0,
	"target_material_cost" real DEFAULT 0,
	"target_labor_cost" real DEFAULT 0,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"start_date" text,
	"deadline" text,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "projects_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "qc_issues" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"task_id" integer,
	"code" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"location" text,
	"category" text,
	"severity" text DEFAULT 'MEDIUM' NOT NULL,
	"status" text DEFAULT 'OPEN' NOT NULL,
	"reported_by" text,
	"assigned_to" text,
	"due_date" text,
	"resolved_date" text,
	"resolution" text,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"role" text NOT NULL,
	"permission_id" integer NOT NULL,
	"scope" text DEFAULT 'COMPANY' NOT NULL,
	CONSTRAINT "role_permissions_role_permission_id_pk" PRIMARY KEY("role","permission_id")
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"value" text,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"category" text DEFAULT '' NOT NULL,
	"title" text NOT NULL,
	"assignee" text,
	"start_date" text,
	"end_date" text,
	"deadline" text,
	"priority" text DEFAULT 'MEDIUM' NOT NULL,
	"status" text DEFAULT 'NOT_STARTED' NOT NULL,
	"progress" integer DEFAULT 0,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"name" text NOT NULL,
	"position" text,
	"birth_date" text,
	"role" text DEFAULT 'WORKER' NOT NULL,
	"phone" text,
	"email" text,
	"active" boolean DEFAULT true NOT NULL,
	"pin_hash" text,
	"failed_pin_attempts" integer DEFAULT 0 NOT NULL,
	"pin_locked_until" timestamp,
	"require_password_change" boolean DEFAULT false NOT NULL,
	"employee_code" text,
	"department" text,
	"employment_type" text DEFAULT 'FULL_TIME',
	"join_date" text,
	"manager_id" integer,
	"department_id" integer,
	"employee_status" text DEFAULT 'ACTIVE',
	"note" text,
	"official_salary" real DEFAULT 0,
	"basic_salary" real DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_employee_code_unique" UNIQUE("employee_code")
);
--> statement-breakpoint
CREATE TABLE "work_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"task_id" integer,
	"log_date" text NOT NULL,
	"category" text,
	"description" text NOT NULL,
	"workers" text,
	"worker_count" integer DEFAULT 0,
	"hours_worked" real DEFAULT 0,
	"weather" text,
	"progress_note" text,
	"issues" text,
	"recorded_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_employee_id_users_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_corrected_by_users_id_fk" FOREIGN KEY ("corrected_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_approved_by_manager_users_id_fk" FOREIGN KEY ("approved_by_manager") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_approved_by_hr_users_id_fk" FOREIGN KEY ("approved_by_hr") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_leave_request_id_leave_requests_id_fk" FOREIGN KEY ("leave_request_id") REFERENCES "public"."leave_requests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boq_items" ADD CONSTRAINT "boq_items_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boq_items" ADD CONSTRAINT "boq_items_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boq_items" ADD CONSTRAINT "boq_items_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "costs" ADD CONSTRAINT "costs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delegations" ADD CONSTRAINT "delegations_delegator_id_users_id_fk" FOREIGN KEY ("delegator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delegations" ADD CONSTRAINT "delegations_delegate_id_users_id_fk" FOREIGN KEY ("delegate_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delegations" ADD CONSTRAINT "delegations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_audit_logs" ADD CONSTRAINT "hr_audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_approvals" ADD CONSTRAINT "leave_approvals_request_id_leave_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."leave_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_approvals" ADD CONSTRAINT "leave_approvals_approver_id_users_id_fk" FOREIGN KEY ("approver_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_approvals" ADD CONSTRAINT "leave_approvals_delegated_for_users_id_fk" FOREIGN KEY ("delegated_for") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_balances" ADD CONSTRAINT "leave_balances_employee_id_users_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_balances" ADD CONSTRAINT "leave_balances_leave_type_id_leave_types_id_fk" FOREIGN KEY ("leave_type_id") REFERENCES "public"."leave_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_employee_id_users_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_leave_type_id_leave_types_id_fk" FOREIGN KEY ("leave_type_id") REFERENCES "public"."leave_types"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_approved_by_manager_users_id_fk" FOREIGN KEY ("approved_by_manager") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_approved_by_hr_users_id_fk" FOREIGN KEY ("approved_by_hr") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manager_departments" ADD CONSTRAINT "manager_departments_manager_id_users_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manager_departments" ADD CONSTRAINT "manager_departments_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_tracking_logs" ADD CONSTRAINT "material_tracking_logs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_tracking_logs" ADD CONSTRAINT "material_tracking_logs_bom_line_id_production_bom_lines_id_fk" FOREIGN KEY ("bom_line_id") REFERENCES "public"."production_bom_lines"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_tracking_logs" ADD CONSTRAINT "material_tracking_logs_scanned_by_id_users_id_fk" FOREIGN KEY ("scanned_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monthly_payroll" ADD CONSTRAINT "monthly_payroll_employee_id_users_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monthly_payroll" ADD CONSTRAINT "monthly_payroll_published_by_users_id_fk" FOREIGN KEY ("published_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "overtime_requests" ADD CONSTRAINT "overtime_requests_employee_id_users_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "overtime_requests" ADD CONSTRAINT "overtime_requests_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "overtime_requests" ADD CONSTRAINT "overtime_requests_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "overtime_requests" ADD CONSTRAINT "overtime_requests_approved_by_hr_users_id_fk" FOREIGN KEY ("approved_by_hr") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payslip_disputes" ADD CONSTRAINT "payslip_disputes_payroll_id_monthly_payroll_id_fk" FOREIGN KEY ("payroll_id") REFERENCES "public"."monthly_payroll"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payslip_disputes" ADD CONSTRAINT "payslip_disputes_employee_id_users_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payslip_disputes" ADD CONSTRAINT "payslip_disputes_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_bom_lines" ADD CONSTRAINT "production_bom_lines_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_bom_lines" ADD CONSTRAINT "production_bom_lines_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qc_issues" ADD CONSTRAINT "qc_issues_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qc_issues" ADD CONSTRAINT "qc_issues_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_logs" ADD CONSTRAINT "work_logs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_logs" ADD CONSTRAINT "work_logs_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE set null ON UPDATE no action;