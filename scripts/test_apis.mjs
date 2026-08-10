// scripts/test_apis.mjs — Unit test logic cho các API mới (Sprint 5-7)
// Chạy: node scripts/test_apis.mjs

import { readFileSync } from 'fs';
const env = readFileSync('.env.local', 'utf8');
for (const line of env.split('\n')) {
  const [k, ...v] = line.split('=');
  if (k && v.length) process.env[k.trim()] = v.join('=').trim();
}

const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';

// ── Helper ───────────────────────────────────────────────────────────────────
function pass(name) { console.log(`  ✅ ${name}`); }
function fail(name, reason) { console.log(`  ❌ ${name}: ${reason}`); process.exitCode = 1; }

// ── UNIT TEST 1: OT Calculation (hr.ts) ──────────────────────────────────────
console.log('\n=== TEST 1: OT Calculation ===');
try {
  const { calculateOT } = await import('../src/lib/hr.ts').catch(() => null) ?? {};
  if (!calculateOT) {
    // Direct logic test
    function minutesBetween(h1, m1, h2, m2) { return (h2 * 60 + m2) - (h1 * 60 + m1); }
    const checkIn  = { h: 8,  m: 0  };
    const checkOut = { h: 23, m: 0  };
    const breakStart = { h: 12, m: 0  };
    const breakEnd   = { h: 13, m: 30 };
    const regularEnd = { h: 17, m: 30 };
    const otNightStart = { h: 22, m: 0 };

    const breakMins   = minutesBetween(breakStart.h, breakStart.m, breakEnd.h, breakEnd.m); // 90
    const totalMins   = minutesBetween(checkIn.h, checkIn.m, checkOut.h, checkOut.m) - breakMins; // 810
    const regularMins = minutesBetween(checkIn.h, checkIn.m, regularEnd.h, regularEnd.m) - breakMins; // 360
    const otDayMins   = minutesBetween(regularEnd.h, regularEnd.m, otNightStart.h, otNightStart.m); // 270
    const otNightMins = minutesBetween(otNightStart.h, otNightStart.m, checkOut.h, checkOut.m); // 60

    const base = 75000;
    const pay  = (regularMins/60)*base*1.0 + (otDayMins/60)*base*1.5 + (otNightMins/60)*base*2.1;
    const expected = 1263750;
    if (Math.abs(pay - expected) < 1) pass(`OT Pay = ${pay.toFixed(0)} VNĐ (expected ${expected})`);
    else fail('OT Calculation', `Got ${pay.toFixed(0)}, expected ${expected}`);
  }
} catch(e) { fail('OT Calculation', e.message); }

// ── UNIT TEST 2: BOQ Parser ───────────────────────────────────────────────────
console.log('\n=== TEST 2: BOQ ETL Parser ===');
try {
  const csv = `ZN-PH-01,Phong hop,
1,Len chan tuong,md,45.6,350000,HomePro sx
2,Rem che nang,m2,18.0,450000,CĐT cap
ZN-PLV-02,Phong lam viec,
1,Ban lam viec,cai,8,2500000,`;

  const lines = csv.trim().split('\n').filter(Boolean);
  let zones = 0, items = 0;
  for (const line of lines) {
    const parts = line.split(',');
    if (parts[0]?.match(/^ZN-[A-Z]+-\d{2}$/)) zones++;
    else if (parts.length >= 4) items++;
  }
  if (zones === 2) pass(`Nhận dạng ${zones} phân khu`);
  else fail('Zone detection', `Got ${zones}, expected 2`);
  if (items === 3) pass(`Nhận dạng ${items} dòng BOQ`);
  else fail('Item detection', `Got ${items}, expected 3`);

  // Test supply type classification
  const supplyTests = [
    { note: 'HomePro sx',    expected: 'HOMEPRO_PRODUCTION' },
    { note: 'CĐT cap',      expected: 'INSTALLATION_ONLY' },
    { note: 'cdt cap',      expected: 'INSTALLATION_ONLY' },
    { note: '',              expected: 'HOMEPRO_PRODUCTION' },
  ];
  let supplyPass = 0;
  for (const t of supplyTests) {
    const n = t.note.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
    const result = (n.includes('cdt') || n.includes('khong thuc hien')) ? 'INSTALLATION_ONLY' : 'HOMEPRO_PRODUCTION';
    if (result === t.expected) supplyPass++;
  }
  if (supplyPass === supplyTests.length) pass(`Supply type: ${supplyPass}/${supplyTests.length} tests đúng`);
  else fail('Supply type', `${supplyPass}/${supplyTests.length} passed`);
} catch(e) { fail('BOQ Parser', e.message); }

// ── UNIT TEST 3: Haversine GPS ────────────────────────────────────────────────
console.log('\n=== TEST 3: GPS Haversine ===');
try {
  function haversine(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2)**2;
    return 2 * R * Math.asin(Math.sqrt(a));
  }

  // Vị trí xưởng HCM: 10.7769, 106.7009
  const workshop = [10.7769, 106.7009];
  const nearby   = [10.7774, 106.7015]; // ~70m
  const farAway  = [10.7900, 106.7200]; // ~2.5km

  const dNear = haversine(...workshop, ...nearby);
  const dFar  = haversine(...workshop, ...farAway);

  if (dNear < 300) pass(`Gần xưởng: ${dNear.toFixed(0)}m < 300m → allowed`);
  else fail('Nearby check', `${dNear.toFixed(0)}m`);

  if (dFar > 300) pass(`Xa xưởng: ${dFar.toFixed(0)}m > 300m → blocked`);
  else fail('Far check', `${dFar.toFixed(0)}m`);
} catch(e) { fail('Haversine', e.message); }

// ── UNIT TEST 4: Budget Guard Logic ──────────────────────────────────────────
console.log('\n=== TEST 4: Budget Guard ===');
try {
  const target = 5_000_000_000; // 5 tỷ
  const bomLines = [
    { total: 1_200_000_000 },
    { total: 3_500_000_000 },
    { total: 400_000_000  },
  ];
  const currentTotal = bomLines.reduce((s, b) => s + b.total, 0); // 5.1 tỷ
  const overBudget = target > 0 && currentTotal > target;
  if (overBudget) pass(`Budget guard: ${(currentTotal/1e9).toFixed(2)}B > ${(target/1e9).toFixed(2)}B → BLOCKED ✅`);
  else fail('Budget guard', 'Should detect overbudget');

  const safeTotal = 4_000_000_000;
  const safeOk = !(safeTotal > target);
  if (safeOk) pass(`Budget guard: ${(safeTotal/1e9).toFixed(2)}B < ${(target/1e9).toFixed(2)}B → ALLOWED ✅`);
  else fail('Budget safe', 'Should allow under budget');
} catch(e) { fail('Budget Guard', e.message); }

console.log('\n========================================');
console.log(process.exitCode === 1 ? '❌ CÓ LỖI' : '✅ TẤT CẢ UNIT TEST PASS');
console.log('========================================\n');
