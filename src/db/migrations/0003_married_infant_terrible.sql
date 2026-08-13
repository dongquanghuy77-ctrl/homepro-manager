ALTER TABLE "journal_entries" ADD COLUMN "created_by" integer;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD COLUMN "posted_by" integer;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD COLUMN "posted_at" timestamp;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD COLUMN "reversed_by" integer;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD COLUMN "reversal_of" integer;--> statement-breakpoint
ALTER TABLE "journal_entry_lines" ADD COLUMN "project_id" integer;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_posted_by_users_id_fk" FOREIGN KEY ("posted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_reversed_by_users_id_fk" FOREIGN KEY ("reversed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entry_lines" ADD CONSTRAINT "journal_entry_lines_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_reference_type_reference_id_unique" UNIQUE("reference_type","reference_id");