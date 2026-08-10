// scripts/test-work-order-router.mjs
// ══════════════════════════════════════════════════════════════════════════════
// Validation Hook: Auto-Routing & Work Order Engine
// Chạy: npx tsx scripts/test-work-order-router.mjs
// ══════════════════════════════════════════════════════════════════════════════

import { classifyTask, calcTaskDeadline, validateCriticalPath, runRouterTests } from '../src/lib/work-order-router.ts';

let totalTests = 0;
let failTests = 0;

function assert(cond, msg) {
  totalTests++;
  if (!cond) {
    failTests++;
    console.log(`  ❌ FAIL: ${msg}`);
  } else {
    console.log(`  ✅ ${msg}`);
  }
}

console.log('\n════════════════════════════════════════════════════════════');
console.log('BƯỚC 1: Routing Engine — Keyword Tokenization Matching');
console.log('════════════════════════════════════════════════════════════\n');

// ── Test 3 cấu kiện mẫu bắt buộc theo spec ───────────────────────────────────
const r1 = classifyTask('Kệ tivi treo tường');
assert(r1.workGroup === 'PRODUCTION',   `"Kệ tivi treo tường" → PRODUCTION (got: ${r1.workGroup}, keyword: "${r1.matchedKeyword}")`);
assert(r1.category === 'Sản xuất xưởng', `category = "Sản xuất xưởng" (got: "${r1.category}")`);
assert(r1.assignee === 'Minh', `assignee = "Minh" (Xưởng mộc) (got: "${r1.assignee}")`);

const r2 = classifyTask('Sofa văng 3 chỗ');
assert(r2.workGroup === 'PROCUREMENT',   `"Sofa văng 3 chỗ" → PROCUREMENT (got: ${r2.workGroup})`);
assert(r2.category === 'Thu mua / Thương mại', `category = "Thu mua / Thương mại" (got: "${r2.category}")`);
assert(r2.assignee === 'Tuấn', `assignee = "Tuấn" (Thu mua) (got: "${r2.assignee}")`);

const r3 = classifyTask('Sơn hiệu ứng vách');
assert(r3.workGroup === 'INSTALLATION', `"Sơn hiệu ứng vách" → INSTALLATION (got: ${r3.workGroup})`);
assert(r3.category === 'Thi công công trình', `category = "Thi công công trình" (got: "${r3.category}")`);

// ── ĐIỀU KIỆN KIỂM TRA BƯỚC 1: 3 nhóm phải khác nhau ────────────────────────
const groups = [r1.workGroup, r2.workGroup, r3.workGroup];
const uniqueGroups = new Set(groups).size;
assert(uniqueGroups === 3,
  `3 cấu kiện mẫu → ${uniqueGroups}/3 nhóm khác nhau: [${groups.join(', ')}]` +
  (uniqueGroups < 3 ? ' ⛔ LỖI BIÊN DỊCH: tất cả bị gán cùng nhóm!' : '')
);

// ── Thêm các case thực tế ──────────────────────────────────────────────────────
console.log('\n  [Additional keyword tests]');
assert(classifyTask('Tủ quần áo cánh kính').workGroup === 'PRODUCTION', '"Tủ quần áo cánh kính" → PRODUCTION');
assert(classifyTask('Giường ngủ đôi 1m8').workGroup   === 'PRODUCTION', '"Giường ngủ đôi 1m8" → PRODUCTION');
assert(classifyTask('Bàn trang điểm gỗ').workGroup    === 'PRODUCTION', '"Bàn trang điểm gỗ" → PRODUCTION');
assert(classifyTask('Vách CNC phay hoa văn').workGroup === 'PRODUCTION', '"Vách CNC phay hoa văn" → PRODUCTION');
assert(classifyTask('Gương phòng tắm decor').workGroup === 'PROCUREMENT', '"Gương phòng tắm decor" → PROCUREMENT');
assert(classifyTask('Bàn trà mặt đá').workGroup       === 'PROCUREMENT', '"Bàn trà mặt đá" → PROCUREMENT');
assert(classifyTask('Đèn thả trần hiện đại').workGroup === 'PROCUREMENT', '"Đèn thả trần hiện đại" → PROCUREMENT');
assert(classifyTask('Thảm trải sàn phòng khách').workGroup === 'PROCUREMENT', '"Thảm trải sàn" → PROCUREMENT');
assert(classifyTask('Lắp đặt thiết bị điện').workGroup === 'INSTALLATION', '"Lắp đặt thiết bị điện" → INSTALLATION');
assert(classifyTask('Vệ sinh công trình').workGroup    === 'INSTALLATION', '"Vệ sinh công trình" → INSTALLATION');
assert(classifyTask('Sơn tường nội thất').workGroup    === 'INSTALLATION', '"Sơn tường nội thất" → INSTALLATION');

