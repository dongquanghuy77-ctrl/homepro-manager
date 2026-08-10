// src/lib/etl/step3-supply-router.ts
// ═══════════════════════════════════════════════════════════════════════════════
// BƯỚC 3: Supply Chain Routing Logic — Phân loại định tuyến chuỗi cung ứng
// ═══════════════════════════════════════════════════════════════════════════════

import type {
  ZonedLine, RoutedLine, SupplyType, ValidationResult, ValidationError,
} from './types';

// ── Normalize chuỗi để so sánh pattern ───────────────────────────────────────
function norm(s: string): string {
  return s.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .trim();
}

// ════════════════════════════════════════════════════════════════════════════════
// RULE ENGINE — 3 lớp phân loại theo độ ưu tiên
// ════════════════════════════════════════════════════════════════════════════════

// ── LAYER 1: Installation_Only — CĐT cấp, chỉ thi công lắp đặt ──────────────
const INSTALLATION_ONLY_RULES: Array<{ pattern: RegExp; evidence: string }> = [
  { pattern: /cdt|c\.d\.t|chu dau tu|chủ đầu tư/i,            evidence: 'Từ khóa "CĐT cấp" trong ghi chú' },
  { pattern: /khach hang cap|kh cap|khách hàng cấp/i,          evidence: 'Khách hàng tự cấp vật tư' },
  { pattern: /do cdt|đồ cđt|vat tu cdt/i,                      evidence: 'Vật tư do CĐT cấp' },
  { pattern: /khong thuc hien|không thực hiện|not include/i,    evidence: 'Hạng mục không thực hiện' },
  { pattern: /ve sinh cong nghiep|vệ sinh công nghiệp/i,        evidence: 'Dịch vụ vệ sinh' },
  { pattern: /thi cong lien ket|thi cong thep|co khi/i,         evidence: 'Hạng mục cơ khí/thép' },
];

// ── LAYER 2: Procurement_Commercial — Mua ngoài thương mại ───────────────────
const PROCUREMENT_RULES: Array<{ pattern: RegExp; evidence: string }> = [
  // Nội thất rời thương mại
  { pattern: /\bsofa\b|ghế sofa|sofa văng|sectional/i,          evidence: 'Sofa thương mại' },
  { pattern: /giường ngủ|bed frame|nội thất giường/i,            evidence: 'Giường ngủ thương mại' },
  { pattern: /bàn ăn|dining table|bàn sofa|coffee table/i,       evidence: 'Bàn nội thất thương mại' },
  { pattern: /ghế ăn|dining chair/i,                             evidence: 'Ghế ăn thương mại' },
  { pattern: /tranh treo|artwork|decor|decorative/i,             evidence: 'Đồ decor thương mại' },
  // Thiết bị điện
  { pattern: /quạt trần|quạt đứng|fan ceiling|ceiling fan/i,     evidence: 'Quạt điện thương mại' },
  { pattern: /đèn chùm|đèn thả|chandelier|pendant light/i,       evidence: 'Đèn thương mại (loại trừ đèn LED dải)' },
  { pattern: /điều hoà|máy lạnh|air conditioner|ac unit/i,       evidence: 'Máy điều hòa thương mại' },
  { pattern: /máy giặt|tủ lạnh|lò vi sóng|refrigerator/i,        evidence: 'Thiết bị gia dụng thương mại' },
  // Thiết bị vệ sinh
  { pattern: /bồn cầu|lavabo|shower|vòi hoa sen|toilet bowl/i,   evidence: 'Thiết bị vệ sinh thương mại' },
  { pattern: /bồn tắm|bathtub|jacuzzi/i,                         evidence: 'Bồn tắm thương mại' },
  // Vật tư xây dựng mua ngoài
  { pattern: /gạch ốp|gạch lát|ceramic tile|đá granite/i,        evidence: 'Vật liệu ốp lát mua ngoài' },
  { pattern: /sơn tường|paint|latex|dulux|jotun/i,               evidence: 'Sơn thương mại' },
  { pattern: /kính cường lực thương mại|mirror glass/i,           evidence: 'Kính thương mại' },
  // Khác
  { pattern: /mua ngoai|mua thương mại|hàng có sẵn/i,            evidence: 'Ghi chú mua ngoài' },
  { pattern: /rèm|curtain|blinds|màn cửa/i,                      evidence: 'Rèm cửa thương mại' },
];

