#!/usr/bin/env ts-node
/**
 * BAO MINH CMT8 — MATERIAL INGESTION ACCEPTANCE SCRIPT
 * Phase 4D: Gate Validation
 *
 * ACCEPTANCE GATES:
 *   GATE 1: FAIL = 0          (no critical failures)
 *   GATE 2: BLOCKER = 0       (no blocking errors)
 *   GATE 3: ORPHAN = 0        (no orphaned lines)
 *   GATE 4: UNTRACED = 0      (all lines have lineage)
 *   GATE 5: AMOUNT_MISMATCH = 0 (all amounts verified)
 *   GATE 6: ERP_CREATED = 0   (no premature ERP posting)
 *
 * EXIT CODE:
 *   0 = ALL GATES PASS (safe to proceed to human review)
 *   1 = ONE OR MORE GATES FAIL (pipeline must stop)
 */

import * as fs from "fs";
import * as path from "path";

// ─── TYPES ───────────────────────────────────────────────────────

interface LineItem {
  line_id: string;
  source_id: string;
  document_type: string;
  description_raw: string;
  quantity: number;
  unit_price?: number | null;
  unit_price_after_discount?: number | null;
  line_amount?: number | null;
  product_match_status: string;
  boq_match_status: string;
  warehouse_status: string;
  supplier: string;
  erp_can_post: boolean;
  erp_block_reasons: string[];
  reconciliation_status: string;
  lineage: string;
}

interface ReconciliationReport {
  phase: string;
  generated_at: string;
  project_id: string;
  summary: {
    total_source_documents: number;
    total_line_items: number;
    erp_transactions_created: number;
    erp_postable_now: number;
    amount_mismatches: number;
  };
  reconciliation_rows: LineItem[];
  erp_gate_checks: Array<{
    line_id: string;
    can_post: boolean;
    block_count: number;
    reasons: string[];
  }>;
}

interface SourceRegister {
  source_documents: Array<{
    source_id: string;
    source_image: string;
    source_file: string;
    document_type_classified: string;
    line_items: Array<{
      line_id: string;
      lineage?: string;
    }>;
    erp_transaction_created: boolean;
    audit_trail: Array<{ action: string; by: string; at: string }>;
  }>;
}

// ─── RESULT TYPES ────────────────────────────────────────────────

type GateStatus = "PASS" | "FAIL" | "WARN";

interface GateResult {
  gate: string;
  description: string;
  status: GateStatus;
  count: number;
  expected: number;
  details: string[];
}

// ─── CONFIG ──────────────────────────────────────────────────────

const PROJ_DIR = "docs/projects/BAO-MINH-CMT8";
const RECON_FILE = path.join(PROJ_DIR, "material-ingestion-reconciliation.json");
const REGISTER_FILE = path.join(PROJ_DIR, "source-document-register.json");

// ─── LOAD ────────────────────────────────────────────────────────

function load(): { recon: ReconciliationReport; register: SourceRegister } {
  if (!fs.existsSync(RECON_FILE)) {
    console.error(`[ACCEPTANCE] FATAL: ${RECON_FILE} not found. Run Phase 4A+4B first.`);
    process.exit(1);
  }
  if (!fs.existsSync(REGISTER_FILE)) {
    console.error(`[ACCEPTANCE] FATAL: ${REGISTER_FILE} not found. Run Phase 4A first.`);
    process.exit(1);
  }
  const recon = JSON.parse(fs.readFileSync(RECON_FILE, "utf-8")) as ReconciliationReport;
  const register = JSON.parse(fs.readFileSync(REGISTER_FILE, "utf-8")) as SourceRegister;
  return { recon, register };
}

// ─── GATE CHECKS ─────────────────────────────────────────────────

/** GATE 1: FAIL — Critical structural failures */
function gate1_fail(recon: ReconciliationReport): GateResult {
  const details: string[] = [];
  let count = 0;

  // Check phase marker
  if (!recon.phase.startsWith("4")) {
    details.push(`Phase marker invalid: ${recon.phase}`);
    count++;
  }

  // Check row count consistency
  const reported = recon.summary.total_line_items;
  const actual = recon.reconciliation_rows.length;
  if (reported !== actual) {
    details.push(`Row count mismatch: summary says ${reported} but found ${actual} rows`);
    count++;
  }

  // Check all rows have required fields
  for (const row of recon.reconciliation_rows) {
    if (!row.line_id) { details.push(`Row missing line_id`); count++; }
    if (!row.source_id) { details.push(`${row.line_id}: missing source_id`); count++; }
    if (!row.document_type) { details.push(`${row.line_id}: missing document_type`); count++; }
    if (!row.description_raw) { details.push(`${row.line_id}: missing description_raw`); count++; }
    if (row.quantity === undefined || row.quantity === null) {
      details.push(`${row.line_id}: missing quantity`); count++;
    }
    if (!row.reconciliation_status) { details.push(`${row.line_id}: missing reconciliation_status`); count++; }
  }

  return {
    gate: "GATE-1: FAIL",
    description: "Critical structural failures — missing required fields, schema errors",
    status: count === 0 ? "PASS" : "FAIL",
    count,
    expected: 0,
    details,
  };
}

