import { cookies } from 'next/headers';
import EmployeeFilters from '@/components/hr/EmployeeFilters';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// ── Types ─────────────────────────────────────────────────────────────────────
interface Employee {
  id: number;
  name: string;
  username: string;
  employeeCode: string | null;
  department: string | null;
  position: string | null;
  phone: string | null;
  email: string | null;
  employeeStatus: string | null;
  employmentType: string | null;
  joinDate: string | null;
  role: string;
  active: boolean;
}

// ── Lấy role người dùng hiện tại (cho VIEWER read-only UI) ─────────────────
async function getCurrentRole(): Promise<string> {
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get('homepro_session')?.value;
  const cookieHeader  = sessionCookie ? `homepro_session=${sessionCookie}` : '';
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  try {
    const res = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Cookie: cookieHeader }, cache: 'no-store',
    });
    if (!res.ok) return '';
    const data = await res.json();
    return data.user?.role ?? '';
  } catch { return ''; }
}

// ── Data fetching ─────────────────────────────────────────────────────────────
async function getEmployees(searchParams: Record<string, string | string[] | undefined>): Promise<Employee[]> {
  const cookieStore = cookies();
  // Fix: must extract the specific cookie value, NOT use toString() which returns '[object Object]'
  const sessionCookie = cookieStore.get('homepro_session')?.value;
  const cookieHeader  = sessionCookie ? `homepro_session=${sessionCookie}` : '';

  const query = new URLSearchParams();
  if (searchParams.search)     query.set('search',     String(searchParams.search));
  if (searchParams.department) query.set('department', String(searchParams.department));
  if (searchParams.status)     query.set('status',     String(searchParams.status));

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  try {
    const res = await fetch(`${baseUrl}/api/hr/employees?${query.toString()}`, {
      headers: { Cookie: cookieHeader },
      cache: 'no-store',
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
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

function StatusBadge({ status }: { status: string | null }) {
  const s = status ?? 'ACTIVE';
  const colors: Record<string, { bg: string; color: string }> = {
    ACTIVE:   { bg: 'var(--color-success-bg)', color: 'var(--color-success)' },
    INACTIVE: { bg: 'var(--color-danger-bg)',  color: 'var(--color-danger)' },
    ON_LEAVE: { bg: 'var(--color-warning-bg)', color: 'var(--color-warning)' },
  };
  const c = colors[s] ?? colors.ACTIVE;
  return (
    <span className="badge" style={{ background: c.bg, color: c.color }}>
      {STATUS_LABELS[s] ?? s}
    </span>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const employees = await getEmployees(searchParams);
  const role      = await getCurrentRole();
  const isViewer  = role === 'VIEWER';

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Quản lý Nhân viên</h1>
          <p className="page-subtitle">
            Danh sách nhân viên HomePro Manager
            {employees.length > 0 && (
              <span style={{ marginLeft: '8px', fontWeight: 600, color: 'var(--color-primary)' }}>
                ({employees.length} nhân viên)
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Search & Filter + Add button */}
      <EmployeeFilters isViewer={isViewer} />

      {/* Employee Table */}
      <div className="card" style={{ marginTop: '1.5rem' }}>
        {employees.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">👤</div>
            <div className="empty-state-text">Chưa có nhân viên nào</div>
            <div className="empty-state-subtext">
              Nhấn <strong>+ Thêm nhân viên</strong> để bắt đầu
            </div>
          </div>
        ) : (
          <div className="table-wrap">
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
                    <td>
                      <StatusBadge status={emp.employeeStatus} />
                    </td>
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