// ── LAYER 3: HomePro_Production — Gia công ván tại xưởng ─────────────────────
// Vật liệu ván công nghiệp cần gia công CNC
const PRODUCTION_MATERIAL_RULES: Array<{ pattern: RegExp; evidence: string }> = [
  { pattern: /\bmdf\b|medium density/i,                           evidence: 'Ván MDF gia công xưởng' },
  { pattern: /\bmfc\b|melamine faced/i,                           evidence: 'Ván MFC gia công xưởng' },
  { pattern: /melamine|mÊlamine/i,                                evidence: 'Ván phủ Melamine gia công xưởng' },
  { pattern: /laminate|formica|hpl/i,                             evidence: 'Ván phủ Laminate gia công xưởng' },
  { pattern: /acrylic|mica|acm/i,                                 evidence: 'Mặt phủ Acrylic gia công xưởng' },
  { pattern: /plywood|ply wood|multi-layer/i,                     evidence: 'Ván dán/Plywood gia công xưởng' },
  { pattern: /gỗ tự nhiên|solid wood|gỗ óc chó|gỗ sồi/i,         evidence: 'Gỗ tự nhiên gia công xưởng' },
];

// Tên sản phẩm cần gia công (ngay cả khi không ghi vật liệu)
const PRODUCTION_NAME_RULES: Array<{ pattern: RegExp; evidence: string }> = [
  { pattern: /tủ bếp|tu bep|kitchen cabinet/i,                   evidence: 'Tủ bếp → gia công xưởng' },
  { pattern: /tủ quần áo|tu quan ao|wardrobe/i,                   evidence: 'Tủ quần áo → gia công xưởng' },
  { pattern: /tủ đầu giường|nightstand|tu dau giuong/i,           evidence: 'Tủ đầu giường → gia công xưởng' },
  { pattern: /tủ giày|shoe cabinet/i,                             evidence: 'Tủ giày → gia công xưởng' },
  { pattern: /kệ tường|wall shelf|floating shelf/i,               evidence: 'Kệ tường → gia công xưởng' },
  { pattern: /vách ngăn|partition|vach ngan/i,                    evidence: 'Vách ngăn → gia công xưởng' },
  { pattern: /cửa bật|cửa lùa|cua bat|cua lua/i,                  evidence: 'Cửa gỗ → gia công xưởng' },
  { pattern: /bàn làm việc|work desk|ban lam viec/i,              evidence: 'Bàn làm việc → gia công xưởng' },
  { pattern: /lèn chân tường|len chan tuong|baseboard/i,           evidence: 'Lèn chân tường → gia công xưởng' },
  { pattern: /ốp tường gỗ|wall panel|panel gỗ/i,                  evidence: 'Ốp tường gỗ → gia công xưởng' },
];

