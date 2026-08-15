# SCHEMA DRIFT REPORT
**Status:** AUDIT COMPLETED

This report compares the Drizzle ORM schema (`src/db/schema.ts`) against the actual Neon PostgreSQL database schema.

## Table: `attendance`

**Database Foreign Keys:**
- `employee_id` -> `users(id)`
- `corrected_by` -> `users(id)`
- `approved_by_manager` -> `users(id)`
- `approved_by_hr` -> `users(id)`
- `leave_request_id` -> `leave_requests(id)`

## Table: `departments`

**Database Foreign Keys:**
- `parent_id` -> `departments(id)`

## Table: `leave_requests`
- **MISSING_IN_DB**: Column `leave_type_id` is defined in Drizzle but missing in the actual DB.
- **MISSING_IN_DB**: Column `period` is defined in Drizzle but missing in the actual DB.
- **MISSING_IN_DB**: Column `attachment_url` is defined in Drizzle but missing in the actual DB.
- **MISSING_IN_DB**: Column `approved_by_manager` is defined in Drizzle but missing in the actual DB.
- **MISSING_IN_DB**: Column `approved_by_manager_at` is defined in Drizzle but missing in the actual DB.
- **MISSING_IN_DB**: Column `manager_note` is defined in Drizzle but missing in the actual DB.
- **MISSING_IN_DB**: Column `approved_by_hr` is defined in Drizzle but missing in the actual DB.
- **MISSING_IN_DB**: Column `approved_by_hr_at` is defined in Drizzle but missing in the actual DB.
- **MISSING_IN_DB**: Column `hr_note` is defined in Drizzle but missing in the actual DB.
- **MISSING_IN_DB**: Column `cancelled_at` is defined in Drizzle but missing in the actual DB.
- **MISSING_IN_DB**: Column `cancel_reason` is defined in Drizzle but missing in the actual DB.
- **MISSING_IN_DB**: Column `idempotency_key` is defined in Drizzle but missing in the actual DB.

**Database Foreign Keys:**
- `employee_id` -> `users(id)`
- `reviewed_by` -> `users(id)`

## Table: `leave_types`
- **MISSING_IN_DB**: Table `leave_types` does not exist in the database.

## Table: `manager_departments`

**Database Foreign Keys:**
- `manager_id` -> `users(id)`
- `department_id` -> `departments(id)`

## Table: `users`

**Database Foreign Keys:**
- `manager_id` -> `users(id)`
- `department_id` -> `departments(id)`
