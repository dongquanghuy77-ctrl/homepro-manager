// src/lib/etl/pipeline.ts
// ═══════════════════════════════════════════════════════════════════════════════
// HomePro ETL Pipeline Orchestrator — Điều phối 4 bước tuần tự
// ═══════════════════════════════════════════════════════════════════════════════

import type { RawInputLine, ETLOutput, ValidationResult } from './types';
import { cleanLines,         validateStep1 } from './step1-cleaner';
import { mapZones,           validateStep2 } from './step2-zone-mapper';
import { routeSupplyChain,   validateStep3, runStep3SimulationTest } from './step3-supply-router';
import { buildOutput,        validateStep4, generateSqlInserts } from './step4-schema-output';

export interface PipelineResult {
  success:     boolean;
  output?:     ETLOutput;
  sqlInserts?: string;
  steps:       Array<{ step: number; name: string; result: ValidationResult }>;
  abortedAt?:  number;    // Bước dừng lại nếu có lỗi
  errorSummary?: string;
}

export interface PipelineOptions {
  projectCode?:  string;
  projectName?:  string;
  customer?:     string;
  sourceFile?:   string;
  generateSql?:  boolean;
  stopOnError?:  boolean;   // Nếu true: dừng pipeline khi bất kỳ bước nào fail
}

// ════════════════════════════════════════════════════════════════════════════════
// MAIN FUNCTION: Chạy ETL Pipeline 4 bước
// ════════════════════════════════════════════════════════════════════════════════
export async function runETLPipeline(
  rawLines:  RawInputLine[],
  options:   PipelineOptions = {}
): Promise<PipelineResult> {

  const {
    projectCode  = 'HPM-' + new Date().getFullYear(),
    projectName  = 'Dự án chưa đặt tên',
    customer     = '',
    sourceFile   = 'unknown',
    generateSql  = false,
    stopOnError  = true,
  } = options;

  const stepResults: Array<{ step: number; name: string; result: ValidationResult }> = [];

  // ═══════════════════════════════════════════════════════════════════════════
  // ── BƯỚC 1: Text Cleaning & Levenshtein Autocorrect ────────────────────
  // ═══════════════════════════════════════════════════════════════════════════
  const cleaned       = cleanLines(rawLines);
  const step1Validate = validateStep1(cleaned);
  stepResults.push({ step: 1, name: 'Text Cleaning & Levenshtein', result: step1Validate });

  if (!step1Validate.passed && stopOnError) {
    return {
      success:     false,
      steps:       stepResults,
      abortedAt:   1,
      errorSummary: `BƯỚC 1 THẤT BẠI: ${step1Validate.errors.length} lỗi — ${step1Validate.errors.map(e => e.message).join(' | ')}`,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ── BƯỚC 2: Zone Mapping + Index Repair ─────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════
  const { zonedLines, zones, duplicateSttMap, indexRepairCount } = mapZones(cleaned);
  const step2Validate = validateStep2(zonedLines, zones, duplicateSttMap);
  stepResults.push({ step: 2, name: 'Zone Mapping Engine', result: step2Validate });

  if (!step2Validate.passed && stopOnError) {
    return {
      success:     false,
      steps:       stepResults,
      abortedAt:   2,
      errorSummary: `BƯỚC 2 THẤT BẠI: ${step2Validate.errors.length} lỗi — ${step2Validate.errors.map(e => e.message).join(' | ')}`,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ── BƯỚC 3: Supply Chain Routing ────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════
  const routedLines   = routeSupplyChain(zonedLines);
  const step3Validate = validateStep3(routedLines);
  stepResults.push({ step: 3, name: 'Supply Chain Routing', result: step3Validate });

  if (!step3Validate.passed && stopOnError) {
    return {
      success:     false,
      steps:       stepResults,
      abortedAt:   3,
      errorSummary: `BƯỚC 3 THẤT BẠI: ${step3Validate.errors.length} lỗi — ${step3Validate.errors.map(e => e.message).join(' | ')}`,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ── BƯỚC 4: JSON Schema Output + Final Integrity Check ──────────────────
  // ═══════════════════════════════════════════════════════════════════════════
  const output = buildOutput(routedLines, zones, { projectCode, projectName, customer, sourceFile });
  output.etl_summary.index_repairs = indexRepairCount;

  const step4Validate = validateStep4(output);
  stepResults.push({ step: 4, name: 'JSON Schema & Final Integrity', result: step4Validate });

  const allPassed = stepResults.every(s => s.result.passed);

  const result: PipelineResult = {
    success: allPassed,
    output,
    steps:   stepResults,
  };

  if (generateSql) {
    result.sqlInserts = generateSqlInserts(output);
  }

  if (!allPassed) {
    const failedSteps = stepResults.filter(s => !s.result.passed);
    result.errorSummary = failedSteps
      .map(s => `Bước ${s.step}: ${s.result.errors.length} lỗi`)
      .join(', ');
  }

  return result;
}

// ── API route helper — sử dụng trong /api/bom/import ─────────────────────────
export { runStep3SimulationTest };
