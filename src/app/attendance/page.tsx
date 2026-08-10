'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────
interface AttendanceRecord {
  id: number;
  employeeId: number;
  workDate: string;
  checkIn:  string | null;
  checkOut: string | null;
  status:   string;
  lateMinutes:       number | null;
  earlyLeaveMinutes: number | null;
  totalHours:        number | null;
  note:         string | null;
  location:     string | null;   // "lat,lng" from Geolocation API
  employeeName: string | null;
  employeeCode: string | null;
  department:   string | null;
}

interface EmployeeOption {
  id: number;
  name: string;
  employeeCode: string | null;
  department: string | null;
}

interface CurrentUser {
  id: number;
  name: string;
  role: string;
  employeeCode: string | null;
  department: string | null;
}

const DEPARTMENTS = ['Xưởng gỗ', 'Thi công', 'Thiết kế', 'Kế toán', 'Quản lý', 'Khác'] as const;

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  PRESENT:    { label: 'Có mặt',     bg: 'var(--color-success-bg)', color: 'var(--color-success)' },
  LATE:       { label: 'Đi trễ',     bg: 'var(--color-warning-bg)', color: 'var(--color-warning)' },
  ABSENT:     { label: 'Vắng',       bg: 'var(--color-danger-bg)',  color: 'var(--color-danger)' },
  HALF_DAY:   { label: 'Nửa ngày',   bg: '#fef9c3',                 color: '#a16207' },
  ON_LEAVE:   { label: 'Nghỉ phép',  bg: '#ede9fe',                 color: '#7c3aed' },
  NOT_CHECKED:{ label: 'Chưa chấm',  bg: 'var(--color-surface-3)',  color: 'var(--color-text-muted)' },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.NOT_CHECKED;
  return (
    <span className="badge" style={{ background: cfg.bg, color: cfg.color }}>
      {cfg.label}
    </span>
  );
}

function fmt(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

// PickerColumn: 1 c\u1ed9t scroll drum picker (c\u1ee9 \u0111\u01b0\u1edcng Ant Design Mobile)
const ITEM_H = 40; // px m\u1ed7i m\u1ee5c
const VISIBLE = 5; // s\u1ed1 m\u1ee5c hi\u1ec3n th\u1ecb

function PickerColumn({
  items, value, onChange, disabled,
}: {
  items: string[];
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  // Sync v\u1ecb tr\u00ed scroll khi value thay \u0111\u1ed5i t\u1eeb b\u00ean ngo\u00e0i
  useEffect(() => {
    const idx = items.indexOf(value);
    if (ref.current && idx >= 0) {
      ref.current.scrollTop = idx * ITEM_H;
    }
  }, [value, items]);

  const handleScroll = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (!ref.current) return;
      const idx = Math.round(ref.current.scrollTop / ITEM_H);
      const clamped = Math.max(0, Math.min(items.length - 1, idx));
      ref.current.scrollTo({ top: clamped * ITEM_H, behavior: 'smooth' });
      onChange(items[clamped]);
    }, 120);
  };

  return (
    <div style={{ position: 'relative', width: 56, flexShrink: 0 }}>
      {/* Fade mask tr\u00ean */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: ITEM_H * 2,
        background: 'linear-gradient(to bottom, rgba(255,255,255,.95) 30%, transparent)',
        pointerEvents: 'none', zIndex: 2,
      }} />
      {/* Fade mask d\u01b0\u1edbi */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: ITEM_H * 2,
        background: 'linear-gradient(to top, rgba(255,255,255,.95) 30%, transparent)',
        pointerEvents: 'none', zIndex: 2,
      }} />
      {/* Scrollable list */}
      <div ref={ref} onScroll={handleScroll} className="drum-scroll"
        style={{
          height: ITEM_H * VISIBLE,
          overflowY: disabled ? 'hidden' : 'scroll',
          WebkitOverflowScrolling: 'touch',
        }}>
        <div style={{ height: ITEM_H * 2 }} /> {/* top padding */}
        {items.map((item, i) => (
          <div key={item}
            onClick={() => {
              if (!ref.current || disabled) return;
              ref.current.scrollTo({ top: i * ITEM_H, behavior: 'smooth' });
              onChange(item);
            }}
            style={{
              height: ITEM_H,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: disabled ? 'not-allowed' : 'pointer',
              color: item === value ? '#2563EB' : '#9ca3af',
              fontWeight: item === value ? 800 : 400,
              fontSize: item === value ? 22 : 15,
              transition: 'color .1s, font-size .1s, font-weight .1s',
              userSelect: 'none',
            }}>
            {item}
          </div>
        ))}
        <div style={{ height: ITEM_H * 2 }} /> {/* bottom padding */}
      </div>
    </div>
  );
}

