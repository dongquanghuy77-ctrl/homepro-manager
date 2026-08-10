// src/lib/etl/step4-schema-output.ts
// ═══════════════════════════════════════════════════════════════════════════════
// BƯỚC 4: JSON/SQL Schematization + Final Integrity Check
// ═══════════════════════════════════════════════════════════════════════════════

import type {
  RoutedLine, Zone, ETLOutput, OutputZone, OutputItem,
  ProjectMetadata, ValidationResult, ValidationError,
} from './types';

// ── Schema API chuẩn của HomePro Manager ─────────────────────────────────────
// Đây là danh sách field BẮT BUỘC trong từng OutputItem
const REQUIRED_ITEM_FIELDS: (keyof OutputItem)[] = [
  'systemIndex', 'zoneId', 'name', 'unit',
  'qty', 'unitPrice', 'total', 'supplyType',
  'needsBomLayer', 'routingEvidence', 'dimensions',
];

// Danh sách supplyType hợp lệ
const VALID_SUPPLY_TYPES = new Set(['HomePro_Production', 'Procurement_Commercial', 'Installation_Only']);
// Danh sách unit hợp lệ
const VALID_UNITS = new Set(['md', 'm2', 'm3', 'cai', 'he', 'bo', 'lo', 'kg', 'lit', 'set']);

// ════════════════════════════════════════════════════════════════════════════════
// CORE FUNCTION: Tổng hợp JSON đầu ra (Bước 4)
// ════════════════════════════════════════════════════════════════════════════════
export function buildOutput(
  routedLines: RoutedLine[],
  zones:       Zone[],
  metadata:    Partial<ProjectMetadata> & { sourceFile: string }
): ETLOutput {
  // ── Nhóm items theo zoneId ─────────────────────────────────────────────────
  const zoneMap = new Map<string, RoutedLine[]>();
  for (const line of routedLines) {
    const existing = zoneMap.get(line.zoneId) ?? [];
    existing.push(line);
    zoneMap.set(line.zoneId, existing);
  }

  // ── Xây dựng mảng OutputZone ───────────────────────────────────────────────
  const outputZones: OutputZone[] = [];
  for (const zone of zones) {
    const items = zoneMap.get(zone.zoneId) ?? [];
    const zoneTotal = items.reduce((s, i) => s + i.total, 0);

    const outputItems: OutputItem[] = items.map(line => ({
      systemIndex:      line.systemIndex,
      zoneId:           line.zoneId,
      name:             line.name,
      nameOriginal:     line.nameOriginal,
      wasAutoCorrected: line.wasAutoCorrected,
      unit:             line.unit,
      dimensions:       line.dimensions,
      qty:              line.qty,
      unitPrice:        line.unitPrice,
      total:            line.total,
      supplyType:       line.supplyType,
      needsBomLayer:    line.needsBomLayer,
      routingEvidence:  line.routingEvidence,
      material:         line.material,
      note:             line.note,
    }));

    if (outputItems.length > 0) {
      outputZones.push({
        zoneId:    zone.zoneId,
        zoneName:  zone.zoneName,
        zoneTotal,
        itemCount: outputItems.length,
        items:     outputItems,
      });
    }
  }

  // ── Tổng kết ──────────────────────────────────────────────────────────────
  const grandTotal    = outputZones.reduce((s, z) => s + z.zoneTotal, 0);
  const totalItems    = routedLines.length;
  const hpCount       = routedLines.filter(l => l.supplyType === 'HomePro_Production').length;
  const procCount     = routedLines.filter(l => l.supplyType === 'Procurement_Commercial').length;
  const installCount  = routedLines.filter(l => l.supplyType === 'Installation_Only').length;
  const corrected     = routedLines.filter(l => l.wasAutoCorrected).length;

  const projectMeta: ProjectMetadata = {
    projectCode:  metadata.projectCode  ?? 'HPM-' + Date.now(),
    projectName:  metadata.projectName  ?? 'Dự án chưa đặt tên',
    customer:     metadata.customer     ?? 'Chưa xác định',
    etlVersion:   '2.0.0',
    processedAt:  new Date().toISOString(),
    sourceFile:   metadata.sourceFile,
    totalZones:   outputZones.length,
    totalItems,
    grandTotal,
  };

  return {
    project_metadata: projectMeta,
    data_payload: { zones: outputZones },
    etl_summary: {
      step1_cleaned:        totalItems,
      step2_zones_created:  outputZones.length,
      step3_hp_production:  hpCount,
      step3_procurement:    procCount,
      step3_install_only:   installCount,
      step4_integrity_ok:   true,    // Sẽ cập nhật sau integrity check
      auto_corrected_names: corrected,
      index_repairs:        0,       // Sẽ được set bởi pipeline orchestrator
    },
  };
}