/** GATE 2: BLOCKER — Blocking errors that prevent pipeline */
function gate2_blocker(recon: ReconciliationReport): GateResult {
  const details: string[] = [];
  let count = 0;

  for (const row of recon.reconciliation_rows) {
    // CONFLICT status is a hard blocker
    if (row.reconciliation_status === "CONFLICT") {
      details.push(`${row.line_id}: CONFLICT status — blocks pipeline`);
      count++;
    }
    // ERP_ONLY without source = blocker
    if (row.reconciliation_status === "ERP_ONLY") {
      details.push(`${row.line_id}: ERP_ONLY without source document — data integrity failure`);
      count++;
    }
    // Negative quantity
    if (typeof row.quantity === "number" && row.quantity < 0) {
      details.push(`${row.line_id}: negative quantity ${row.quantity}`);
      count++;
    }
    // Negative amount
    if (row.line_amount !== null && row.line_amount !== undefined && typeof row.line_amount === "number" && row.line_amount < 0) {
      details.push(`${row.line_id}: negative line amount ${row.line_amount}`);
      count++;
    }
    // Zero quantity on non-MATERIAL_REQUIREMENT
    if (row.quantity === 0 && row.document_type !== "MATERIAL_REQUIREMENT") {
      details.push(`${row.line_id}: zero quantity on ${row.document_type}`);
      count++;
    }
  }

  return {
    gate: "GATE-2: BLOCKER",
    description: "Blocking errors — conflicts, data integrity failures, negative values",
    status: count === 0 ? "PASS" : "FAIL",
    count,
    expected: 0,
    details,
  };
}

/** GATE 3: ORPHAN — Lines without parent source document */
function gate3_orphan(recon: ReconciliationReport, register: SourceRegister): GateResult {
  const details: string[] = [];
  let count = 0;

  // Build known source IDs from register
  const knownSourceIds = new Set(register.source_documents.map(d => d.source_id));
  // Build known line IDs from register
  const knownLineIds = new Set<string>();
  for (const doc of register.source_documents) {
    for (const line of doc.line_items) {
      knownLineIds.add(line.line_id);
    }
  }

  for (const row of recon.reconciliation_rows) {
    // Check parent source exists
    if (!knownSourceIds.has(row.source_id)) {
      details.push(`${row.line_id}: source_id '${row.source_id}' not found in source register`);
      count++;
    }
    // Check line exists in parent
    if (!knownLineIds.has(row.line_id)) {
      details.push(`${row.line_id}: not found in source register line items`);
      count++;
    }
  }

  // Check for lines in register not in reconciliation
  for (const doc of register.source_documents) {
    for (const line of doc.line_items) {
      const inRecon = recon.reconciliation_rows.some(r => r.line_id === line.line_id);
      if (!inRecon) {
        details.push(`Source line ${line.line_id} (${doc.source_id}) NOT in reconciliation — orphaned from register`);
        count++;
      }
    }
  }

  return {
    gate: "GATE-3: ORPHAN",
    description: "Orphaned lines — reconciliation rows without parent source document",
    status: count === 0 ? "PASS" : "FAIL",
    count,
    expected: 0,
    details,
  };
}

/** GATE 4: UNTRACED — Lines missing data lineage */
function gate4_untraced(recon: ReconciliationReport): GateResult {
  const details: string[] = [];
  let count = 0;

  const requiredLineageParts = ["ZIP:", "IMG:", "SRC-"];

  for (const row of recon.reconciliation_rows) {
    if (!row.lineage) {
      details.push(`${row.line_id}: missing lineage field`);
      count++;
      continue;
    }
    for (const part of requiredLineageParts) {
      if (!row.lineage.includes(part)) {
        details.push(`${row.line_id}: lineage missing '${part}' — "${row.lineage}"`);
        count++;
        break;
      }
    }
  }

  return {
    gate: "GATE-4: UNTRACED",
    description: "Untraced lines — missing complete data lineage (ZIP→IMG→SRC→LINE)",
    status: count === 0 ? "PASS" : "FAIL",
    count,
    expected: 0,
    details,
  };
}

