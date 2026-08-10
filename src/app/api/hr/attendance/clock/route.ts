// src/app/api/hr/attendance/clock/route.ts
// ══════════════════════════════════════════════════════════════════════════════
// POST /api/hr/attendance/clock
//
// Unified clock-in/clock-out API cho mọi kênh: WEB_GPS, HARDWARE, MANUAL
//
// ─── VẤN ĐỀ CỐT LÕI CẦN GIẢI QUYẾT ─────────────────────────────────────────
// Nhân viên vào ca lúc 06:00:
//   T+0s:  WEB_GPS clock-in → record tạo với lat/lng GPS
//   T+2m:  HARDWARE (máy vân tay) clock-in cùng nhân viên đó
//
// YÊU CẦU:
//   ✅ KHÔNG tạo 2 record (1 nhân viên = 1 record / ngày)
//   ✅ KHÔNG ghi đè GPS của WEB_GPS bằng null của HARDWARE
//   ✅ HARDWARE phải được ghi nhận trong audit trail
//   ✅ Trả về 200 OK (không phải 409 Error) — đây là behavior bình thường
//
// ─── THUẬT TOÁN IDEMPOTENCY 3 TẦNG ──────────────────────────────────────────
// Tầng 1: DB UNIQUE constraint (idempotency_key = "empId:workDate")
//   → Ngăn INSERT song song từ network race condition (atomics ở DB level)
//
// Tầng 2: TIME WINDOW CHECK (10 phút)
//   → Trong vòng 10 phút: xử lý như duplicate, không báo lỗi
//   → Ngoài 10 phút: nhân viên thực sự cố tình clock-in lần 2 → 409
//
// Tầng 3: GPS PRESERVATION RULE
//   → Nếu existing record đã có GPS → KHÔNG BAO GIỜ overwrite bằng null
//   → Nếu existing record KHÔNG có GPS + request mới có GPS → UPDATE (GPS enrichment)
// ══════════════════════════════════════════════════════════════════════════════

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db }                        from '@/db';
import { attendance, users }         from '@/db/schema';
import { requireAuth, ALL_ROLES }    from '@/lib/auth';
import { eq, and }                   from 'drizzle-orm';
import { getTodayVN }                from '@/lib/hr';
import { writeHrAuditLogAsync }      from '@/lib/hr';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/** Cửa sổ idempotency: 2 lần clock cùng hành động trong 10 phút = duplicate */
const IDEMPOTENCY_WINDOW_MS = 10 * 60 * 1000;  // 10 phút

/** Thứ tự ưu tiên nguồn: số càng cao càng tin cậy hơn */
const SOURCE_PRIORITY: Record<string, number> = {
  ADMIN_CORRECTION: 4,
  WEB_GPS:          3,
  HARDWARE:         2,
  MANUAL:           1,
};

type ClockSource = 'WEB_GPS' | 'HARDWARE' | 'MANUAL' | 'ADMIN_CORRECTION';
type ClockAction = 'CLOCK_IN' | 'CLOCK_OUT';

// ─────────────────────────────────────────────────────────────────────────────
// Payload validation
// ─────────────────────────────────────────────────────────────────────────────
interface ClockPayload {
  action:     ClockAction;   // 'CLOCK_IN' | 'CLOCK_OUT'
  sourceType: ClockSource;   // Kênh chấm công
  deviceId?:  string;        // ID máy phần cứng (chỉ có khi HARDWARE)
  lat?:       number;        // GPS latitude  (chỉ có khi WEB_GPS)
  lng?:       number;        // GPS longitude
  employeeId?: number;       // Ghi đè nếu Admin chấm hộ (ADMIN_CORRECTION)
}