// ════════════════════════════════════════════════════════════════════════════════
// VALIDATION HOOK — BƯỚC 4: Final Integrity Check
// Đảm bảo JSON đầu ra 100% khớp Schema API HomePro Manager
// ════════════════════════════════════════════════════════════════════════════════
export function validateStep4(output: ETLOutput): ValidationResult {
  const errors: ValidationError[]  = [];
  const warnings: string[] = [];

  let totalItemsChecked = 0;
  let totalCalculated   = 0;
  const systemIndexes   = new Set<number>();
  const duplicateIndexes: number[] = [];

  // ── Kiểm tra project_metadata ─────────────────────────────────────────────
  if (!output.project_metadata.projectCode) {
    errors.push({ rowIndex: 0, field: 'projectCode', message: 'project_metadata.projectCode bị trống', value: null });
  }
  if (!output.project_metadata.etlVersion) {
    errors.push({ rowIndex: 0, field: 'etlVersion', message: 'etlVersion bị thiếu', value: null });
  }

  // ── Kiểm tra từng zone ────────────────────────────────────────────────────
  for (const zone of output.data_payload.zones) {
    if (!zone.zoneId || !zone.zoneId.match(/^ZN-[A-Z0-9]+-\d{2}(-\d+)?$/)) {
      errors.push({
        rowIndex: 0, field: 'zoneId',
        message:  `Zone "${zone.zoneName}": zoneId "${zone.zoneId}" không đúng format ZN-XXX-NN`,
        value:    zone.zoneId,
      });
    }

    if (zone.items.length === 0) {
      warnings.push(`Zone "${zone.zoneName}" (${zone.zoneId}) không có item nào`);
    }

    // ── Kiểm tra từng item ─────────────────────────────────────────────────
    let zoneCalcTotal = 0;
    for (const item of zone.items) {
      totalItemsChecked++;
      zoneCalcTotal += item.total;

      // Kiểm tra required fields
      for (const field of REQUIRED_ITEM_FIELDS) {
        const value = item[field];
        if (value === undefined || value === null || value === '') {
          errors.push({
            rowIndex: item.systemIndex,
            field:    String(field),
            message:  `Item systemIndex=${item.systemIndex} "${item.name}": trường "${String(field)}" bị thiếu hoặc null`,
            value,
          });
        }
      }

      // Kiểm tra supplyType hợp lệ
      if (!VALID_SUPPLY_TYPES.has(item.supplyType)) {
        errors.push({
          rowIndex: item.systemIndex, field: 'supplyType',
          message:  `supplyType="${item.supplyType}" không hợp lệ (phải là HomePro_Production|Procurement_Commercial|Installation_Only)`,
          value:    item.supplyType,
        });
      }

      // Kiểm tra unit hợp lệ
      if (!VALID_UNITS.has(item.unit)) {
        warnings.push(`systemIndex=${item.systemIndex} "${item.name}": unit="${item.unit}" không trong danh sách chuẩn`);
      }

      // Kiểm tra thành tiền = qty × unitPrice (tolerance 1 VNĐ)
      const expectedTotal = Math.round(item.qty * item.unitPrice * 100) / 100;
      if (Math.abs(item.total - expectedTotal) > 1) {
        errors.push({
          rowIndex: item.systemIndex, field: 'total',
          message:  `Lỗi thành tiền: ${item.total} ≠ ${item.qty} × ${item.unitPrice} = ${expectedTotal}`,
          value:    item.total,
        });
      }

      // Kiểm tra systemIndex duy nhất
      if (systemIndexes.has(item.systemIndex)) {
        duplicateIndexes.push(item.systemIndex);
        errors.push({
          rowIndex: item.systemIndex, field: 'systemIndex',
          message:  `systemIndex=${item.systemIndex} bị TRÙNG LẶP — vi phạm ràng buộc unique key`,
          value:    item.systemIndex,
        });
      }
      systemIndexes.add(item.systemIndex);

      // Kiểm tra Procurement/Installation không được có needsBomLayer = true
      if (item.supplyType !== 'HomePro_Production' && item.needsBomLayer) {
        errors.push({
          rowIndex: item.systemIndex, field: 'needsBomLayer',
          message:  `CRITICAL: "${item.name}" (${item.supplyType}) có needsBomLayer=true → sẽ lọt vào CNC queue!`,
          value:    { supplyType: item.supplyType, needsBomLayer: item.needsBomLayer },
        });
      }
    }

    // Kiểm tra zoneTotal chính xác
    const diff = Math.abs(zone.zoneTotal - zoneCalcTotal);
    if (diff > 1) {
      warnings.push(`Zone "${zone.zoneName}": zoneTotal=${zone.zoneTotal} ≠ sum(items.total)=${zoneCalcTotal} (chênh ${diff})`);
    }

    totalCalculated += zoneCalcTotal;
  }

  // Kiểm tra grandTotal
  const metaTotal = output.project_metadata.grandTotal;
  if (Math.abs(metaTotal - totalCalculated) > 1) {
    warnings.push(`grandTotal=${metaTotal} ≠ tổng tính lại=${totalCalculated} (chênh ${Math.abs(metaTotal - totalCalculated)})`);
  }

  // Cập nhật flag trong output
  output.etl_summary.step4_integrity_ok = errors.length === 0;

  return {
    step:    4,
    passed:  errors.length === 0,
    errors,
    warnings,
    stats: {
      totalZones:          output.data_payload.zones.length,
      totalItemsChecked,
      grandTotal:          totalCalculated,
      duplicateSystemIndex: duplicateIndexes.length,
      schemaCompliant:      errors.length === 0 ? 'YES ✅' : `NO ❌ (${errors.length} lỗi)`,
    },
  };
}

