# FULL SYSTEM REGRESSION & MANUAL ENTRY REPORT

## 1. Manual Entry (Thêm thủ công) Flow Audit
**Status:** ❌ **FAIL**

**Findings:**
We searched `src/db/schema.ts` for the fields `source`, `entered_by`, `entered_at`, and `status`. While we found some scattered usages like `clockInSource: 'MANUAL'` (Attendance) and `sourceType: 'MANUAL'` (Source Center), there is no unified structure containing all the mandated fields (`source`, `entered_by`, `entered_at`, `status`) for the generic "Manual Entry" flow. 

**Implementation Plan:**
To add the missing fields to the relevant manual entry tables (or as a trait for existing transactional tables), update `src/db/schema.ts` to include:
```typescript
source: text('source').notNull().default('MANUAL'),
enteredBy: integer('entered_by').references(() => users.id),
enteredAt: timestamp('entered_at').defaultNow(),
status: text('status').notNull().default('PENDING'), // PENDING, APPROVED, REJECTED
```
And create a migration (`drizzle-kit generate`) to apply these to the database.

## 2. API 500/404 Error Handling Diagnostics
**Status:** ❌ **FAIL**

**Findings:**
A scan across `src/app/api/` reveals that while endpoints do return 404 and 500 status codes, many are poorly diagnosed.
- Several endpoints return `NextResponse.json({ error: error.message }, { status: 500 })`. If the thrown error is not an `Error` object, `error.message` evaluates to `undefined`, leaking an empty or ambiguous error object to the client.
- Endpoints often return hardcoded messages like `Internal Server Error` or `Lỗi hệ thống` without logging the actual stack trace or error object (e.g., using `console.error(error)`), making diagnostics and debugging impossible.

## 3. Dashboard DB Queries vs Mocks
**Inventory Dashboard (`src/app/inventory/dashboard/page.tsx`)**
**Status:** ✅ **PASS**
- The inventory dashboard uses actual Drizzle ORM DB queries (`db.select().from(inventoryBalances)...`) to fetch live data. There is no mock data.

**Production Dashboard (`src/app/production/dashboard/page.tsx`)**
**Status:** ❌ **FAIL**
- The production dashboard is entirely mocked. It uses hardcoded static UI elements (e.g., `12` active orders, `85%` completion rate, `45` workers) and mock array representations (`[Biểu đồ phân tích sản xuất]`) without any actual connection to the database.

## 4. Overall Module Pass/Fail Summary

| Module | Status | Notes |
|---|---|---|
| **INVENTORY** | ✅ PASS | Dashboard properly connected to the database. |
| **PRODUCTION** | ❌ FAIL | Dashboard uses hardcoded mock data. |
| **CORE API** | ❌ FAIL | Insufficient error diagnostics (returns undefined/generic 500s). |
| **MANUAL ENTRY** | ❌ FAIL | Missing `entered_by`, `entered_at`, `status`, `source=MANUAL`. |
| **CRM** | ⚠️ UNTESTED | Requires further deep-dive. |
| **PROJECT** | ⚠️ UNTESTED | Requires further deep-dive. |
| **BOQ** | ⚠️ UNTESTED | Requires further deep-dive. |
| **BOM** | ⚠️ UNTESTED | Requires further deep-dive. |
| **MATERIAL** | ⚠️ UNTESTED | Requires further deep-dive. |
| **PURCHASING**| ⚠️ UNTESTED | Requires further deep-dive. |
| **ATTENDANCE**| ⚠️ UNTESTED | Requires further deep-dive. |
| **LEAVE** | ⚠️ UNTESTED | Requires further deep-dive. |
| **EMPLOYEE** | ⚠️ UNTESTED | Requires further deep-dive. |
| **PAYROLL** | ⚠️ UNTESTED | Requires further deep-dive. |
| **QC** | ⚠️ UNTESTED | Requires further deep-dive. |
| **COST** | ⚠️ UNTESTED | Requires further deep-dive. |
| **APPROVAL** | ⚠️ UNTESTED | Requires further deep-dive. |
| **REPORT** | ⚠️ UNTESTED | Requires further deep-dive. |
| **DASHBOARD** | ❌ FAIL | Production dashboard is mocked. |
| **SOURCE CENTER** | ⚠️ UNTESTED | Requires further deep-dive. |

*Note: The user explicitly prohibited generating fake test data or mocking data. The findings strictly reflect the current codebase state.*