// ════════════════════════════════════════════════════════════════════════════════
// CORE FUNCTION: Phân loại cung ứng từng dòng
// ════════════════════════════════════════════════════════════════════════════════
export function classifySupplyRoute(line: ZonedLine): {
  supplyType:      SupplyType;
  needsBomLayer:   boolean;
  routingEvidence: string;
} {
  const nameNorm     = norm(line.name);
  const noteNorm     = norm(line.note);
  const materialNorm = norm(line.material);
  const combined     = `${nameNorm} ${noteNorm} ${materialNorm}`;

  // PRIORITY 1: Kiểm tra Installation_Only
  for (const rule of INSTALLATION_ONLY_RULES) {
    if (rule.pattern.test(combined) || rule.pattern.test(line.note) || rule.pattern.test(line.name)) {
      return { supplyType: 'Installation_Only', needsBomLayer: false, routingEvidence: rule.evidence };
    }
  }

  // PRIORITY 2: Kiểm tra Procurement_Commercial
  for (const rule of PROCUREMENT_RULES) {
    if (rule.pattern.test(combined) || rule.pattern.test(line.name) || rule.pattern.test(line.note)) {
      return { supplyType: 'Procurement_Commercial', needsBomLayer: false, routingEvidence: rule.evidence };
    }
  }

  // PRIORITY 3: Kiểm tra vật liệu gia công
  for (const rule of PRODUCTION_MATERIAL_RULES) {
    if (rule.pattern.test(materialNorm) || rule.pattern.test(combined)) {
      return { supplyType: 'HomePro_Production', needsBomLayer: true, routingEvidence: rule.evidence };
    }
  }

  // PRIORITY 4: Kiểm tra tên sản phẩm cần gia công
  for (const rule of PRODUCTION_NAME_RULES) {
    if (rule.pattern.test(nameNorm) || rule.pattern.test(line.name)) {
      return { supplyType: 'HomePro_Production', needsBomLayer: true, routingEvidence: rule.evidence };
    }
  }

  // Default: HomePro Production nếu không khớp pattern nào (phần lớn là nội thất xưởng)
  return {
    supplyType:      'HomePro_Production',
    needsBomLayer:   true,
    routingEvidence: 'Mặc định: không khớp từ khóa mua ngoài → gia công xưởng',
  };
}

export function routeSupplyChain(zonedLines: ZonedLine[]): RoutedLine[] {
  return zonedLines.map(line => {
    const { supplyType, needsBomLayer, routingEvidence } = classifySupplyRoute(line);
    return { ...line, supplyType, needsBomLayer, routingEvidence };
  });
}

// ════════════════════════════════════════════════════════════════════════════════
// VALIDATION HOOK — BƯỚC 3
// Điều kiện: Procurement/Installation_Only KHÔNG được có needsBomLayer = true
//            (không để hàng mua ngoài lọt vào danh sách lệnh cắt ván CNC)
// ════════════════════════════════════════════════════════════════════════════════
export function validateStep3(routedLines: RoutedLine[]): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: string[] = [];

  let hpCount   = 0, procCount = 0, installCount = 0;
  let bomLayerCount = 0;

  for (const line of routedLines) {
    switch (line.supplyType) {
      case 'HomePro_Production':      hpCount++;      break;
      case 'Procurement_Commercial':  procCount++;     break;
      case 'Installation_Only':       installCount++;  break;
    }
    if (line.needsBomLayer) bomLayerCount++;

    // CRITICAL: hàng mua ngoài KHÔNG được có needsBomLayer = true
    if (line.supplyType !== 'HomePro_Production' && line.needsBomLayer) {
      errors.push({
        rowIndex: line.rowIndex,
        field:    'needsBomLayer',
        message:  `CRITICAL — Dòng ${line.rowIndex} "${line.name}": supply_type="${line.supplyType}" nhưng needsBomLayer=true. Sẽ bị đẩy sai vào lệnh cắt CNC!`,
        value:    { supplyType: line.supplyType, needsBomLayer: line.needsBomLayer },
      });
    }

    // Cảnh báo: item giá 0 nhưng là HP_Production
    if (line.supplyType === 'HomePro_Production' && line.unitPrice === 0) {
      warnings.push(`Dòng ${line.rowIndex} "${line.name}": HomePro_Production nhưng đơn giá = 0. Kiểm tra lại dự toán.`);
    }
  }

  const total = routedLines.length;
  return {
    step:    3,
    passed:  errors.length === 0,
    errors,
    warnings,
    stats: {
      total,
      HomePro_Production:      hpCount,
      Procurement_Commercial:  procCount,
      Installation_Only:       installCount,
      needsBomLayer:           bomLayerCount,
      hp_pct:                  total > 0 ? `${Math.round(hpCount / total * 100)}%` : '0%',
      proc_pct:                total > 0 ? `${Math.round(procCount / total * 100)}%` : '0%',
    },
  };
}