function validatePayload(body: unknown): { payload: ClockPayload; error?: never }
  | { payload?: never; error: string } {
  if (typeof body !== 'object' || body === null) return { error: 'Body không hợp lệ' };
  const b = body as Record<string, unknown>;

  const action = b.action as string;
  if (!['CLOCK_IN', 'CLOCK_OUT'].includes(action)) {
    return { error: 'action phải là CLOCK_IN hoặc CLOCK_OUT' };
  }

  const sourceType = (b.sourceType as string) ?? 'MANUAL';
  if (!['WEB_GPS', 'HARDWARE', 'MANUAL', 'ADMIN_CORRECTION'].includes(sourceType)) {
    return { error: 'sourceType không hợp lệ' };
  }

  // WEB_GPS bắt buộc có lat/lng
  if (sourceType === 'WEB_GPS') {
    if (typeof b.lat !== 'number' || typeof b.lng !== 'number') {
      return { error: 'WEB_GPS yêu cầu lat và lng' };
    }
  }

  // HARDWARE bắt buộc có deviceId
  if (sourceType === 'HARDWARE') {
    if (!b.deviceId || typeof b.deviceId !== 'string') {
      return { error: 'HARDWARE yêu cầu deviceId' };
    }
  }

  return {
    payload: {
      action:     action as ClockAction,
      sourceType: sourceType as ClockSource,
      deviceId:   b.deviceId as string | undefined,
      lat:        b.lat    as number | undefined,
      lng:        b.lng    as number | undefined,
      employeeId: b.employeeId as number | undefined,
    }
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: Thêm source vào JSON audit trail
// VD: '["WEB_GPS@06:00"]' + "HARDWARE" → '["WEB_GPS@06:00","HARDWARE@06:02"]'
// ─────────────────────────────────────────────────────────────────────────────
function appendSource(existing: string | null, source: string, now: Date): string {
  let arr: string[] = [];
  try { arr = JSON.parse(existing ?? '[]'); } catch { arr = []; }
  const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  arr.push(`${source}@${timeStr}`);
  return JSON.stringify(arr);
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: GPS Preservation + Enrichment
//
// Quy tắc:
//   ① Existing HAS GPS + New HAS GPS + New.priority > Existing.priority → UPDATE
//   ② Existing HAS GPS + New HAS GPS + New.priority <= Existing.priority → KEEP
//   ③ Existing HAS GPS + New NO GPS → PRESERVE (KHÔNG ghi đè)
//   ④ Existing NO GPS  + New HAS GPS → ENRICH (cập nhật)
//   ⑤ Existing NO GPS  + New NO GPS  → No change
// ─────────────────────────────────────────────────────────────────────────────
function resolveGps(params: {
  existingLat:    number | null;
  existingLng:    number | null;
  existingSource: string;
  newLat:         number | null | undefined;
  newLng:         number | null | undefined;
  newSource:      ClockSource;
}): { lat: number | null; lng: number | null; shouldUpdate: boolean } {
  const { existingLat, existingLng, existingSource, newLat, newLng, newSource } = params;

  const hasExistingGps = existingLat !== null && existingLng !== null;
  const hasNewGps      = newLat !== undefined && newLat !== null
                      && newLng !== undefined && newLng !== null;

  if (!hasNewGps) {
    // Trường hợp ③ và ⑤: new request không có GPS → PRESERVE hoặc no-op
    return { lat: existingLat, lng: existingLng, shouldUpdate: false };
  }

  if (!hasExistingGps) {
    // Trường hợp ④: existing không có GPS + new có GPS → ENRICH
    return { lat: newLat!, lng: newLng!, shouldUpdate: true };
  }

  // Cả 2 đều có GPS → so sánh priority
  const existingPriority = SOURCE_PRIORITY[existingSource] ?? 0;
  const newPriority      = SOURCE_PRIORITY[newSource]      ?? 0;

  if (newPriority > existingPriority) {
    // Trường hợp ①: nguồn mới tin cậy hơn → UPDATE
    return { lat: newLat!, lng: newLng!, shouldUpdate: true };
  }

  // Trường hợp ②: existing nguồn tốt hơn → KEEP
  return { lat: existingLat, lng: existingLng, shouldUpdate: false };
}

// ─────────────────────────────────────────────────────────────────────────────
// POST Handler — Unified Clock In / Clock Out
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth(req, ALL_ROLES);
  if (error) return error;

  // ── Parse + validate body ──────────────────────────────────────────────────
  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Body JSON không hợp lệ' }, { status: 400 }); }

  const validation = validatePayload(body);
  if (validation.error) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }
  const payload = validation.payload!;

  // ── Xác định employeeId ────────────────────────────────────────────────────
  // Admin dùng ADMIN_CORRECTION có thể chấm hộ người khác
  const employeeId = (payload.sourceType === 'ADMIN_CORRECTION' && payload.employeeId)
    ? payload.employeeId
    : session.id;

  const today = getTodayVN();          // YYYY-MM-DD (múi giờ VN)
  const now   = new Date();
  const idempotencyKey = `${employeeId}:${today}`;

  try {
    // ── Lookup record hiện tại của nhân viên hôm nay ─────────────────────────
    const [existing] = await db
      .select()
      .from(attendance)
      .where(
        and(
          eq(attendance.employeeId, employeeId),
          eq(attendance.workDate,   today)
        )
      )
      .limit(1);

    // ══════════════════════════════════════════════════════════════════════════
    // NHÁNH CLOCK_IN
    // ══════════════════════════════════════════════════════════════════════════
    if (payload.action === 'CLOCK_IN') {
      return await handleClockIn({
        existing, employeeId, today, now, idempotencyKey,
        payload, session,
      });
    }

    // ══════════════════════════════════════════════════════════════════════════
    // NHÁNH CLOCK_OUT
    // ══════════════════════════════════════════════════════════════════════════
    return await handleClockOut({
      existing, employeeId, today, now,
      payload, session,
    });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Lỗi không xác định';
    console.error('[ClockAPI]', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// handleClockIn — Toàn bộ logic CLOCK_IN + Idempotency
// ─────────────────────────────────────────────────────────────────────────────
async function handleClockIn(ctx: {
  existing:       typeof attendance.$inferSelect | undefined;
  employeeId:     number;
  today:          string;
  now:            Date;
  idempotencyKey: string;
  payload:        ClockPayload;
  session:        { id: number; name?: string };
}) {
  const { existing, employeeId, today, now, idempotencyKey, payload, session } = ctx;

  // ── Đã có record VÀ đã có checkIn ─────────────────────────────────────────
  if (existing?.checkIn) {
    const msSinceClockIn = now.getTime() - existing.checkIn.getTime();

    // ── TẦNG 2: Time Window Check ───────────────────────────────────────────
    if (msSinceClockIn <= IDEMPOTENCY_WINDOW_MS) {
      // === IDEMPOTENT DUPLICATE — Xử lý đa kênh ===

      // ── TẦNG 3: GPS Preservation + Enrichment ───────────────────────────
      const gpsResult = resolveGps({
        existingLat:    existing.checkInLat  ?? null,
        existingLng:    existing.checkInLng  ?? null,
        existingSource: existing.clockInSource ?? 'MANUAL',
        newLat:         payload.lat,
        newLng:         payload.lng,
        newSource:      payload.sourceType,
      });

      // Cập nhật confirmSources + GPS (nếu cần) — KHÔNG thay đổi checkIn timestamp
      const newConfirmSources = appendSource(existing.confirmSources, payload.sourceType, now);

      const updateData: Partial<typeof attendance.$inferInsert> = {
        confirmSources: newConfirmSources,
        updatedAt:      now,
      };

      // Chỉ update GPS nếu resolveGps bảo shouldUpdate
      if (gpsResult.shouldUpdate) {
        updateData.checkInLat    = gpsResult.lat ?? undefined;
        updateData.checkInLng    = gpsResult.lng ?? undefined;
        updateData.clockInSource = payload.sourceType; // Nâng cấp source nếu priority cao hơn
      }

      // Ghi deviceId nếu có (không ghi đè nếu đã có)
      if (payload.deviceId && !existing.deviceId) {
        updateData.deviceId = payload.deviceId;
      }

      await db.update(attendance)
        .set(updateData)
        .where(eq(attendance.id, existing.id));

      // Audit log (fire-and-forget): ghi nhận sự kiện đa kênh
      writeHrAuditLogAsync({
        action:     'ATTENDANCE_DUPLICATE_CLOCK_IN',
        entityType: 'attendance',
        entityId:   existing.id,
        actorId:    session.id,
        newValue:   {
          source:     payload.sourceType,
          deviceId:   payload.deviceId,
          gpsUpdated: gpsResult.shouldUpdate,
          withinWindowMs: msSinceClockIn,
        },
      });

      // Trả về 200 OK (không phải 409!) — behavior hợp lệ
      return NextResponse.json({
        ...existing,
        confirmSources: newConfirmSources,
        _idempotent: true,
        _message:    `Đã ghi nhận từ ${payload.sourceType} (duplicate trong cửa sổ ${IDEMPOTENCY_WINDOW_MS / 60000} phút)`,
        _gpsAction:  gpsResult.shouldUpdate ? 'GPS_ENRICHED' : 'GPS_PRESERVED',
      }, { status: 200 });

    } else {
      // ── Ngoài cửa sổ idempotency: Thực sự clock-in lần 2 → lỗi nghiệp vụ ──
      const hhmm = existing.checkIn.toLocaleTimeString('vi-VN', {
        hour: '2-digit', minute: '2-digit',
      });
      return NextResponse.json({
        error:       `Đã chấm công vào lúc ${hhmm} qua ${existing.clockInSource}`,
        clockedInAt: existing.checkIn.toISOString(),
        source:      existing.clockInSource,
      }, { status: 409 });
    }
  }

  // ── Chưa có checkIn → INSERT hoặc UPDATE record trống ─────────────────────
  const newCheckInData = {
    employeeId,
    workDate:       today,
    checkIn:        now,
    status:         'PENDING_CHECKOUT' as const,
    clockInSource:  payload.sourceType,
    clockOutSource: 'MANUAL',
    deviceId:       payload.deviceId ?? null,
    checkInLat:     payload.lat  ?? null,
    checkInLng:     payload.lng  ?? null,
    idempotencyKey,
    confirmSources: appendSource(null, payload.sourceType, now),
    lateMinutes:    0,
    earlyLeaveMinutes: 0,
    totalHours:     0,
    createdAt:      now,
    updatedAt:      now,
    // Legacy field
    location: (payload.lat && payload.lng)
      ? `${payload.lat},${payload.lng}`
      : null,
  };

  let record;
  if (existing) {
    // Record tồn tại nhưng chưa có checkIn (edge case: pre-created record)
    [record] = await db.update(attendance)
      .set(newCheckInData)
      .where(eq(attendance.id, existing.id))
      .returning();
  } else {
    // Insert mới — UNIQUE(idempotency_key) bảo vệ race condition
    // Nếu 2 request đến cùng lúc: 1 thành công, 1 bị UNIQUE VIOLATION → catch bên dưới
    try {
      [record] = await db.insert(attendance)
        .values(newCheckInData)
        .returning();
    } catch (insertErr: unknown) {
      // ── TẦNG 1: UNIQUE constraint bắt race condition ────────────────────
      const isUniqueViolation = insertErr instanceof Error
        && insertErr.message.includes('unique');
      if (isUniqueViolation) {
        // Lấy record vừa được insert bởi request kia
        const [raced] = await db.select().from(attendance)
          .where(eq(attendance.idempotencyKey, idempotencyKey)).limit(1);
        return NextResponse.json({
          ...raced,
          _idempotent: true,
          _message: 'Race condition detected — trả về record đã tồn tại',
        }, { status: 200 });
      }
      throw insertErr; // Re-throw nếu lỗi khác
    }
  }

  writeHrAuditLogAsync({
    action:     'EMPLOYEE_CLOCKED_IN',
    entityType: 'attendance',
    entityId:   record.id,
    actorId:    session.id,
    newValue:   {
      source:   payload.sourceType,
      deviceId: payload.deviceId,
      hasGps:   !!(payload.lat && payload.lng),
      checkIn:  now.toISOString(),
    },
  });

  return NextResponse.json(record, { status: 201 });
}

// ─────────────────────────────────────────────────────────────────────────────
// handleClockOut — Toàn bộ logic CLOCK_OUT + GPS Preservation
// ─────────────────────────────────────────────────────────────────────────────
async function handleClockOut(ctx: {
  existing:   typeof attendance.$inferSelect | undefined;
  employeeId: number;
  today:      string;
  now:        Date;
  payload:    ClockPayload;
  session:    { id: number };
}) {
  const { existing, now, payload, session } = ctx;

  // Chưa clock-in hôm nay
  if (!existing?.checkIn) {
    return NextResponse.json(
      { error: 'Bạn chưa chấm công vào hôm nay' },
      { status: 400 }
    );
  }

  // Đã clock-out rồi
  if (existing.checkOut) {
    const msSinceClockOut = now.getTime() - existing.checkOut.getTime();

    // Trong cửa sổ idempotency → IDEMPOTENT OK
    if (msSinceClockOut <= IDEMPOTENCY_WINDOW_MS) {
      const gpsResult = resolveGps({
        existingLat:    existing.checkOutLat ?? null,
        existingLng:    existing.checkOutLng ?? null,
        existingSource: existing.clockOutSource ?? 'MANUAL',
        newLat:         payload.lat,
        newLng:         payload.lng,
        newSource:      payload.sourceType,
      });

      const newConfirmSources = appendSource(
        existing.confirmSources, `${payload.sourceType}_OUT`, now
      );

      const updateData: Partial<typeof attendance.$inferInsert> = {
        confirmSources: newConfirmSources,
        updatedAt:      now,
      };
      if (gpsResult.shouldUpdate) {
        updateData.checkOutLat    = gpsResult.lat ?? undefined;
        updateData.checkOutLng    = gpsResult.lng ?? undefined;
        updateData.clockOutSource = payload.sourceType;
      }

      await db.update(attendance).set(updateData).where(eq(attendance.id, existing.id));

      writeHrAuditLogAsync({
        action: 'ATTENDANCE_DUPLICATE_CLOCK_OUT',
        entityType: 'attendance',
        entityId:    existing.id,
        actorId:     session.id,
        newValue:    { source: payload.sourceType, gpsUpdated: gpsResult.shouldUpdate },
      });

      return NextResponse.json({
        ...existing,
        _idempotent: true,
        _message:    `Đã clock-out trước đó (idempotent)`,
        _gpsAction:  gpsResult.shouldUpdate ? 'GPS_ENRICHED' : 'GPS_PRESERVED',
      }, { status: 200 });
    }

    // Ngoài cửa sổ → lỗi
    const hhmm = existing.checkOut.toLocaleTimeString('vi-VN', {
      hour: '2-digit', minute: '2-digit',
    });
    return NextResponse.json(
      { error: `Đã chấm công ra lúc ${hhmm}` },
      { status: 409 }
    );
  }

  // ── Chưa có checkOut → SET checkOut ─────────────────────────────────────
  // Tính sơ bộ (Rule Engine sẽ finalize vào lúc Cronjob 07:00)
  const rawWorkedMs  = now.getTime() - existing.checkIn.getTime();
  const totalHours   = Math.round((rawWorkedMs / 3_600_000) * 100) / 100;

  const gpsResult = resolveGps({
    existingLat:    existing.checkInLat ?? null,  // Dùng checkIn GPS như reference
    existingLng:    existing.checkInLng ?? null,
    existingSource: existing.clockInSource ?? 'MANUAL',
    newLat:         payload.lat,
    newLng:         payload.lng,
    newSource:      payload.sourceType,
  });

  const newConfirmSources = appendSource(
    existing.confirmSources, `${payload.sourceType}_OUT`, now
  );

  const [updated] = await db.update(attendance).set({
    checkOut:       now,
    totalHours,
    status:         'PENDING_CHECKOUT',  // Rule Engine sẽ update status chính xác
    clockOutSource: payload.sourceType,
    checkOutLat:    payload.lat  ?? null,
    checkOutLng:    payload.lng  ?? null,
    confirmSources: newConfirmSources,
    updatedAt:      now,
  }).where(eq(attendance.id, existing.id)).returning();

  writeHrAuditLogAsync({
    action:     'EMPLOYEE_CLOCKED_OUT',
    entityType: 'attendance',
    entityId:   existing.id,
    actorId:    session.id,
    newValue:   {
      source:     payload.sourceType,
      deviceId:   payload.deviceId,
      checkOut:   now.toISOString(),
      totalHours,
      hasGps:     !!(payload.lat && payload.lng),
    },
  });

  return NextResponse.json({
    ...updated,
    _triggerCalculation: true,  // Signal cho frontend gọi Rule Engine nếu muốn real-time
  }, { status: 200 });
}
