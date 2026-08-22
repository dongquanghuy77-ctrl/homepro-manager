CREATE TABLE "pwr_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"category" text DEFAULT 'OTHER' NOT NULL,
	"project_ref" text,
	"tags" text[],
	"priority" text DEFAULT 'MEDIUM' NOT NULL,
	"status" text DEFAULT 'INBOX' NOT NULL,
	"start_date" text,
	"due_date" text,
	"deferred_to" text,
	"completed_at" timestamp,
	"deleted_at" timestamp,
	"waiting_for" text,
	"assigned_to" text,
	"related_person" text,
	"result" text,
	"cancel_reason" text,
	"source" text DEFAULT 'SELF',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pwr_work_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"log_type" text DEFAULT 'NOTE' NOT NULL,
	"content" text NOT NULL,
	"result" text,
	"issue" text,
	"next_action" text,
	"waiting_for" text,
	"duration_minutes" integer,
	"status_from" text,
	"status_to" text,
	"is_system_log" boolean DEFAULT false NOT NULL,
	"edited_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pwr_task_audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"action" text NOT NULL,
	"field_name" text,
	"old_value" text,
	"new_value" text,
	"reason" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "pwr_tasks" ADD CONSTRAINT "pwr_tasks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "pwr_work_logs" ADD CONSTRAINT "pwr_work_logs_task_id_pwr_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."pwr_tasks"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "pwr_work_logs" ADD CONSTRAINT "pwr_work_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "pwr_task_audit_log" ADD CONSTRAINT "pwr_task_audit_log_task_id_pwr_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."pwr_tasks"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "pwr_task_audit_log" ADD CONSTRAINT "pwr_task_audit_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "idx_pwr_tasks_user_status" ON "pwr_tasks" ("user_id","status");
--> statement-breakpoint
CREATE INDEX "idx_pwr_tasks_user_completed" ON "pwr_tasks" ("user_id","completed_at");
--> statement-breakpoint
CREATE INDEX "idx_pwr_tasks_due_date" ON "pwr_tasks" ("due_date");
--> statement-breakpoint
CREATE INDEX "idx_pwr_tasks_deleted_at" ON "pwr_tasks" ("deleted_at");
--> statement-breakpoint
CREATE INDEX "idx_pwr_logs_task_id" ON "pwr_work_logs" ("task_id");
--> statement-breakpoint
CREATE INDEX "idx_pwr_logs_user_date" ON "pwr_work_logs" ("user_id","created_at");
--> statement-breakpoint
CREATE INDEX "idx_pwr_audit_task_id" ON "pwr_task_audit_log" ("task_id");