// ════════════════════════════════════════════════════════════════════════════════
// UNIT TEST MÔ PHỎNG (Bước 3 — Giả lập tủ bếp + quạt trần)
// ════════════════════════════════════════════════════════════════════════════════
export function runStep3SimulationTest(): { passed: boolean; details: string[] } {
  const details: string[] = [];
  let allPass = true;

  const testCases: Array<{
    name: string; material: string; note: string;
    expectedType: SupplyType; expectedBom: boolean;
  }> = [
    // TỦ BẾP → phải là HomePro_Production + BOM layer
    { name: 'Tủ bếp trên phủ Acrylic', material: 'MDF phủ Acrylic', note: '',
      expectedType: 'HomePro_Production', expectedBom: true },
    { name: 'Tủ bếp dưới MFC Melamine', material: 'MFC Melamine', note: '',
      expectedType: 'HomePro_Production', expectedBom: true },
    { name: 'Tủ quần áo MDF Laminate', material: 'MDF phủ Laminate', note: '',
      expectedType: 'HomePro_Production', expectedBom: true },
    // QUẠT TRẦN THƯƠNG MẠI → phải là Procurement, KHÔNG có BOM
    { name: 'Quạt trần Panasonic', material: '', note: 'Mua ngoài',
      expectedType: 'Procurement_Commercial', expectedBom: false },
    { name: 'Sofa văng 3 chỗ', material: '', note: '',
      expectedType: 'Procurement_Commercial', expectedBom: false },
    // CĐT CẤP → Installation_Only
    { name: 'Rèm cửa phòng khách', material: '', note: 'CĐT cấp',
      expectedType: 'Installation_Only', expectedBom: false },
    { name: 'Điều hòa Daikin 9000BTU', material: '', note: 'CĐT tự cấp thiết bị',
      expectedType: 'Installation_Only', expectedBom: false },
    // VỆ SINH CÔNG NGHIỆP → Installation_Only
    { name: 'Vệ sinh công nghiệp sau thi công', material: '', note: '',
      expectedType: 'Installation_Only', expectedBom: false },
    // CỬA GỖ XƯỞNG → HomePro_Production
    { name: 'Cửa bật phòng ngủ', material: 'Gỗ tự nhiên', note: '',
      expectedType: 'HomePro_Production', expectedBom: true },
    // NẸP T INOX → Production (mặc định)
    { name: 'Nẹp T inox 304', material: 'Inox 304', note: '',
      expectedType: 'HomePro_Production', expectedBom: true },
  ];

  for (const tc of testCases) {
    const mockLine: ZonedLine = {
      rowIndex: 0, systemIndex: 0, rawStt: '1',
      name: tc.name, nameOriginal: tc.name, wasAutoCorrected: false,
      unit: 'cai', dimensions: { raw: '' }, qty: 1, unitPrice: 0, total: 0,
      note: tc.note, material: tc.material, isZoneHeader: false,
      zoneId: 'ZN-TEST-01', zoneName: 'Test Zone',
    };

    const { supplyType, needsBomLayer, routingEvidence } = classifySupplyRoute(mockLine);
    const typeOk = supplyType === tc.expectedType;
    const bomOk  = needsBomLayer === tc.expectedBom;
    const pass   = typeOk && bomOk;

    if (!pass) allPass = false;

    details.push(
      `${pass ? '✅' : '❌'} "${tc.name}": ` +
      `type=${supplyType}(exp:${tc.expectedType}), ` +
      `bom=${needsBomLayer}(exp:${tc.expectedBom}) → ${routingEvidence}`
    );
  }

  return { passed: allPass, details };
}