/** GATE 5: AMOUNT_MISMATCH — Calculated vs source amount discrepancy */
function gate5_amount(recon: ReconciliationReport): GateResult {
  const details: string[] = [];
  let count = 0;
  let checked = 0;
  let skipped = 0;

  for (const row of recon.reconciliation_rows) {
    const qty = row.quantity;
    const upCk = row.unit_price_after_discount ?? row.unit_price;
    const srcAmt = row.line_amount;

    // Skip MATERIAL_REQUIREMENT (no price)
    if (row.document_type === "MATERIAL_REQUIREMENT") {
      skipped++;
      continue;
    }
    if (upCk === null || upCk === undefined || srcAmt === null || srcAmt === undefined) {
      skipped++;
      continue;
    }

    const calc = Math.round(qty * upCk);
    const delta = Math.abs(calc - srcAmt);

    checked++;
    // Allow up to 1 VND rounding tolerance
    if (delta > 1) {
      details.push(`${row.line_id}: qty=${qty} × price=${upCk} = ${calc.toLocaleString()} ≠ source=${srcAmt.toLocaleString()} (delta=${delta})`);
      count++;
    }
  }

  details.push(`Checked: ${checked} rows, Skipped (no price): ${skipped} rows`);

  return {
    gate: "GATE-5: AMOUNT_MISMATCH",
    description: "Amount mismatches — calculated vs source amount discrepancy > 1 VND",
    status: count === 0 ? "PASS" : "FAIL",
    count: count,
    expected: 0,
    details,
  };
}

/** GATE 6: ERP_CREATED — No premature ERP transactions */
function gate6_erp(recon: ReconciliationReport, register: SourceRegister): GateResult {
  const details: string[] = [];
  let count = 0;

  // Check summary
  if (recon.summary.erp_transactions_created !== 0) {
    details.push(`Summary reports ${recon.summary.erp_transactions_created} ERP transactions created — MUST be 0`);
    count++;
  }

  // Check each document
  for (const doc of register.source_documents) {
    if (doc.erp_transaction_created === true) {
      details.push(`${doc.source_id}: erp_transaction_created=true — BLOCKED, should be false`);
      count++;
    }
  }

  // Check each row
  for (const row of recon.reconciliation_rows) {
    if (row.erp_can_post === true) {
      details.push(`${row.line_id}: erp_can_post=true — BLOCKED, insufficient gates passed`);
      count++;
    }
  }

  return {
    gate: "GATE-6: ERP_CREATED",
    description: "Premature ERP transactions — no transactions allowed in Phase 4 ingestion",
    status: count === 0 ? "PASS" : "FAIL",
    count,
    expected: 0,
    details,
  };
}

/** INFORMATIONAL: Document classification summary */
function info_classification(register: SourceRegister): void {
  console.log("\n  Document Classifications:");
  for (const doc of register.source_documents) {
    const lineCount = doc.line_items.length;
    console.log(`    ${doc.source_id} [${doc.document_type_classified}] — ${lineCount} lines — img:${doc.source_image}`);
  }
}

/** INFORMATIONAL: Pending items requiring human action */
function info_pending(recon: ReconciliationReport): void {
  const pmPending = recon.reconciliation_rows.filter(r => r.product_match_status === "PRODUCT_MATCH_PENDING");
  const boqPending = recon.reconciliation_rows.filter(r => r.boq_match_status === "BOQ_MATCH_PENDING");
  const supPending = recon.reconciliation_rows.filter(r => ["PENDING_REVIEW","SUPPLIER_PENDING",null,""].includes(r.supplier));

  console.log("\n  Items Pending Human Action:");
  console.log(`    Product Master PENDING: ${pmPending.length}/16`);
  if (pmPending.length > 0) {
    pmPending.forEach(r => console.log(`      - ${r.line_id}: ${r.description_raw.substring(0, 40)}`));
  }
  console.log(`    BOQ link PENDING: ${boqPending.length}/16`);
  console.log(`    Supplier PENDING: ${supPending.length}/16`);
  console.log(`    Warehouse PENDING: ${recon.reconciliation_rows.length}/16 (all)`);
  console.log(`    ERP postable now: ${recon.summary.erp_postable_now}/16`);
}

// ─── MAIN ────────────────────────────────────────────────────────