// TimePicker24: drum picker, n\u1ec1n tr\u1eafng, vi\u1ec1n xanh
function TimePicker24({
  value, onChange, disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const hours   = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
  const parts   = (value || '08:00').split(':');
  const hh = parts[0] || '08';
  const mm = parts[1] || '00';

  return (
    <>
      <style>{`.drum-scroll::-webkit-scrollbar{display:none}.drum-scroll{-ms-overflow-style:none;scrollbar-width:none}`}</style>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: '100%', position: 'relative',
        background: '#ffffff', border: '2px solid #2563EB',
        borderRadius: 12, overflow: 'hidden',
        opacity: disabled ? 0.55 : 1,
      }}>
        {/* D\u1ea3i highlight m\u1ee5c \u0111ang ch\u1ecdn (gi\u1eefa) */}
        <div style={{
          position: 'absolute', top: '50%', left: 0, right: 0,
          height: ITEM_H, transform: 'translateY(-50%)',
          background: 'rgba(37,99,235,.09)',
          borderTop: '1.5px solid rgba(37,99,235,.28)',
          borderBottom: '1.5px solid rgba(37,99,235,.28)',
          pointerEvents: 'none', zIndex: 1,
        }} />
        <PickerColumn items={hours} value={hh} disabled={disabled}
          onChange={h => onChange(`${h}:${mm}`)} />
        <span style={{
          fontSize: 26, fontWeight: 900, color: '#2563EB',
          padding: '0 6px', userSelect: 'none', zIndex: 3,
          lineHeight: 1,
        }}>:</span>
        <PickerColumn items={minutes} value={mm} disabled={disabled}
          onChange={m => onChange(`${hh}:${m}`)} />
      </div>
    </>
  );
}