// ── Helper: Xuất SQL INSERT statements từ output ─────────────────────────────
export function generateSqlInserts(output: ETLOutput): string {
  const lines: string[] = [
    `-- HomePro ETL Export — ${output.project_metadata.processedAt}`,
    `-- Project: ${output.project_metadata.projectName}`,
    `-- Generated by ETL Pipeline v${output.project_metadata.etlVersion}`,
    '',
  ];

  for (const zone of output.data_payload.zones) {
    lines.push(`-- Zone: ${zone.zoneName} (${zone.zoneId})`);
    for (const item of zone.items) {
      const dimJson = JSON.stringify(item.dimensions).replace(/'/g, "''");
      lines.push(
        `INSERT INTO production_bom_lines ` +
        `(project_id, zone_id, zone_name, product_name, unit, qty, unit_price, total, supply_type, note, stt_in_zone) VALUES ` +
        `(:projectId, '${item.zoneId}', '${zone.zoneName.replace(/'/g, "''")}', ` +
        `'${item.name.replace(/'/g, "''")}', '${item.unit}', ${item.qty}, ${item.unitPrice}, ${item.total}, ` +
        `'${item.supplyType}', '${item.note.replace(/'/g, "''")}', ${item.systemIndex});`
      );
    }
    lines.push('');
  }

  return lines.join('\n');
}
