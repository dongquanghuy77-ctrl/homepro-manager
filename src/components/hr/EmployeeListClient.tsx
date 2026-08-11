'use client';
// src/components/hr/EmployeeListClient.tsx
// ══════════════════════════════════════════════════════════════════════════════
// Danh sách nhân viên với:
//   - Search debounce 400ms (không cần nhấn nút Tìm)
//   - SWR caching + keepPreviousData
//   - Filter: Bộ phận + Trạng thái (instant, không debounce vì dropdown)
//   - Hiển thị loading indicator nhẹ (skeleton dots) khi đang fetch
//   - onRefresh callback khi import/add thành công → trigger SWR mutate()
// ══════════════════════════════════════════════════════════════════════════════

import { useState, useCallback } from 'react';
import { Search, Loader2, RefreshCw, Users, KeyRound, Copy, Check } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { useEmployees, type Employee } from '@/hooks/useEmployees';
import EmployeeFilters from './EmployeeFilters';
import AuditLogDrawer from './AuditLogDrawer';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const DEPARTMENTS = [
  'Xưởng gỗ', 'Thi công', 'Thiết kế', 'Kế toán', 'Quản lý', 'Khác',
];

const STATUS_LABELS: Record<string, string> = {
  ACTIVE:   'Đang làm việc',
  INACTIVE: 'Đã nghỉ',
  ON_LEAVE: 'Đang nghỉ phép',
};