// ── AddAttendanceModal ───────────────────────────────────────────────────────────────
function AddAttendanceModal({
  employees,
  currentUser,
  onClose,
  onSuccess,
}: {
  employees: EmployeeOption[];
  currentUser: CurrentUser | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' });

  // Phân quyền hiển thị:
  // ADMIN, MANAGER, VIEWER → thấy toàn bộ danh sách nhân viên
  // WORKER, SUPERVISOR    → chỉ thấy chính mình
  const canSeeAll = ['ADMIN', 'MANAGER', 'VIEWER'].includes(currentUser?.role ?? '');
  // VIEWER: chỉ xem, không thực hiện được tác vụ ghi
  const isViewer  = currentUser?.role === 'VIEWER';
  const visibleEmployees: EmployeeOption[] = canSeeAll
    ? employees
    : currentUser
      ? [{ id: currentUser.id, name: currentUser.name,
           employeeCode: currentUser.employeeCode, department: currentUser.department }]
      : [];

  // Controlled state (needed for live validation + dependency logic)
  // WORKER/SUPERVISOR: auto-select chính mình; còn lại: để trống tự chọn
  const [selEmployee, setSelEmployee] = useState(
    !canSeeAll && currentUser ? String(currentUser.id) : ''
  );
  const [selDate,     setSelDate]     = useState(today);
  const [selStatus,   setSelStatus]   = useState('PRESENT');
  const [checkIn,     setCheckIn]     = useState('');
  const [checkOut,    setCheckOut]    = useState('');
  const [note,        setNote]        = useState('');
  const [error,       setError]       = useState('');
  const [loading,     setLoading]     = useState(false);
  const [dupWarning,  setDupWarning]  = useState('');
  const [location,    setLocation]    = useState<string | null>(null);
  const [locStatus,   setLocStatus]   = useState<'idle'|'loading'|'ok'|'denied'|'error'>('idle');

  // BƯỚC 5: Idempotency Token — ngăn gửi trùng yêu cầu do mạng lag / bấm nhiều lần
  const [idempotencyKey] = useState(() => `atd-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const [submitCooldown, setSubmitCooldown] = useState(false); // block 10s sau khi bấm

  // ── GPS: Lấy tọa độ (phân biệt lỗi theo GeolocationPositionError.code) ────
  const getLocation = () => {
    if (!navigator.geolocation) { setLocStatus('error'); return; }
    setLocStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = `${pos.coords.latitude.toFixed(6)},${pos.coords.longitude.toFixed(6)}`;
        setLocation(coords);
        setLocStatus('ok');
      },
      // code 1 = PERMISSION_DENIED, code 2 = UNAVAILABLE, code 3 = TIMEOUT
      (err) => setLocStatus(err.code === 1 ? 'denied' : 'error'),
      { timeout: 10000, maximumAge: 0 }
    );
  };

  // ── FIX-1: ABSENT / ON_LEAVE → time fields disabled & cleared ─────────────
  const timeDisabled = selStatus === 'ABSENT' || selStatus === 'ON_LEAVE';
  useEffect(() => {
    if (timeDisabled) { setCheckIn(''); setCheckOut(''); }
  }, [timeDisabled]);

  // ── FIX-2 + FIX-3: Validate checkOut > checkIn + real-time total preview ──
  // Break: 12:00-13:00 (ISO 8601 interval intersection — trừ nghỉ trưa nếu ca làm trùng)
  const BREAK_START_MIN = 12 * 60; // 720
  const BREAK_END_MIN   = 13 * 60; // 780

  const { totalPreview, timeError } = useMemo(() => {
    if (!checkIn || !checkOut) return { totalPreview: null, timeError: null };
    const [ih, im] = checkIn.split(':').map(Number);
    const [oh, om] = checkOut.split(':').map(Number);
    const startMin = ih * 60 + im;
    const endMin   = oh * 60 + om;
    if (endMin <= startMin) return { totalPreview: null, timeError: 'Giờ ra phải sau giờ vào' };
    // Trừ phần nghỉ trưa trùng với ca làm (giống logic backend)
    const overlapMin = Math.max(0, Math.min(endMin, BREAK_END_MIN) - Math.max(startMin, BREAK_START_MIN));
    const actualMin  = endMin - startMin - overlapMin;
    return { totalPreview: (actualMin / 60).toFixed(1), timeError: null };
  }, [checkIn, checkOut, BREAK_START_MIN, BREAK_END_MIN]);

  // ── FIX-4: Real-time duplicate check (debounced 600ms) ────────────────────
  useEffect(() => {
    if (!selEmployee || !selDate) { setDupWarning(''); return; }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/hr/attendance?date=${selDate}&employeeId=${selEmployee}`);
        if (res.ok) {
          const data = await res.json() as AttendanceRecord[];
          setDupWarning(data.length > 0
            ? `⚠️ Nhân viên này đã có bản ghi chấm công ngày ${selDate}`
            : '');
        }
      } catch { /* silent */ }
    }, 600);
    return () => clearTimeout(t);
  }, [selEmployee, selDate]);

  // BƯỚC 5: fillNow gọi /api/server-time (chống gian lận giờ)
  const fillNow = async (field: 'in' | 'out') => {
    try {
      const res = await fetch('/api/server-time');
      if (res.ok) {
        const { time } = await res.json() as { time: string };
        if (field === 'in') setCheckIn(time);
        else setCheckOut(time);
        return;
      }
    } catch { /* fallback */ }
    // Fallback nếu server không phản hồi
    const fmt = new Intl.DateTimeFormat('en-CA', {
      hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Ho_Chi_Minh',
    });
    const [h, m] = fmt.format(new Date()).split(':');
    const t = `${h.padStart(2, '0')}:${m.padStart(2, '0')}`;
    if (field === 'in') setCheckIn(t);
    else setCheckOut(t);
  };

  // ── Submit + Idempotency (BƯỚC 5) ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitCooldown) return; // Chống spam submit
    setError('');
    if (!selEmployee) { setError('Vui lòng chọn nhân viên'); return; }
    if (!selDate)      { setError('Vui lòng chọn ngày');      return; }
    if (timeError)     { setError(timeError);                  return; }
    // FIX-1: PRESENT / LATE / HALF_DAY → giờ vào là bắt buộc
    if (!timeDisabled && !checkIn) {
      const label = selStatus === 'HALF_DAY' ? 'Nửa ngày' : selStatus === 'LATE' ? 'Đi trễ' : 'Có mặt';
      setError(`Trạng thái "${label}" yêu cầu nhập Giờ vào`);
      return;
    }
    // Khóa nút 10s — ngăn gửi trùng do mạng lag
    setSubmitCooldown(true);
    setTimeout(() => setSubmitCooldown(false), 10_000);
    setLoading(true);
    try {
      const res = await fetch('/api/hr/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId:     selEmployee,
          workDate:       selDate,
          status:         selStatus,
          note:           note.trim() || null,
          location:       location,
          idempotencyKey, // BƯỚC 5: Token độc nhất chống trùng request
          // +07:00 ensures server stores correct UTC equivalent of VN local time
          checkIn:  checkIn  ? `${selDate}T${checkIn}:00+07:00`  : null,
          checkOut: checkOut ? `${selDate}T${checkOut}:00+07:00` : null,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? 'Lỗi khi lưu chấm công');
        return;
      }
      onSuccess();
      onClose();
    } catch {
      setError('Không thể kết nối đến server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">Thêm bản ghi chấm công</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose} disabled={loading}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {/* ── Nhân viên — full width ───────────────────────────────────── */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Nhân viên *</label>
              {/* Nếu WORKER/SUPERVISOR: chỉ hiện chính mình (cờ disabled) */}
              {!canSeeAll && currentUser ? (
                <div className="form-input" style={{ cursor: 'not-allowed', opacity: 0.8 }}>
                  {currentUser.employeeCode ? `[${currentUser.employeeCode}] ` : ''}
                  {currentUser.name}{currentUser.department ? ` — ${currentUser.department}` : ''}
                </div>
              ) : (
                <select className="form-select" value={selEmployee}
                  onChange={e => setSelEmployee(e.target.value)} required>
                  <option value="">-- Chọn nhân viên --</option>
                  {visibleEmployees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.employeeCode ? `[${emp.employeeCode}] ` : ''}{emp.name}
                      {emp.department ? ` — ${emp.department}` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* ── FIX-4: Cảnh báo trùng ngày (real-time) ───────────────────── */}
            {dupWarning && (
              <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.35)',
                color: '#F59E0B', padding: '8px 12px', borderRadius: 8, fontSize: 13 }}>
                {dupWarning}
              </div>
            )}

            {/* ── Ngày + Trạng thái ─────────────────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <label className="form-label" style={{ margin: 0 }}>
                    Ngày&nbsp;<span style={{ color: 'var(--color-danger)' }}>*</span>
                  </label>
                  <button type="button" onClick={() => setSelDate(today)}
                    style={{ fontSize: 11, color: 'var(--color-primary)', background: 'none',
                      border: 'none', cursor: 'pointer', padding: 0 }}>
                    ⏱ Hôm nay
                  </button>
                </div>
                {/* FIX-5: max=today chặn ngày tương lai */}
                <input type="date" className="form-input" value={selDate}
                  max={today} onChange={e => setSelDate(e.target.value)} required />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Trạng thái</label>
                <select className="form-select" value={selStatus}
                  onChange={e => setSelStatus(e.target.value)}>
                  <option value="PRESENT">Có mặt</option>
                  <option value="LATE">Đi trễ</option>
                  <option value="ABSENT">Vắng</option>
                  <option value="HALF_DAY">Nửa ngày</option>
                  <option value="ON_LEAVE">Nghỉ phép</option>
                </select>
              </div>
            </div>

            {/* ── FIX-1: Giờ vào / Giờ ra — ẩn khi ABSENT / ON_LEAVE ───────── */}
            {!timeDisabled && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <label className="form-label" style={{ margin: 0 }}>
                      Giờ vào&nbsp;<span style={{ color: 'var(--color-danger)' }}>*</span>
                    </label>
                    {/* FIX-7: Fill current VN time */}
                    <button type="button" onClick={() => fillNow('in')}
                      style={{ fontSize: 11, color: 'var(--color-primary)', background: 'none',
                        border: 'none', cursor: 'pointer', padding: 0 }}>
                      ⏱ Hiện tại
                    </button>
                  </div>
                  <TimePicker24 value={checkIn} onChange={setCheckIn} />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <label className="form-label" style={{ margin: 0 }}>Giờ ra</label>
                    <button type="button" onClick={() => fillNow('out')}
                      style={{ fontSize: 11, color: 'var(--color-primary)', background: 'none',
                        border: 'none', cursor: 'pointer', padding: 0 }}>
                      ⏱ Hiện tại
                    </button>
                  </div>
                  <TimePicker24 value={checkOut} onChange={setCheckOut} />
                </div>
              </div>
            )}

            {/* ── FIX-2: Cảnh báo lỗi giờ ──────────────────────────────────── */}
            {timeError && (
              <div style={{ color: 'var(--color-danger)', fontSize: 13, display: 'flex', gap: 6 }}>
                ⚠️ {timeError}
              </div>
            )}

            {/* ── FIX-3: Preview tổng giờ real-time ────────────────────────── */}
            {totalPreview && !timeError && (
              <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)',
                borderRadius: 8, padding: '8px 14px', fontSize: 13, color: 'var(--color-success)',
                display: 'flex', alignItems: 'center', gap: 8 }}>
                ✅ Tổng giờ: <strong>{totalPreview}h</strong>
                {Number(totalPreview) > 8 && (
                  <span style={{ color: 'var(--color-warning)', fontSize: 12 }}>
                    · OT +{Math.round((Number(totalPreview) - 8) * 60)}ph
                  </span>
                )}
              </div>
            )}

            {/* ── Ghi chú ───────────────────────────────────────────────────── */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Ghi chú</label>
              <input type="text" className="form-input" placeholder="Ghi chú thêm..."
                value={note} onChange={e => setNote(e.target.value)} />
            </div>

            {/* ── Vị trí GPS ────────────────────────────────────────────────── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button type="button" onClick={getLocation} disabled={locStatus === 'loading'}
                  style={{ fontSize: 12, padding: '5px 10px', borderRadius: 6,
                    border: '1px solid var(--color-border)', background: 'var(--color-surface-2)',
                    color: 'var(--color-text)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                  {locStatus === 'loading' ? '⏳ Đang lấy...' : '📍 Lấy vị trí'}
                </button>
                {locStatus === 'ok' && location && (
                  <a href={`https://maps.google.com/?q=${location}`} target="_blank" rel="noreferrer"
                    style={{ fontSize: 12, color: 'var(--color-success)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    ✅ {location}
                  </a>
                )}
              </div>
              {/* Trình duyệt đã chặn — hướng dẫn + nhập thủ công */}
              {locStatus === 'denied' && (
                <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                  borderRadius: 8, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ fontSize: 12, color: 'var(--color-danger)', fontWeight: 500 }}>
                    ⚠️ Trình duyệt đã chặn quyền vị trí
                  </div>
                  <div style={{ fontSize: 11, opacity: 0.75, lineHeight: 1.5 }}>
                    Bật lại: nhấn icon <strong>🔒</strong> trên thanh địa chỉ trình duyệt
                    → <strong>Quyền trang web</strong> → <strong>Vị trí</strong> → <strong>Cho phép</strong> → tải lại trang.
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, opacity: 0.65, whiteSpace: 'nowrap' }}>Hoặc nhập tay:</span>
                    <input type="text" className="form-input" placeholder="10.776111,106.700981"
                      value={location ?? ''} onChange={e => setLocation(e.target.value || null)}
                      style={{ flex: 1, fontSize: 12, padding: '4px 8px', height: 32 }} />
                  </div>
                </div>
              )}
              {/* GPS không khả dụng — nhập thủ công */}
              {locStatus === 'error' && (
                <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                  borderRadius: 8, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ fontSize: 12, color: 'var(--color-danger)', fontWeight: 500 }}>
                    ⚠️ Không lấy được vị trí (GPS không khả dụng hoặc hết giờ chờ)
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, opacity: 0.65, whiteSpace: 'nowrap' }}>Nhập tay:</span>
                    <input type="text" className="form-input" placeholder="10.776111,106.700981"
                      value={location ?? ''} onChange={e => setLocation(e.target.value || null)}
                      style={{ flex: 1, fontSize: 12, padding: '4px 8px', height: 32 }} />
                  </div>
                </div>
              )}
            </div>

          </div>

          {error && (
            <div className="modal-body" style={{ paddingTop: 0 }}>
              <div className="alert alert-danger">{error}</div>
            </div>
          )}

          <div className="modal-footer" style={{ flexDirection: 'column', gap: 8, alignItems: 'stretch' }}>
            {isViewer && (
              <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--color-text-muted)',
                padding: '6px 12px', background: 'var(--color-surface-2)', borderRadius: 6 }}>
                🔒 Tài khoản Demo chỉ có quyền xem, không thể lưu dữ liệu
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" className="btn btn-ghost" onClick={onClose} disabled={loading}>Hủy</button>
              <button type="submit" className="btn btn-primary"
                disabled={loading || !!timeError || isViewer || submitCooldown}
                title={isViewer ? 'T\u00e0i kho\u1ea3n xem kh\u00f4ng th\u1ec3 th\u1ef1c hi\u1ec7n t\u00e1c v\u1ee5 n\u00e0y' : submitCooldown ? 'Vui l\u00f2ng ch\u1edd 10 gi\u00e2y tr\u01b0\u1edbc khi g\u1eedi l\u1ea1i' : ''}>
                {isViewer ? '\ud83d\udd12 Ch\u1ec9 xem' : loading ? '\u0110ang l\u01b0u...' : submitCooldown ? '\u23f3 \u0110\u1ee3i...' : '+ L\u01b0u ch\u1ea5m c\u00f4ng'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}


