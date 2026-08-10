'use client';

import { useState } from 'react';
import { X, FileSpreadsheet, Download, Upload, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ExcelImportModalProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export default function ExcelImportModal({ onClose, onSuccess }: ExcelImportModalProps) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ projectsImported: number; tasksImported: number } | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError('');
    }
  }

  async function handleImport() {
    if (!file) {
      setError('Vui lòng chọn file Excel hoặc CSV để nhập liệu');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/import', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Lỗi không xác định khi nhập file Excel');
      }

      setResult({
        projectsImported: data.projectsImported,
        tasksImported: data.tasksImported,
      });

      if (onSuccess) onSuccess();
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Lỗi xử lý file Excel');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <div className="modal-header">
          <div className="flex items-center gap-2">
            <FileSpreadsheet size={20} color="#10B981" />
            <h2 className="modal-title" style={{ fontSize: 18 }}>Nhập dữ liệu từ Excel / CSV</h2>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose} id="close-import-modal">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {result ? (
            <div style={{ textAlign: 'center', padding: '24px 16px' }}>
              <CheckCircle2 size={48} color="#10B981" style={{ margin: '0 auto 16px' }} />
              <h3 style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text)', marginBottom: 8 }}>
                Nhập dữ liệu thành công!
              </h3>
              <p style={{ color: 'var(--color-text-muted)', fontSize: 14, marginBottom: 20 }}>
                Đã thêm <strong style={{ color: '#10B981' }}>{result.projectsImported} dự án mới</strong> và{' '}
                <strong style={{ color: '#3B82F6' }}>{result.tasksImported} công việc</strong> vào hệ thống.
              </p>
              <button
                className="btn btn-primary"
                onClick={() => {
                  onClose();
                  router.push('/projects');
                  router.refresh();
                }}
              >
                🎉 Xem danh sách dự án
              </button>
            </div>
          ) : (
            <>
              {error && <div className="alert alert-danger mb-4">{error}</div>}

              <div style={{ marginBottom: 20 }}>
                <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: 12, lineHeight: 1.5 }}>
                  Anh có thể tải **File mẫu Excel / CSV** chuẩn của HomePro Manager, điền thông tin dự án & công việc vào Excel, sau đó tải file lên đây.
                </p>

                {/* Download Template Button */}
                <a
                  href="/api/import/template"
                  className="btn btn-secondary"
                  style={{ width: '100%', justifyContent: 'center', gap: 8, marginBottom: 20 }}
                  id="download-template-link"
                >
                  <Download size={16} color="#10B981" />
                  📥 Tải File Mẫu Excel (.csv / .xlsx)
                </a>
              </div>

              {/* Upload Box — dùng <label htmlFor> để mở file picker chuẩn */}
              <label
                htmlFor="excel-file-input"
                style={{
                  display: 'block',
                  border: file ? '2px dashed #10B981' : '2px dashed var(--color-border-light)',
                  borderRadius: 12,
                  padding: '32px 20px',
                  textAlign: 'center',
                  background: file ? 'rgba(16,185,129,0.06)' : 'rgba(31, 41, 55, 0.4)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = '#3B82F6'; }}
                onDragLeave={(e) => { e.currentTarget.style.borderColor = file ? '#10B981' : 'var(--color-border-light)'; }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.style.borderColor = '#10B981';
                  const dropped = e.dataTransfer.files[0];
                  if (dropped && (dropped.name.endsWith('.xlsx') || dropped.name.endsWith('.xls') || dropped.name.endsWith('.csv'))) {
                    setFile(dropped); setError('');
                  } else {
                    setError('Chỉ hỗ trợ file .xlsx, .xls, .csv');
                  }
                }}
              >
                <Upload size={32} color={file ? '#10B981' : '#3B82F6'} style={{ margin: '0 auto 12px' }} />
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)', marginBottom: 4 }}>
                  {file ? `✅ ${file.name}` : 'Nhấp hoặc kéo-thả file vào đây'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                  {file ? `${(file.size / 1024).toFixed(1)} KB` : 'Hỗ trợ định dạng `.xlsx`, `.xls`, `.csv`'}
                </div>
                <input
                  id="excel-file-input"
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />
              </label>


            </>
          )}
        </div>

        {!result && (
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Hủy
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleImport}
              disabled={loading || !file}
              id="submit-excel-import-btn"
            >
              {loading ? <span className="spinner" /> : <Upload size={14} />}
              Nhập từ Excel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
