// src/lib/geo.ts
// Module GPS: Thu\u1eadt to\u00e1n Haversine + Ch\u1ed1ng Fake GPS
// Tham chi\u1ebfu: https://www.movable-type.co.uk/scripts/latlong.html

export interface GeoPoint {
  lat: number;
  lon: number;
}

// \u2500\u2500 Haversine Distance (m\u00e9t) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// d = 2R \u00d7 arcsin(\u221a(sin\u00b2(\u0394\u03c6/2) + cos(\u03c61)cos(\u03c62)sin\u00b2(\u0394\u03bb/2)))
export function haversineDistance(from: GeoPoint, to: GeoPoint): number {
  const R = 6_371_000; // B\u00e1n k\u00ednh Tr\u00e1i \u0110\u1ea5t (m\u00e9t)
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const phi1 = toRad(from.lat);
  const phi2 = toRad(to.lat);
  const dPhi = toRad(to.lat - from.lat);
  const dLam = toRad(to.lon - from.lon);

  const a =
    Math.sin(dPhi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLam / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// \u2500\u2500 T\u1ecda \u0111\u1ed9 c\u00e1c \u0111i\u1ec3m ch\u1ea5m c\u00f4ng h\u1ee3p l\u1ec7 \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
export const APPROVED_LOCATIONS: Array<{ name: string; point: GeoPoint; radiusM: number }> = [
  {
    name:    'Nh\u00e0 x\u01b0\u1edfng HomePro',
    point:   { lat: 10.762622, lon: 106.660172 }, // Thay b\u1eb1ng t\u1ecda \u0111\u1ed9 th\u1ef1c t\u1ebf
    radiusM: 200,
  },
  {
    name:    'C\u00f4ng tr\u00ecnh B\u1ea3o Minh CMT8 (201-203)',
    point:   { lat: 10.771300, lon: 106.695100 }, // 201-203 CMT8, Q3 Ho Chi Minh
    radiusM: 200,
  },
];

// \u2500\u2500 Ki\u1ec3m tra nh\u00e2n vi\u00ean c\u00f3 trong v\u00f9ng ch\u1ea5m c\u00f4ng kh\u00f4ng \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
export interface GeoCheckResult {
  allowed: boolean;
  nearestLocation: string | null;
  distanceM: number;
  reason?: string;
}

export function checkLocationAllowed(userPoint: GeoPoint): GeoCheckResult {
  let minDist = Infinity;
  let nearest = '';

  for (const loc of APPROVED_LOCATIONS) {
    const d = haversineDistance(userPoint, loc.point);
    if (d < minDist) {
      minDist = d;
      nearest = loc.name;
      if (d <= loc.radiusM) {
        return { allowed: true, nearestLocation: loc.name, distanceM: Math.round(d) };
      }
    }
  }

  return {
    allowed: false,
    nearestLocation: nearest,
    distanceM: Math.round(minDist),
    reason: `V\u1ecb tr\u00ed c\u00e1ch \u0111i\u1ec3m g\u1ea7n nh\u1ea5t ${Math.round(minDist)}m (gi\u1edbi h\u1ea1n 200m)`,
  };
}

// \u2500\u2500 Ph\u00e2n t\u00edch chu\u1ed7i t\u1ecda \u0111\u1ed9 "lat,lon" \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
export function parseLocationString(str: string): GeoPoint | null {
  if (!str) return null;
  const parts = str.split(',').map((p) => parseFloat(p.trim()));
  if (parts.length !== 2 || parts.some(isNaN)) return null;
  const [lat, lon] = parts;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
  return { lat, lon };
}

// \u2500\u2500 Ch\u1ed1ng Fake GPS \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

// Ph\u00e1t hi\u1ec7n v\u1eadn t\u1ed1c phi th\u1ef1c t\u1ebf gi\u1eefa 2 l\u1ea7n ch\u1ea5m c\u00f4ng (ng\u01b0\u1ee1ng 300 km/h)
const MAX_REALISTIC_SPEED_MPS = 300_000 / 3600; // ~83.3 m/s

export interface SpeedCheckResult {
  suspicious: boolean;
  speedKmh: number;
  reason?: string;
}

export function detectImpossibleSpeed(
  prev: { point: GeoPoint; timestamp: number }, // timestamp: ms
  curr: { point: GeoPoint; timestamp: number }
): SpeedCheckResult {
  const distM   = haversineDistance(prev.point, curr.point);
  const timeSec = Math.max(1, (curr.timestamp - prev.timestamp) / 1000);
  const speedMps   = distM / timeSec;
  const speedKmh   = speedMps * 3.6;

  if (speedMps > MAX_REALISTIC_SPEED_MPS) {
    return {
      suspicious: true,
      speedKmh: Math.round(speedKmh),
      reason: `V\u1eadn t\u1ed1c d\u1ecbch chuy\u1ec3n ${Math.round(speedKmh)} km/h v\u01b0\u1ee3t ng\u01b0\u1ee1ng ${Math.round(MAX_REALISTIC_SPEED_MPS * 3.6)} km/h`,
    };
  }

  return { suspicious: false, speedKmh: Math.round(speedKmh) };
}

// \u2500\u2500 Unit Test B\u01af\u1edaC 3 \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
export function runGeoTests(): { passed: boolean; results: string[] } {
  const results: string[] = [];
  let passed = true;

  // Test 1: Haversine c\u01a1 b\u1ea3n (2 \u0111i\u1ec3m c\u00e1ch ~1km t\u1ea1i TPHCM)
  const d1 = haversineDistance(
    { lat: 10.762622, lon: 106.660172 },
    { lat: 10.771622, lon: 106.660172 }
  );
  const test1 = Math.abs(d1 - 1001) < 50; // ~1001m
  results.push(`[${test1 ? 'PASS' : 'FAIL'}] Haversine ~1000m: got ${Math.round(d1)}m`);
  if (!test1) passed = false;

  // Test 2: V\u1ecb tr\u00ed c\u00e1ch x\u01b0\u1edfng 500m -> ph\u1ea3i b\u1ecb t\u1eeb ch\u1ed1i
  const farPoint: GeoPoint = { lat: 10.767122, lon: 106.660172 }; // ~500m
  const check2 = checkLocationAllowed(farPoint);
  results.push(`[${!check2.allowed ? 'PASS' : 'FAIL'}] 500m -> block: allowed=${check2.allowed}, dist=${check2.distanceM}m`);
  if (check2.allowed) passed = false;

  // Test 3: V\u1ecb tr\u00ed trong x\u01b0\u1edfng -> cho ph\u00e9p
  const nearPoint: GeoPoint = { lat: 10.762700, lon: 106.660200 }; // ~10m
  const check3 = checkLocationAllowed(nearPoint);
  results.push(`[${check3.allowed ? 'PASS' : 'FAIL'}] 10m -> allow: allowed=${check3.allowed}, dist=${check3.distanceM}m`);
  if (!check3.allowed) passed = false;

  // Test 4: T\u1ed1c \u0111\u1ed9 phi th\u1ef1c t\u1ebf (t\u1eeb HCM \u0111\u1ebfn H\u00e0 N\u1ed9i trong 1 ph\u00fat)
  const speed4 = detectImpossibleSpeed(
    { point: { lat: 10.762622, lon: 106.660172 }, timestamp: 0 },
    { point: { lat: 21.027764, lon: 105.834160 }, timestamp: 60_000 }, // 60s sau
  );
  results.push(`[${speed4.suspicious ? 'PASS' : 'FAIL'}] Fake GPS speed: ${speed4.speedKmh} km/h -> suspicious=${speed4.suspicious}`);
  if (!speed4.suspicious) passed = false;

  return { passed, results };
}
