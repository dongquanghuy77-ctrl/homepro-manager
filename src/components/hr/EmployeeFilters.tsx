'use client';

import { useRouter } from 'next/navigation';
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

export default function EmployeeFilters({
  isViewer = false,
  onImported,
}: {
  isViewer?:   boolean;
  onImported?: () => void;  // callback khi import thành công → trigger SWR refresh
}) {
  const router = useRouter();
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

  // Không cần searchParams / handleSubmit / handleReset nữa
  // → Search đã được xử lý bởi EmployeeListClient với debounce + SWR

  return (
    <>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="card-title" style={{ margin: 0 }}>Quản lý Nhân viên</h2>
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
      </div>

      {!isViewer && isModalOpen && (
        <AddEmployeeModal onClose={() => setIsModalOpen(false)} />
      )}

      {/* Import Excel Modal */}
      {!isViewer && isImportModalOpen && (
        <EmployeeImportModal
          onClose={() => setIsImportModalOpen(false)}
          onImported={() => {
            setIsImportModalOpen(false);
            // Gọi SWR mutate() thay vì router.refresh() (SSR reload)
            onImported?.();
          }}
        />
      )}
    </>
  );
}
