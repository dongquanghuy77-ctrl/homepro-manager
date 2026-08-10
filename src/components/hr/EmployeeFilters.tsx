'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import AddEmployeeModal from './AddEmployeeModal';
import EmployeeImportModal from './EmployeeImportModal';
import { FileDown, FileUp } from 'lucide-react';

const DEPARTMENTS = [
  'Xưởng gỗ',
  'Thi công',
  'Thiết kế',
  'Kế toán',
  'Quản lý',
  'Khác',
] as const;

export default function EmployeeFilters({ isViewer = false }: { isViewer?: boolean }) {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const [isModalOpen,       setIsModalOpen]       = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isExporting,       setIsExporting]       = useState(false);

  // Xuất file Excel
  async function handleExport() {
    setIsExporting(true);
    try {
      const res = await fetch('/api/hr/employees/export');
      if (!res.ok) { alert('Không thể xuất danh sách nhân viên'); return; }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      const date = new Date().toISOString().split('T')[0];
      a.download = `nhan-vien-${date}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { alert('Lỗi kết nối khi xuất file'); }
    finally  { setIsExporting(false); }
  }

  // Read current filter values from URL to preserve state
  const currentSearch = searchParams.get('search')     ?? '';
  const currentDept   = searchParams.get('department') ?? '';
  const currentStatus = searchParams.get('status')     ?? '';

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const params   = new URLSearchParams();

    const search     = (formData.get('search') as string).trim();
    const department = formData.get('department') as string;
    const status     = formData.get('status') as string;

    if (search)     params.set('search',     search);
    if (department) params.set('department', department);
    if (status)     params.set('status',     status);

    router.push(`/employees?${params.toString()}`);
  };

  const handleReset = () => {
    router.push('/employees');
  };

  const hasFilter = currentSearch || currentDept || currentStatus;

  return (
    <>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 className="card-title" style={{ margin: 0 }}>Tìm kiếm &amp; Lọc</h2>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Xuất Excel (Admin + Manager) */}
            {!isViewer && (
              <button
                id="export-employees-btn"
                className="btn btn-secondary"
                style={{ display: 'flex', gap: 5, alignItems: 'center', fontSize: 13 }}
                onClick={handleExport}
                disabled={isExporting}
                title="Tải xuống danh sách nhân viên dạng Excel"
              >
                <FileDown size={14} />
                {isExporting ? 'Đang xuất...' : 'Xuất Excel'}
              </button>
            )}
            {/* Import Excel (Admin only) */}
            {!isViewer && (
              <button
                id="import-employees-btn"
                className="btn btn-secondary"
                style={{ display: 'flex', gap: 5, alignItems: 'center', fontSize: 13, color: '#10B981', borderColor: '#10B98133' }}
                onClick={() => setIsImportModalOpen(true)}
                title="Import nhân viên hàng loạt từ file Excel"
              >
                <FileUp size={14} />
                Import Excel
              </button>
            )}
            {isViewer ? (
              <span style={{ fontSize: 12, color: 'var(--color-warning)',
                background: 'rgba(251,191,36,.12)', border: '1px solid rgba(251,191,36,.3)',
                borderRadius: 6, padding: '4px 10px' }}>
                👁️ Chế độ xem
              </span>
            ) : (
              <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
                + Thêm nhân viên
              </button>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
          {/* Tìm kiếm theo tên / mã NV */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Tìm kiếm</label>
            <input
              type="text"
              name="search"
              className="form-input"
              placeholder="Tên, Mã NV, SĐT..."
              defaultValue={currentSearch}
            />
          </div>

          {/* Lọc theo bộ phận */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Bộ phận</label>
            <select name="department" className="form-select" defaultValue={currentDept}>
              <option value="">Tất cả bộ phận</option>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Lọc theo trạng thái */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Trạng thái</label>
            <select name="status" className="form-select" defaultValue={currentStatus}>
              <option value="">Tất cả trạng thái</option>
              <option value="ACTIVE">Đang làm việc</option>
              <option value="INACTIVE">Đã nghỉ</option>
              <option value="ON_LEAVE">Đang nghỉ phép</option>
            </select>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="submit" className="btn btn-secondary" style={{ flex: 1 }}>
              🔍 Tìm
            </button>
            {hasFilter && (
              <button type="button" className="btn btn-ghost" onClick={handleReset} title="Xóa bộ lọc">
                ✕
              </button>
            )}
          </div>
        </form>
      </div>

      {!isViewer && isModalOpen && (
        <AddEmployeeModal onClose={() => setIsModalOpen(false)} />
      )}

      {/* Import Excel Modal */}
      {!isViewer && isImportModalOpen && (
        <EmployeeImportModal
          onClose={() => setIsImportModalOpen(false)}
          onImported={() => {
            // Refresh trang sau khi import xong
            router.refresh();
            setIsImportModalOpen(false);
          }}
        />
      )}
    </>
  );
}