// ── EditAttendanceModal ───────────────────────────────────────────────────────
function EditAttendanceModal({
  record,
  onClose,
  onSuccess,
}: {
  record: AttendanceRecord;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [error,       setError]       = useState('');
  const [loading,     setLoading]     = useState(false);
  const [location,    setLocation]    = useState<string | null>(record.location ?? null);
  const [locStatus,   setLocStatus]   = useState<'idle'|'loading'|'ok'|'denied'|'error'>(
    record.location ? 'ok' : 'idle'
  );
  // Controlled time state (thông qua TimePicker24 — 24h format)
  const toHHmm = (iso: string | null) => {
    if (!iso) return '';
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  };
  const [editCheckIn,  setEditCheckIn]  = useState(toHHmm(record.checkIn));
  const [editCheckOut, setEditCheckOut] = useState(toHHmm(record.checkOut));

  const getLocation = () => {
    if (!navigator.geolocation) { setLocStatus('error'); return; }
    setLocStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = `${pos.coords.latitude.toFixed(6)},${pos.coords.longitude.toFixed(6)}`;
        setLocation(coords);
        setLocStatus('ok');
      },
      (err) => setLocStatus(err.code === 1 ? 'denied' : 'error'),
      { timeout: 10000, maximumAge: 0 }
    );
  };

  const toTimeInput = (iso: string | null) => {
    if (!iso) return '';
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const checkInVal  = editCheckIn.trim();
    const checkOutVal = editCheckOut.trim();

    const payload: Record<string, string | null> = {
      status:   fd.get('status') as string,
      note:     (fd.get('note') as string)?.trim() || null,
      location: location ?? null,
      // +07:00 suffix ensures server stores correct UTC equivalent of VN local time
      checkIn:  checkInVal  ? `${record.workDate}T${checkInVal}:00+07:00`  : null,
      checkOut: checkOutVal ? `${record.workDate}T${checkOutVal}:00+07:00` : null,
    };

    try {
      const res = await fetch(`/api/hr/attendance/${record.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? 'Lỗi khi cập nhật');
        return;
      }
      onSuccess();
      onClose();
    } catch {
      setError('Không thể kết nối đến server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">Sửa chấm công — {record.employeeName}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose} disabled={loading}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body grid-2">
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Ngày làm việc</label>
              <input type="text" className="form-input" value={record.workDate} disabled />
            </div>
            <div className="form-group">
              <label className="form-label">Trạng thái</label>
              <select name="status" className="form-select" defaultValue={record.status}>
                <option value="PRESENT">Có mặt</option>
                <option value="LATE">Đi trễ</option>
                <option value="ABSENT">Vắng</option>
                <option value="HALF_DAY">Nửa ngày</option>
                <option value="ON_LEAVE">Nghỉ phép</option>
                <option value="NOT_CHECKED">Chưa chấm</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Ghi chú</label>
              <input type="text" name="note" className="form-input" defaultValue={record.note ?? ''} />
            </div>
            <div className="form-group">
              <label className="form-label">Giờ vào</label>
              <TimePicker24 value={editCheckIn} onChange={setEditCheckIn} />
            </div>
            <div className="form-group">
              <label className="form-label">Giờ ra</label>
              <TimePicker24 value={editCheckOut} onChange={setEditCheckOut} />
            </div>
            {/* GPS location — full width */}
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Vị trí</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button type="button" onClick={getLocation} disabled={locStatus === 'loading'}
                    style={{ fontSize: 12, padding: '5px 10px', borderRadius: 6,
                      border: '1px solid var(--color-border)', background: 'var(--color-surface-2)',
                      color: 'var(--color-text)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                    {locStatus === 'loading' ? '⏳ Đang lấy...' : '📍 Cập nhật vị trí'}
                  </button>
                  {locStatus === 'ok' && location && (
                    <a href={`https://maps.google.com/?q=${location}`} target="_blank" rel="noreferrer"
                      style={{ fontSize: 12, color: 'var(--color-success)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      ✅ {location}
                    </a>
                  )}
                  {locStatus === 'idle' && !location && (
                    <span style={{ fontSize: 12, opacity: 0.5 }}>Chưa có vị trí</span>
                  )}
                </div>
                {locStatus === 'denied' && (
                  <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                    borderRadius: 8, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ fontSize: 12, color: 'var(--color-danger)', fontWeight: 500 }}>
                      ⚠️ Trình duyệt đã chặn quyền vị trí
                    </div>
                    <div style={{ fontSize: 11, opacity: 0.75, lineHeight: 1.5 }}>
                      Bật lại: nhấn icon <strong>🔒</strong> trên thanh địa chỉ
                      → <strong>Quyền trang web</strong> → <strong>Vị trí</strong> → <strong>Cho phép</strong> → tải lại trang.
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 11, opacity: 0.65, whiteSpace: 'nowrap' }}>Hoặc nhập tay:</span>
                      <input type="text" className="form-input" placeholder="10.776111,106.700981"
                        value={location ?? ''} onChange={e => setLocation(e.target.value || null)}
                        style={{ flex: 1, fontSize: 12, padding: '4px 8px', height: 32 }} />
                    </div>
                  </div>
                )}
                {locStatus === 'error' && (
                  <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                    borderRadius: 8, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ fontSize: 12, color: 'var(--color-danger)', fontWeight: 500 }}>
                      ⚠️ Không lấy được vị trí
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 11, opacity: 0.65, whiteSpace: 'nowrap' }}>Nhập tay:</span>
                      <input type="text" className="form-input" placeholder="10.776111,106.700981"
                        value={location ?? ''} onChange={e => setLocation(e.target.value || null)}
                        style={{ flex: 1, fontSize: 12, padding: '4px 8px', height: 32 }} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          {error && <div className="modal-body" style={{ paddingTop: 0 }}><div className="alert alert-danger">{error}</div></div>}
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={loading}>Hủy</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Đang lưu...' : '💾 Lưu thay đổi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AttendancePage() {
  // Use Vietnam timezone to avoid date mismatch after 17:00 UTC (= midnight VN+1)
  const today   = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' });
  const thisMonth = today.substring(0, 7); // YYYY-MM

  const [records,   setRecords]   = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [filterDate,       setFilterDate]       = useState(today);
  const [filterMonth,      setFilterMonth]      = useState('');
  const [filterEmployee,   setFilterEmployee]   = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [showAdd,       setShowAdd]       = useState(false);
  const [editRecord,    setEditRecord]    = useState<AttendanceRecord | null>(null);

  // Phân quyền trang chính: VIEWER — chỉ xem, không thêm/sửa (cứ đường GitHub Observer role)
  const isViewer = currentUser?.role === 'VIEWER';

  // Lấy thông tin người dùng hiện tại (cho dropdown filter theo role)
  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : { user: null })
      .then(data => setCurrentUser(data.user ?? null))
      .catch(() => setCurrentUser(null));
  }, []);

  // Load employee list for filter/modal
  useEffect(() => {
    fetch('/api/hr/employees')
      .then((r) => r.ok ? r.json() : [])
      .then((data: EmployeeOption[]) => setEmployees(data))
      .catch(() => setEmployees([]));
  }, []);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    const q = new URLSearchParams();
    if (filterDate && !filterMonth) q.set('date',       filterDate);
    if (filterMonth)                q.set('month',      filterMonth);
    if (filterEmployee)             q.set('employeeId', filterEmployee);
    if (filterDepartment)           q.set('department', filterDepartment);

    try {
      const res = await fetch(`/api/hr/attendance?${q.toString()}`);
      if (res.ok) setRecords(await res.json());
      else        setRecords([]);
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [filterDate, filterMonth, filterEmployee, filterDepartment]);

  useEffect(() => { loadRecords(); }, [loadRecords]);

  // ── Stats ──────────────────────────────────────────────────────────────────
  const totalEmployees = employees.length;
  const present  = records.filter((r) => r.status === 'PRESENT').length;
  const late     = records.filter((r) => r.status === 'LATE').length;
  const absent   = records.filter((r) => r.status === 'ABSENT').length;
  const onLeave  = records.filter((r) => r.status === 'ON_LEAVE').length;
  const checked  = records.filter((r) => r.status !== 'NOT_CHECKED' && r.status !== 'ABSENT').length;

  // ── Filter handlers ────────────────────────────────────────────────────────
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadRecords();
  };

  const handleReset = () => {
    setFilterDate(today);
    setFilterMonth('');
    setFilterEmployee('');
    setFilterDepartment('');
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Chấm công</h1>
          <p className="page-subtitle">Quản lý thời gian làm việc của nhân viên</p>
        </div>
        {isViewer ? (
          <span style={{ fontSize: 12, color: 'var(--color-warning)', background: 'rgba(251,191,36,.12)',
            border: '1px solid rgba(251,191,36,.3)', borderRadius: 6, padding: '4px 10px' }}>
            👁️ Chế độ xem — không thêm/sửa được
          </span>
        ) : (
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
            + Chấm công
          </button>
        )}
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Tổng NV',     value: totalEmployees, color: 'var(--color-primary)' },
          { label: 'Đã chấm',     value: checked,        color: 'var(--color-success)' },
          { label: 'Đi trễ',      value: late,           color: 'var(--color-warning)' },
          { label: 'Vắng mặt',    value: absent,         color: 'var(--color-danger)' },
          { label: 'Nghỉ phép',   value: onLeave,        color: '#7c3aed' },
        ].map((s) => (
          <div key={s.label} className="card" style={{ textAlign: 'center', padding: '1rem' }}>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '0.82rem', opacity: 0.65, marginTop: '0.25rem' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <form onSubmit={handleSearch}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Ngày</label>
              <input type="date" className="form-input" value={filterDate}
                onChange={(e) => { setFilterDate(e.target.value); setFilterMonth(''); }} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Tháng</label>
              <input type="month" className="form-input" value={filterMonth}
                onChange={(e) => { setFilterMonth(e.target.value); setFilterDate(''); }} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Nhân viên</label>
              <select className="form-select" value={filterEmployee}
                onChange={(e) => setFilterEmployee(e.target.value)}>
                <option value="">Tất cả NV</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.employeeCode ? `[${emp.employeeCode}] ` : ''}{emp.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Bộ phận</label>
              <select className="form-select" value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}>
                <option value="">Tất cả</option>
                {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="submit" className="btn btn-secondary" style={{ flex: 1 }}>🔍 Tìm</button>
              <button type="button" className="btn btn-ghost" onClick={handleReset} title="Đặt lại">✕</button>
            </div>
          </div>
        </form>
      </div>

      {/* Table */}
      <div className="card">
        {loading ? (
          <div className="empty-state"><div className="empty-state-text">Đang tải dữ liệu...</div></div>
        ) : records.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <div className="empty-state-text">Chưa có dữ liệu chấm công</div>
            <div className="empty-state-subtext">Nhấn <strong>+ Chấm công</strong> để thêm bản ghi</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Mã NV</th>
                  <th>Tên nhân viên</th>
                  <th>Bộ phận</th>
                  <th>Ngày</th>
                  <th>Giờ vào</th>
                  <th>Giờ ra</th>
                  <th>Tổng giờ</th>
                  <th>Trạng thái</th>
                  <th>Ghi chú</th>
                  <th style={{ textAlign: 'center' }}>Vị trí</th>
                  {!isViewer && <th style={{ textAlign: 'center' }}>Thao tác</th>}
                </tr>
              </thead>
              <tbody>
                {records.map((r, i) => (
                  <tr key={r.id}>
                    <td style={{ opacity: 0.5, fontSize: '0.8rem' }}>{i + 1}</td>
                    <td><code style={{ fontSize: '0.8rem' }}>{r.employeeCode ?? '—'}</code></td>
                    <td><strong>{r.employeeName ?? '—'}</strong></td>
                    <td>{r.department ?? '—'}</td>
                    <td>{r.workDate}</td>
                    <td>{fmt(r.checkIn)}</td>
                    <td>{fmt(r.checkOut)}</td>
                    <td>
                      {r.totalHours != null ? `${r.totalHours.toFixed(1)}h` : '—'}
                      {r.lateMinutes && r.lateMinutes > 0 ? (
                        <span style={{ marginLeft: '4px', fontSize: '0.75rem', color: 'var(--color-warning)', whiteSpace: 'nowrap' }}
                              title={`Đi trễ ${r.lateMinutes} phút`}>
                          ⚡ Trễ {r.lateMinutes}ph
                        </span>
                      ) : null}
                    </td>
                    <td><StatusBadge status={r.status} /></td>
                    <td style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.note ?? '—'}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {r.location ? (
                        <a href={`https://maps.google.com/?q=${r.location}`} target="_blank" rel="noreferrer"
                          title={r.location} style={{ fontSize: 16, textDecoration: 'none' }}>📍</a>
                      ) : <span style={{ opacity: 0.3 }}>—</span>}
                    </td>
                    <td>
                      {!isViewer && (
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => setEditRecord(r)}>
                            ✏️ Sửa
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {showAdd && (
        <AddAttendanceModal
          employees={employees}
          currentUser={currentUser}
          onClose={() => setShowAdd(false)}
          onSuccess={loadRecords}
        />
      )}
      {editRecord && (
        <EditAttendanceModal
          record={editRecord}
          onClose={() => setEditRecord(null)}
          onSuccess={loadRecords}
        />
      )}
    </div>
  );
}
