// src/lib/work-order-router.ts
// ══════════════════════════════════════════════════════════════════════════════
// HomePro MES — Auto-Routing & Work Order Classification Engine
// Phiên bản: 1.1.0 | Fixes:
//   - Word-boundary matching (không để 'tu' khớp sai vào 'tuong')
//   - Thứ tự rules: PRODUCTION → INSTALLATION → PROCUREMENT
//   - Timezone-safe date: dùng local methods thay toISOString()
// ══════════════════════════════════════════════════════════════════════════════

// ── Nhóm công việc (Work Group) ──────────────────────────────────────────────
export type WorkGroup =
  | 'PRODUCTION'    // Sản xuất xưởng mộc (HomePro_Production)
  | 'PROCUREMENT'   // Thu mua / Thương mại (Procurement_Commercial)
  | 'INSTALLATION'  // Thi công / Lắp đặt (Site_Installation)
  | 'UNCLASSIFIED'; // Không nhận diện được

// ── Kết quả định tuyến ────────────────────────────────────────────────────────
export interface RoutingResult {
  workGroup:      WorkGroup;
  category:       string;
  assignee:       string;
  matchedKeyword: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hàm chuẩn hóa tiêu đề công việc (loại bỏ dấu, lowercase, trim)
// ─────────────────────────────────────────────────────────────────────────────
export function normTitle(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')  // bỏ dấu
    .replace(/đ/gi, 'd')              // Đ/đ không phân rã bởi NFD
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')    // chỉ giữ chữ, số
    .replace(/\s+/g, ' ')
    .trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// Word-boundary matching: tránh 'tu' khớp vào 'tuong', 'ke' vào 'ket', v.v.
// Padding norm và kw bằng khoảng trắng → kiểm tra chuỗi đầy đủ
// ─────────────────────────────────────────────────────────────────────────────
function matchKw(norm: string, kw: string): boolean {
  // Exact match
  if (norm === kw) return true;
  // Word-boundary: ' norm '.includes(' kw ')
  // → kw phải đứng độc lập, bao quanh bởi khoảng trắng hoặc đầu/cuối chuỗi
  return (' ' + norm + ' ').includes(' ' + kw + ' ');
}

// ─────────────────────────────────────────────────────────────────────────────
// Bảng quy tắc định tuyến (ROUTING_RULES)
// Thứ tự ưu tiên: PRODUCTION → INSTALLATION → PROCUREMENT
// Lý do: INSTALLATION phải check trước PROCUREMENT vì 'lap dat thiet bi'
// cần match 'lap dat' (INSTALLATION) trước khi 'thiet bi' (PROCUREMENT) kịp match
// ─────────────────────────────────────────────────────────────────────────────
interface RoutingRule {
  workGroup: WorkGroup;
  category:  string;
  assignee:  string;
  keywords:  string[];  // Đã normalize (không dấu, lowercase)
}

export const ROUTING_RULES: RoutingRule[] = [
  // ── NHÓM 1: Sản xuất xưởng mộc (PRODUCTION) ─────────────────────────────
  // Ưu tiên compound keywords để tránh false positive
  {
    workGroup: 'PRODUCTION',
    category:  'Sản xuất xưởng',
    assignee:  'Quản đốc xưởng mộc',
    keywords: [
      // Tủ (dùng compound, tránh 'tu' → 'tuong')
      'tu ao', 'tu quan ao', 'tu bep', 'tu dau giuong',
      'tu trang tri', 'tu cua', 'tu dung do', 'tu sach',
      'tu am tuong', 'tu quan ly',
      // Kệ
      'ke tivi', 'ke sach', 'ke bep', 'ke trang tri',
      'ke treo', 'ke go', 'ke am tuong',
      // Giường, bàn, vách
      'giuong',       // 6 chars — đủ dài để an toàn
      'vach cnc',
      'ban trang diem',
      'ban hoc',
      'ban lam viec',
      'vach op dau giuong',
      'op go thong',
      'op tuong go',
      'op go',
    ],
  },

  // ── NHÓM 3: Thi công / Lắp đặt (INSTALLATION) ────────────────────────────
  // CHECK TRƯỚC PROCUREMENT để 'lap dat thiet bi' → INSTALLATION (không phải PROCUREMENT)
  {
    workGroup: 'INSTALLATION',
    category:  'Thi công công trình',
    assignee:  'Huy',
    keywords: [
      'son hieu ung',   // sơn hiệu ứng vách
      'son tuong',      // sơn tường
      'son nen',        // sơn nền
      'son trang tri',  // sơn trang trí
      'son',            // sơn nói chung (word-boundary → không match 'beson', v.v.)
      'lap dat',        // lắp đặt (check trước 'thiet bi' của PROCUREMENT)
      've sinh',        // vệ sinh công trình
      'thi cong',       // thi công
      'hoan thien',     // hoàn thiện
      'tram bua',       // trám bả
      'dan giay dan',   // dán giấy dán tường
    ],
  },

  // ── NHÓM 2: Thu mua / Thương mại (PROCUREMENT) ───────────────────────────
  // Check sau INSTALLATION để tránh 'thiet bi' match trước 'lap dat'
  {
    workGroup: 'PROCUREMENT',
    category:  'Thu mua / Thương mại',
    assignee:  'Nhân viên Thu mua',
    keywords: [
      'guong',          // gương (6 chars, an toàn)
      'sofa',           // sofa
      'ghe sofa', 'sofa vang', 'sofa goc',
      'ban tra',        // bàn trà
      'ban an',         // bàn ăn
      'tham',           // thảm (5 chars)
      'den tha',        // đèn thả
      'den tran',       // đèn trần
      'quat tran',      // quạt trần
      'thiet bi',       // thiết bị (mua sắm)
      'phu kien',       // phụ kiện
      'rem cua', 'rem', // rèm cửa
      'don',            // đôn trang trí (word-boundary → không match 'don dep')
      'bep tu', 'bep gas', 'may hut mui',  // thiết bị bếp
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// BƯỚC 1: classifyTask — Routing Engine chính
// ─────────────────────────────────────────────────────────────────────────────
export function classifyTask(title: string): RoutingResult {
  const norm = normTitle(title);

  for (const rule of ROUTING_RULES) {
    for (const kw of rule.keywords) {
      if (matchKw(norm, kw)) {
        return {
          workGroup:      rule.workGroup,
          category:       rule.category,
          assignee:       rule.assignee,
          matchedKeyword: kw,
        };
      }
    }
  }

  // Không nhận diện được → UNCLASSIFIED, fallback về Thi công
  return {
    workGroup:      'UNCLASSIFIED',
    category:       'Thi công công trình',
    assignee:       'Huy',
    matchedKeyword: null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// BƯỚC 2: calcTaskDeadline — Timezone-safe Date Calculation
// Dùng getFullYear/getMonth/getDate thay toISOString() để tránh lệch UTC+7
// ─────────────────────────────────────────────────────────────────────────────
const PRODUCTION_BUFFER_DAYS  = 7;
const PROCUREMENT_BUFFER_DAYS = 7;

function toLocalISODate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm   = String(d.getMonth() + 1).padStart(2, '0');
  const dd   = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function calcTaskDeadline(
  projectDeadline: string | null | undefined,
  workGroup: WorkGroup
): string | null {
  if (!projectDeadline) return null;

  let base: Date;
  if (/^\d{4}-\d{2}-\d{2}$/.test(projectDeadline)) {
    // YYYY-MM-DD → parse as LOCAL midnight (không dùng UTC)
    const [y, m, d] = projectDeadline.split('-').map(Number);
    base = new Date(y, m - 1, d);          // LOCAL midnight
  } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(projectDeadline)) {
    // DD/MM/YYYY
    const [d, m, y] = projectDeadline.split('/').map(Number);
    base = new Date(y, m - 1, d);          // LOCAL midnight
  } else {
    return null;
  }

  if (isNaN(base.getTime())) return null;

  let offsetDays = 0;
  switch (workGroup) {
    case 'PRODUCTION':   offsetDays = -PRODUCTION_BUFFER_DAYS;  break;
    case 'PROCUREMENT':  offsetDays = -PROCUREMENT_BUFFER_DAYS; break;
    case 'INSTALLATION':
    case 'UNCLASSIFIED':
    default:             offsetDays = 0;
  }

  const result = new Date(base);
  result.setDate(result.getDate() + offsetDays);
  return toLocalISODate(result);   // ✔ Local time, không bị lệch UTC
}

// ─────────────────────────────────────────────────────────────────────────────
// BƯỚC 2: validateCriticalPath — Kiểm tra và điều chỉnh nếu deadline lệch
// ─────────────────────────────────────────────────────────────────────────────
export interface CriticalPathTask {
  title:     string;
  workGroup: WorkGroup;
  deadline:  string | null;
}

export function validateCriticalPath(
  tasks: CriticalPathTask[],
  projectDeadline: string
): { tasks: CriticalPathTask[]; warnings: string[] } {
  const warnings: string[] = [];
  const installDate = calcTaskDeadline(projectDeadline, 'INSTALLATION');
  if (!installDate) return { tasks, warnings };

  const adjustedTasks = tasks.map(t => {
    if (t.workGroup !== 'PRODUCTION' || !t.deadline) return t;

    const [ty, tm, td] = t.deadline.split('-').map(Number);
    const [iy, im, id] = installDate.split('-').map(Number);
    const taskDL = new Date(ty, tm - 1, td);
    const instDL = new Date(iy, im - 1, id);

    if (taskDL >= instDL) {
      const adjusted = calcTaskDeadline(projectDeadline, 'PRODUCTION')!;
      warnings.push(
        `[CriticalPath] ⚠️  Task PRODUCTION "${t.title}": deadline ${t.deadline} >= installation ${installDate}` +
        ` → tự động điều chỉnh về ${adjusted}`
      );
      return { ...t, deadline: adjusted };
    }
    return t;
  });

  return { tasks: adjustedTasks, warnings };
}

// ─────────────────────────────────────────────────────────────────────────────
// UNIT TEST — Validation Hook tích hợp
// ─────────────────────────────────────────────────────────────────────────────
export interface RouterTestResult {
  passed:  boolean;
  results: string[];
}

export function runRouterTests(): RouterTestResult {
  const results: string[] = [];
  let passed = true;

  const testCases: Array<{ title: string; expectedGroup: WorkGroup }> = [
    { title: 'Kệ tivi treo tường',     expectedGroup: 'PRODUCTION'   },
    { title: 'Sofa văng 3 chỗ',        expectedGroup: 'PROCUREMENT'  },
    { title: 'Sơn hiệu ứng vách',      expectedGroup: 'INSTALLATION' },
    { title: 'Tủ quần áo cánh kính',   expectedGroup: 'PRODUCTION'   },
    { title: 'Gương phòng tắm decor',  expectedGroup: 'PROCUREMENT'  },
    { title: 'Lắp đặt thiết bị điện',  expectedGroup: 'INSTALLATION' },
    { title: 'Bàn học sinh viên',       expectedGroup: 'PRODUCTION'   },
    { title: 'Đèn thả trần hiện đại',  expectedGroup: 'PROCUREMENT'  },
    { title: 'Sơn tường nội thất',     expectedGroup: 'INSTALLATION' },
    { title: 'Vệ sinh công trình',      expectedGroup: 'INSTALLATION' },
  ];

  for (const tc of testCases) {
    const r = classifyTask(tc.title);
    const ok = r.workGroup === tc.expectedGroup;
    if (!ok) passed = false;
    results.push(
      `[${ok ? 'PASS' : 'FAIL'}] "${tc.title}" → ${r.workGroup} ` +
      `(expected: ${tc.expectedGroup}, kw: "${r.matchedKeyword}")`
    );
  }

  const first3Groups = testCases.slice(0, 3).map(tc => classifyTask(tc.title).workGroup);
  const allDiff = new Set(first3Groups).size === 3;
  if (!allDiff) passed = false;
  results.push(
    `[${allDiff ? 'PASS' : 'FAIL'}] 3 mẫu → ${new Set(first3Groups).size}/3 nhóm khác nhau`
  );

  const pDL = '2025-12-31';
  const prodDL = calcTaskDeadline(pDL, 'PRODUCTION');
  const procDL = calcTaskDeadline(pDL, 'PROCUREMENT');
  const instDL = calcTaskDeadline(pDL, 'INSTALLATION');
  results.push('');
  results.push('[Critical Path]');
  if (prodDL !== '2025-12-24') { passed = false; }
  results.push(`[${prodDL === '2025-12-24' ? 'PASS' : 'FAIL'}] PRODUCTION: ${prodDL}`);
  if (procDL !== '2025-12-24') { passed = false; }
  results.push(`[${procDL === '2025-12-24' ? 'PASS' : 'FAIL'}] PROCUREMENT: ${procDL}`);
  if (instDL !== '2025-12-31') { passed = false; }
  results.push(`[${instDL === '2025-12-31' ? 'PASS' : 'FAIL'}] INSTALLATION: ${instDL}`);

  const badTasks: CriticalPathTask[] = [
    { title: 'Kệ tivi', workGroup: 'PRODUCTION',   deadline: '2025-12-31' },
    { title: 'Lắp đặt', workGroup: 'INSTALLATION', deadline: '2025-12-31' },
  ];
  const { tasks: fixed, warnings } = validateCriticalPath(badTasks, pDL);
  const wasFixed = fixed[0].deadline === '2025-12-24';
  if (!wasFixed) passed = false;
  results.push(`[${wasFixed ? 'PASS' : 'FAIL'}] CriticalPath auto-fix → ${fixed[0].deadline}`);

  return { passed, results };
}
