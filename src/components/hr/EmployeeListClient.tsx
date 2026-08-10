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
import { Search, Loader2, RefreshCw, Users } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { useEmployees, type Employee } from '@/hooks/useEmployees';
import EmployeeFilters from './EmployeeFilters';

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
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
export default function EmployeeListClient({
  initialEmployees,
  isViewer,
}: EmployeeListClientProps) {
  // ── Filter states (raw — chưa debounce) ─────────────────────────────────
  const [rawSearch,     setRawSearch]     = useState('');
  const [department,    setDepartment]    = useState('');
  const [status,        setStatus]        = useState('');

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
                        <a
                          href={`/employees/${emp.id}`}
                          className="btn btn-ghost btn-sm"
                        >
                          Xem hồ sơ
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