const TYPE_LABELS: Record<string, string> = {
  FULL_TIME: 'Toàn thời gian',
  PART_TIME: 'Bán thời gian',
  CONTRACT:  'Hợp đồng',
};

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  ACTIVE:   { bg: 'var(--color-success-bg)', color: 'var(--color-success)' },
  INACTIVE: { bg: 'var(--color-danger-bg)',  color: 'var(--color-danger)' },
  ON_LEAVE: { bg: 'var(--color-warning-bg)', color: 'var(--color-warning)' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────
interface EmployeeListClientProps {
  initialEmployees: Employee[];  // Dữ liệu SSR — render tức thì, không chờ SWR
  isViewer:         boolean;
  currentUserRole?:  string;      // Vai trò người dùng hiện tại (ADMIN, HR...)
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: Status Badge
// ─────────────────────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string | null }) {
  const s = status ?? 'ACTIVE';
  const c = STATUS_STYLES[s] ?? STATUS_STYLES.ACTIVE;
  return (
    <span className="badge" style={{ background: c.bg, color: c.color }}>
      {STATUS_LABELS[s] ?? s}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Type cho Drawer state
// ─────────────────────────────────────────────────────────────────────────────
interface AuditTarget {
  id:   number;
  name: string;
  code: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
export default function EmployeeListClient({
  initialEmployees,
  isViewer,
  currentUserRole,
}: EmployeeListClientProps) {
  // ── Filter states (raw — chưa debounce) ─────────────────────────────────
  const [rawSearch,     setRawSearch]     = useState('');
  const [department,    setDepartment]    = useState('');
  const [status,        setStatus]        = useState('');
  // Drawer: thông tin nhân viên được chọn để xem lịch sử
  const [auditTarget,   setAuditTarget]   = useState<AuditTarget | null>(null);

  // States for Reset PIN / Password credentials (HR Tooling)
  const [resetTarget,   setResetTarget]   = useState<Employee | null>(null);
  const [resetResult,   setResetResult]   = useState<{ type: 'PASSWORD' | 'PIN'; value: string } | null>(null);
  const [resetLoading,  setResetLoading]  = useState(false);
  const [copied,        setCopied]        = useState(false);
  const [resetError,    setResetError]    = useState('');
  const [resetTypeSelect, setResetTypeSelect] = useState<'PASSWORD' | 'PIN'>('PIN');

  // ── TẦNG 1: Debounce search 400ms ─────────────────────────────────────────
  // rawSearch thay đổi mỗi keystroke → debouncedSearch chỉ thay đổi sau 400ms dừng gõ
  // → SWR key chỉ thay đổi khi debouncedSearch thay đổi → không gọi API mỗi keystroke
  const debouncedSearch = useDebounce(rawSearch, 400);

  // ── TẦNG 2 + 3: SWR fetch với key-based invalidation + AbortController ───
  // Dropdown (department, status) không cần debounce vì không keystroke
  const { employees, isValidating, isError, refresh } = useEmployees(
    { search: debouncedSearch, department, status },
    initialEmployees
  );

  // ── Callback cho EmployeeFilters: sau import/add → force SWR refresh ─────
  const handleRefresh = useCallback(() => {
    refresh();
  }, [refresh]);

  // ── Đếm số filter đang active ─────────────────────────────────────────────
  const activeFilters = [debouncedSearch, department, status].filter(Boolean).length;

  async function handleResetCredentials() {
    if (!resetTarget) return;
    setResetLoading(true);
    setResetError('');
    setResetResult(null);
    setCopied(false);

    try {
      const res = await fetch(`/api/hr/employees/${resetTarget.id}/reset-credentials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: resetTypeSelect }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Reset thất bại');
      setResetResult({ type: data.type, value: data.generatedValue });
    } catch (err: any) {
      setResetError(err.message || 'Lỗi không xác định');
    } finally {
      setResetLoading(false);
    }
  }

  // ── Clear tất cả filter ───────────────────────────────────────────────────
  function clearFilters() {
    setRawSearch('');
    setDepartment('');
    setStatus('');
  }

  return (
    <div>
      {/* ── Add / Import / Export buttons ── */}
      <EmployeeFilters isViewer={isViewer} onImported={handleRefresh} />

      {/* ── Search bar ── */}
      <div className="card" style={{ marginTop: '1rem' }}>
        <div style={{
          display:        'grid',
          gridTemplateColumns: 'minmax(200px, 1fr) 180px 180px auto',
          gap:            12,
          alignItems:     'center',
        }}>

          {/* ──── Ô tìm kiếm (debounce 400ms) ──────────────────────────── */}
          <div style={{ position: 'relative' }}>
            <Search
              size={15}
              style={{
                position: 'absolute', left: 10, top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--color-text-muted)', pointerEvents: 'none',
              }}
            />
            <input
              id="employee-search-input"
              type="text"
              className="form-input"
              placeholder="Tên, Mã NV, SĐT... (tự tìm sau 400ms)"
              value={rawSearch}
              onChange={(e) => setRawSearch(e.target.value)}
              style={{ paddingLeft: 32 }}
              autoComplete="off"
            />
            {/* Spinner nhỏ bên phải khi đang validating */}
            {isValidating && rawSearch !== debouncedSearch && (
              <div style={{
                position: 'absolute', right: 10, top: '50%',
                transform: 'translateY(-50%)',
              }}>
                <Loader2 size={13} style={{ animation: 'spin 1s linear infinite', color: 'var(--color-primary)' }} />
              </div>
            )}
          </div>

          {/* ──── Lọc Bộ phận (instant) ──────────────────────────────── */}
          <select
            id="employee-dept-filter"
            className="form-select"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
          >
            <option value="">Tất cả bộ phận</option>
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          {/* ──── Lọc Trạng thái (instant) ───────────────────────────── */}
          <select
            id="employee-status-filter"
            className="form-select"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang làm việc</option>
            <option value="INACTIVE">Đã nghỉ</option>
            <option value="ON_LEAVE">Đang nghỉ phép</option>
          </select>

          {/* ──── Clear filter + Refresh ─────────────────────────────── */}
          <div style={{ display: 'flex', gap: 6 }}>
            {activeFilters > 0 && (
              <button
                className="btn btn-ghost btn-sm"
                onClick={clearFilters}
                title="Xóa bộ lọc"
                style={{ display: 'flex', gap: 4, alignItems: 'center', fontSize: 12 }}
              >
                ✕ ({activeFilters})
              </button>
            )}
            <button
              className="btn btn-ghost btn-icon btn-sm"
              onClick={() => refresh()}
              disabled={isValidating}
              title="Làm mới danh sách"
            >
              <RefreshCw size={14} style={{ animation: isValidating ? 'spin 1s linear infinite' : 'none' }} />
            </button>
          </div>
        </div>

        {/* ── Status bar ── */}
        <div style={{
          display:        'flex',
          justifyContent: 'space-between',
          alignItems:     'center',
          marginTop:      10,
          fontSize:       12,
          color:          'var(--color-text-muted)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Users size={13} />
            <span>
              <strong style={{ color: 'var(--color-text)' }}>{employees.length}</strong> nhân viên
              {activeFilters > 0 && (
                <span style={{ color: 'var(--color-primary)', marginLeft: 4 }}>
                  (đang lọc)
                </span>
              )}
            </span>
            {/* Loading indicator tinh tế */}
            {isValidating && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--color-primary)' }}>
                <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} />
                Đang cập nhật...
              </span>
            )}
          </div>
          {debouncedSearch && (
            <span>
              Kết quả tìm kiếm: "<strong>{debouncedSearch}</strong>"
            </span>
          )}
        </div>
      </div>

      {/* ── Employee Table ── */}
      <div className="card" style={{ marginTop: '1rem' }}>
        {isError ? (
          <div style={{
            textAlign: 'center', padding: '32px 0',
            color: 'var(--color-danger)',
          }}>
            <p style={{ fontWeight: 600 }}>⚠️ Lỗi tải danh sách nhân viên</p>
            <button className="btn btn-secondary" style={{ marginTop: 12 }} onClick={() => refresh()}>
              Thử lại
            </button>
          </div>
        ) : employees.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">👤</div>
            <div className="empty-state-text">
              {debouncedSearch || department || status
                ? `Không tìm thấy nhân viên phù hợp`
                : 'Chưa có nhân viên nào'}
            </div>
            {(debouncedSearch || department || status) && (
              <button
                className="btn btn-secondary"
                style={{ marginTop: 12, fontSize: 13 }}
                onClick={clearFilters}
              >
                Xóa bộ lọc
              </button>
            )}
          </div>
        ) : (
          <div className="table-wrap" style={{
            // Giữ opacity khi đang re-fetch (keepPreviousData UX)
            opacity:    isValidating ? 0.7 : 1,
            transition: 'opacity 0.2s ease',
          }}>
            <table>
              <thead>
                <tr>
                  <th>Mã NV</th>
                  <th>Họ tên</th>
                  <th>Bộ phận</th>
                  <th>Chức vụ</th>
                  <th>Điện thoại</th>
                  <th>Loại HĐ</th>
                  <th>Trạng thái</th>
                  <th style={{ textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => (
                  <tr key={emp.id}>
                    <td>
                      <code style={{ fontSize: '0.8rem', opacity: 0.8 }}>
                        {emp.employeeCode ?? '—'}
                      </code>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{emp.name}</div>
                      {emp.email && (
                        <div style={{ fontSize: '0.78rem', opacity: 0.6 }}>{emp.email}</div>
                      )}
                    </td>
                    <td>{emp.department ?? '—'}</td>
                    <td>{emp.position ?? '—'}</td>
                    <td>{emp.phone ?? '—'}</td>
                    <td>
                      <span style={{ fontSize: '0.82rem' }}>
                        {TYPE_LABELS[emp.employmentType ?? ''] ?? emp.employmentType ?? '—'}
                      </span>
                    </td>
                    <td><StatusBadge status={emp.employeeStatus} /></td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                        {/* Nút xem hồ sơ */}
                        <a
                          href={`/employees/${emp.id}`}
                          className="btn btn-ghost btn-sm"
                        >
                          Xem hồ sơ
                        </a>
                        {/* Nút lịch sử (chỉ Admin/Manager thấy) */}
                        {!isViewer && (
                          <button
                            id={`audit-log-btn-${emp.id}`}
                            className="btn btn-ghost btn-sm"
                            title="Xem lịch sử thay đổi"
                            onClick={() => setAuditTarget({
                              id:   emp.id,
                              name: emp.name,
                              code: emp.employeeCode,
                            })}
                            style={{ color: '#F59E0B' }}
                          >
                            🕒
                          </button>
                        )}
                        {/* Nút cấp lại PIN / Mật khẩu (chỉ Admin/HR thấy) */}
                        {(currentUserRole === 'ADMIN' || currentUserRole === 'HR') && (
                          <button
                            className="btn btn-ghost btn-sm"
                            title="Cấp lại PIN / Mật khẩu"
                            onClick={() => {
                              setResetTarget(emp);
                              setResetResult(null);
                              setResetError('');
                              setResetTypeSelect('PIN');
                            }}
                            style={{ color: '#10B981' }}
                          >
                            <KeyRound size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Audit Log Drawer (trượt từ mép phải) ── */}
      <AuditLogDrawer
        employeeId={auditTarget?.id   ?? 0}
        employeeName={auditTarget?.name ?? ''}
        employeeCode={auditTarget?.code ?? null}
        isOpen={auditTarget !== null}
        onClose={() => setAuditTarget(null)}
      />

      {/* ── Modal Cấp lại PIN / Mật khẩu (HR Tooling) ── */}
      {resetTarget && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(4px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16,
        }}>
          <div style={{
            background: 'var(--color-bg-card, #0F172A)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 16,
            padding: '24px 28px',
            maxWidth: 400,
            width: '100%',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
            fontFamily: '"Outfit", "Inter", sans-serif',
          }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text, #F8FAFC)', margin: '0 0 16px 0', textAlign: 'center' }}>
              Cấp lại Mã Truy Cập
            </h3>
            
            <p style={{ fontSize: 13, color: 'var(--color-text-muted, #94A3B8)', marginBottom: 20, textAlign: 'center' }}>
              Nhân viên: <strong style={{ color: 'var(--color-text, #F8FAFC)' }}>{resetTarget.name}</strong> ({resetTarget.employeeCode || 'Không có mã'})
            </p>

            {resetError && (
              <div className="alert alert-danger mb-4" style={{ fontSize: 13 }}>
                {resetError}
              </div>
            )}

            {!resetResult ? (
              <>
                <div className="form-group mb-4">
                  <label className="form-label">Chọn Loại Mã Cấp Lại</label>
                  <select
                    className="form-select"
                    value={resetTypeSelect}
                    onChange={(e) => setResetTypeSelect(e.target.value as any)}
                  >
                    <option value="PIN">Mã PIN (Cho Khối Sản Xuất - 6 Số)</option>
                    <option value="PASSWORD">Mật Khẩu (Cho Khối Văn Phòng)</option>
                  </select>
                </div>

                <div style={{
                  padding: '10px 12px',
                  background: 'rgba(245, 158, 11, 0.1)',
                  border: '1px solid rgba(245, 158, 11, 0.25)',
                  borderRadius: 10,
                  fontSize: 12,
                  color: '#F59E0B',
                  lineHeight: '1.4',
                  marginBottom: 20,
                }}>
                  ⚠️ <strong>Chính sách bảo mật:</strong> Hệ thống sẽ ép buộc đổi mật khẩu/PIN ở lần đăng nhập tiếp theo của tài khoản này để bảo mật.
                </div>

                <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setResetTarget(null)}
                    disabled={resetLoading}
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleResetCredentials}
                    disabled={resetLoading}
                  >
                    {resetLoading ? 'Đang cấp lại...' : 'Xác nhận cấp lại'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{
                  textAlign: 'center',
                  padding: '16px 20px',
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  borderRadius: 12,
                  marginBottom: 20,
                }}>
                  <div style={{ fontSize: 13, color: '#10B981', fontWeight: 600, marginBottom: 8 }}>
                    Đã cấp lại thành công {resetResult.type === 'PIN' ? 'Mã PIN' : 'Mật khẩu'}!
                  </div>
                  <div style={{
                    fontSize: 24,
                    fontWeight: 800,
                    letterSpacing: '0.1em',
                    color: '#F8FAFC',
                    fontFamily: 'monospace',
                    padding: '8px 12px',
                    background: 'rgba(0,0,0,0.3)',
                    borderRadius: 8,
                    display: 'inline-block',
                  }}>
                    {resetResult.value}
                  </div>
                </div>

                <div style={{
                  fontSize: 11,
                  color: '#94A3B8',
                  lineHeight: '1.4',
                  textAlign: 'center',
                  marginBottom: 20,
                }}>
                  Hãy copy mã này gửi cho nhân viên. Yêu cầu bắt buộc đổi mã ở lần truy cập tới đã được bật.
                </div>

                <div style={{ display: 'flex', gap: 12 }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ flex: 1, display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center' }}
                    onClick={() => {
                      navigator.clipboard.writeText(resetResult.value);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                  >
                    {copied ? <Check size={16} color="#10B981" /> : <Copy size={16} />}
                    <span>{copied ? 'Đã copy' : 'Copy mã'}</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ flex: 1 }}
                    onClick={() => setResetTarget(null)}
                  >
                    Đóng
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