function main(): void {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  BAO MINH CMT8 — MATERIAL INGESTION ACCEPTANCE SCRIPT");
  console.log("  Phase 4D — Gate Validation");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log(`  Project:   BAO-MINH-CMT8`);
  console.log(`  Timestamp: ${new Date().toISOString()}`);
  console.log(`  Recon:     ${RECON_FILE}`);
  console.log(`  Register:  ${REGISTER_FILE}`);
  console.log("═══════════════════════════════════════════════════════════════\n");

  const { recon, register } = load();

  console.log(`  [INFO] Phase: ${recon.phase}`);
  console.log(`  [INFO] Generated: ${recon.generated_at}`);
  console.log(`  [INFO] Total source documents: ${recon.summary.total_source_documents}`);
  console.log(`  [INFO] Total line items: ${recon.summary.total_line_items}`);

  info_classification(register);

  const results: GateResult[] = [
    gate1_fail(recon),
    gate2_blocker(recon),
    gate3_orphan(recon, register),
    gate4_untraced(recon),
    gate5_amount(recon),
    gate6_erp(recon, register),
  ];

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("  GATE RESULTS");
  console.log("═══════════════════════════════════════════════════════════════\n");

  let allPass = true;
  let passCount = 0;
  let failCount = 0;
  let warnCount = 0;

  for (const r of results) {
    const icon = r.status === "PASS" ? "✅" : r.status === "WARN" ? "⚠️" : "❌";
    const countStr = r.count === 0 ? "0" : `${r.count} issues`;
    console.log(`  ${icon} ${r.gate}`);
    console.log(`     ${r.description}`);
    console.log(`     Result: ${r.status} | Count: ${countStr} (expected: ${r.expected})`);

    if (r.details.length > 0) {
      for (const d of r.details) {
        const prefix = d.startsWith("Checked:") ? "     ℹ️" : r.status === "PASS" ? "     ℹ️" : "     ⚠️";
        console.log(`${prefix}  ${d}`);
      }
    }
    console.log();

    if (r.status === "PASS") passCount++;
    else if (r.status === "WARN") warnCount++;
    else { failCount++; allPass = false; }
  }

  info_pending(recon);

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("  ACCEPTANCE DECISION");
  console.log("═══════════════════════════════════════════════════════════════\n");

  console.log(`  PASS:    ${passCount} / ${results.length} gates`);
  console.log(`  WARN:    ${warnCount} / ${results.length} gates`);
  console.log(`  FAIL:    ${failCount} / ${results.length} gates`);
  console.log();

  if (allPass) {
    console.log("  ✅ ACCEPTANCE: PASS");
    console.log("  All gates passed. Ingestion pipeline validated.");
    console.log("  → Safe to proceed to HUMAN REVIEW of reconciliation report.");
    console.log("  → ERP posting remains BLOCKED pending human approval.");
    console.log();
    console.log("  NEXT STEPS (Human Actions Required):");
    console.log("  1. Confirm supplier: SOURCE-02 (likely Hồng Nghi — VCB GIA PHÚC)");
    console.log("  2. Confirm supplier: SOURCE-03/04 (likely An Cuong — mã 9205S)");
    console.log("  3. Classify SOURCE-03: GOODS_DELIVERY_NOTE or PURCHASE_RECEIPT?");
    console.log("  4. Confirm warehouse: kho Hồng Nghi / Tổng kho 1 / Xưởng Thuận Giao");
    console.log("  5. Add 9 PENDING items to Product Master");
    console.log("  6. Confirm GRN for SOURCE-02/04 after physical receipt");
    console.log("  7. Investigate: LDF E2 (SOURCE-04 L08/L09) not in SKP model");
    console.log("  8. Investigate: SOURCE-04 L05 discount=23% (outlier vs 6%)");
    console.log();

    // Write acceptance result
    const result = {
      acceptance: "PASS",
      timestamp: new Date().toISOString(),
      gates: results.map(r => ({ gate: r.gate, status: r.status, count: r.count })),
      next_action: "HUMAN_REVIEW",
      erp_cleared: false,
    };
    fs.writeFileSync(
      path.join(PROJ_DIR, "acceptance-result.json"),
      JSON.stringify(result, null, 2),
      "utf-8"
    );
    console.log(`  [ACCEPTANCE] Result written to ${PROJ_DIR}/acceptance-result.json`);

    process.exit(0);
  } else {
    console.log("  ❌ ACCEPTANCE: FAIL");
    console.log("  One or more gates failed. Pipeline MUST STOP.");
    console.log("  Fix all FAIL gates before proceeding.");
    console.log();

    const result = {
      acceptance: "FAIL",
      timestamp: new Date().toISOString(),
      gates: results.map(r => ({ gate: r.gate, status: r.status, count: r.count })),
      next_action: "FIX_FAILED_GATES",
      erp_cleared: false,
    };
    fs.writeFileSync(
      path.join(PROJ_DIR, "acceptance-result.json"),
      JSON.stringify(result, null, 2),
      "utf-8"
    );
    console.log(`  [ACCEPTANCE] Result written to ${PROJ_DIR}/acceptance-result.json`);

    process.exit(1);
  }
}

main();