// ── Case viết hoa / có dấu / có khoảng trắng thừa ──────────────────────────
assert(classifyTask('  KỆ TIVI TREO TƯỜNG  ').workGroup === 'PRODUCTION', 'Uppercase + spaces → vẫn nhận PRODUCTION');
assert(classifyTask('SOFA PHÒNG KHÁCH').workGroup        === 'PROCUREMENT', 'SOFA uppercase → PROCUREMENT');

console.log('\n════════════════════════════════════════════════════════════');
console.log('BƯỚC 2: Critical Path Deadline Calculator');
console.log('════════════════════════════════════════════════════════════\n');

// ── Test YYYY-MM-DD format ──────────────────────────────────────────────────
const pDL = '2025-12-31';
assert(calcTaskDeadline(pDL, 'PRODUCTION')   === '2025-12-24', `PRODUCTION deadline: 31 − 7 = 24 Dec`);
assert(calcTaskDeadline(pDL, 'PROCUREMENT')  === '2025-12-24', `PROCUREMENT deadline: đồng bộ sản xuất`);
assert(calcTaskDeadline(pDL, 'INSTALLATION') === '2025-12-31', `INSTALLATION deadline: trùng ngày bàn giao`);
assert(calcTaskDeadline(pDL, 'UNCLASSIFIED') === '2025-12-31', `UNCLASSIFIED deadline: fallback = bàn giao`);

// ── Test DD/MM/YYYY format (Excel thường xuất) ───────────────────────────────
assert(calcTaskDeadline('31/12/2025', 'PRODUCTION') === '2025-12-24', `DD/MM/YYYY format → PRODUCTION deadline OK`);

// ── Test null / invalid ───────────────────────────────────────────────────────
assert(calcTaskDeadline(null,        'PRODUCTION') === null, `null deadline → null (safe)`);
assert(calcTaskDeadline(undefined,   'PRODUCTION') === null, `undefined deadline → null (safe)`);
assert(calcTaskDeadline('invalid',   'PRODUCTION') === null, `invalid string → null (safe)`);

// ── Test qua tháng ──────────────────────────────────────────────────────────
assert(calcTaskDeadline('2026-01-03', 'PRODUCTION') === '2025-12-27', `Qua tháng: Jan 3 − 7 = Dec 27`);

// ── validateCriticalPath ─────────────────────────────────────────────────────
console.log('\n  [Critical Path Auto-Fix]');
const badTasks = [
  { title: 'Kệ tivi',  workGroup: 'PRODUCTION',   deadline: '2025-12-31' }, // SAI: trùng ngày lắp đặt
  { title: 'Lắp đặt', workGroup: 'INSTALLATION', deadline: '2025-12-31' },
];
const { tasks: fixedTasks, warnings } = validateCriticalPath(badTasks, '2025-12-31');
assert(fixedTasks[0].deadline === '2025-12-24',
  `CriticalPath auto-fix: PRODUCTION "2025-12-31" → "2025-12-24" (adjusted)`
);
assert(warnings.length === 1, `1 warning được log: ${warnings[0] ?? '–'}`);
assert(fixedTasks[1].deadline === '2025-12-31', `INSTALLATION deadline không bị thay đổi`);

// ── runRouterTests() built-in ──────────────────────────────────────────────
console.log('\n  [runRouterTests() built-in suite]');
const { passed, results } = runRouterTests();
for (const r of results) console.log('  ' + r);
assert(passed, 'runRouterTests() passed = true (toàn bộ test nội bộ PASS)');

console.log('\n════════════════════════════════════════════════════════════');
if (failTests === 0) {
  console.log(`\n  🎉 TẤT CẢ ${totalTests} TESTS PASS — Work Order Router OK!\n`);
} else {
  console.log(`\n  ❌ ${failTests}/${totalTests} TESTS THẤT BẠI\n`);
  process.exit(1);
}
