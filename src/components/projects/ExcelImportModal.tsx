'use client';

import { useState } from 'react';
import { X, FileSpreadsheet, Download, Upload, CheckCircle2, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ExcelImportModalProps {
  onClose: () => void;
  onSuccess?: () => void;
}

// Kết quả trả về từ API — thành công hoặc lỗi 422
interface ImportResult {
  projectsImported: number;
  tasksImported:    number;
  skippedRows?:     number;
  encodingFixed?:   boolean;
  columnMap?:       Record<string, string>;
  warnings?:        string[];
}

interface ImportError {
  error:      string;
  details?:   string[];
  columnLog?: string[];
}

export default function ExcelImportModal({ onClose, onSuccess }: ExcelImportModalProps) {
  const router = useRouter();
  const [file,     setFile]    = useState<File | null>(null);
  const [loading,  setLoading] = useState(false);
  // Tách thành công / lỗi riêng biệt
  const [result,   setResult]  = useState<ImportResult | null>(null);
  const [apiError, setApiError]= useState<ImportError | null>(null);
  const [inputErr, setInputErr]= useState('');  // Lỗi client-side (chưa chọn file)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setInputErr('');
      setApiError(null);
    }
  }

  async function handleImport() {
    if (!file) { setInputErr('Vui lòng chọn file Excel hoặc CSV để nhập liệu'); return; }
    setLoading(true);
    setInputErr('');
    setApiError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res  = await fetch('/api/import', { method: 'POST', body: formData });
      const data = await res.json();

      // ── BƯỚC 3: Nhận 422 → hiển thị lỗi chi tiết ──────────────────────────
      if (res.status === 422 || res.status === 400 || res.status === 500) {
        setApiError({
          error:     data.error   ?? 'Lỗi xử lý file không xác định',
          details:   data.details ?? [],
          columnLog: data.columnLog ?? [],
        });
        return;
      }

      if (!res.ok) {
        setApiError({ error: data.error ?? 'Lỗi không xác định khi nhập file Excel' });
        return;
      }

      // ── Thành công ────────────────────────────────────────────────────────
      setResult({
        projectsImported: data.projectsImported,
        tasksImported:    data.tasksImported,
        skippedRows:      data.skippedRows,
        encodingFixed:    data.encodingFixed,
        columnMap:        data.columnMap,
        warnings:         data.warnings,
      });
      if (onSuccess) onSuccess();
      router.refresh();
    } catch (err: unknown) {
      setApiError({ error: String(err) || 'Lỗi kết nối mạng — không thể gọi API' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ maxWidth: 640 }}>
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

          {/* ── Màn hình THÀNH CÔNG ──────────────────────────────────────────── */}
          {result && (
            <div style={{ textAlign: 'center', padding: '24px 16px' }}>
              <CheckCircle2 size={52} color="#10B981" style={{ margin: '0 auto 16px' }} />
              <h3 style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text)', marginBottom: 8 }}>
                Nhập dữ liệu thành công!
              </h3>
              <p style={{ color: 'var(--color-text-muted)', fontSize: 14, marginBottom: 16 }}>
                Đã thêm{' '}
                <strong style={{ color: '#10B981' }}>{result.projectsImported} dự án mới</strong>{' '}
                và{' '}
                <strong style={{ color: '#3B82F6' }}>{result.tasksImported} công việc</strong>{' '}
                vào hệ thống.
              </p>

              {/* Thông tin thêm */}
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 20, lineHeight: 1.8 }}>
                {result.skippedRows != null && result.skippedRows > 0 && (
                  <div>⚠️ {result.skippedRows} dòng bị bỏ qua (thiếu Mã hoặc Tên dự án)</div>
                )}
                {result.encodingFixed && (
                  <div>🔤 Đã tự động sửa lỗi font mã hóa Windows-1258 → UTF-8</div>
                )}
                {result.warnings && result.warnings.length > 0 && (
                  <div>⚡ {result.warnings.length} cảnh báo nhỏ — xem console để biết chi tiết</div>
                )}
              </div>

              {/* Cột đã nhận diện */}
              {result.columnMap && Object.keys(result.columnMap).length > 0 && (
                <details style={{ textAlign: 'left', marginBottom: 16 }}>
                  <summary style={{ cursor: 'pointer', fontSize: 12, color: '#3B82F6' }}>
                    🔍 Xem cột đã nhận diện ({Object.keys(result.columnMap).length} cột)
                  </summary>
                  <div style={{ fontSize: 11, marginTop: 8, padding: '8px 12px', background: 'rgba(59,130,246,0.06)', borderRadius: 8 }}>
                    {Object.entries(result.columnMap).map(([field, col]) => (
                      <div key={field}>✅ <strong>{field}</strong> ← "{col}"</div>
                    ))}
                  </div>
                </details>
              )}

              <button
                className="btn btn-primary"
                onClick={() => { onClose(); router.push('/projects'); router.refresh(); }}
              >
                🎉 Xem danh sách dự án
              </button>
            </div>
          )}

          {/* ── Màn hình LỖI 422 / 400 / 500 ───────────────────────────────── */}
          {apiError && !result && (
            <div style={{ padding: '16px 0' }}>
              {/* Header lỗi */}
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: 12,
                background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
                borderRadius: 10, padding: '14px 16px', marginBottom: 16,
              }}>
                <AlertCircle size={24} color="#EF4444" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#EF4444', marginBottom: 4 }}>
                    Import thất bại
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--color-text)', lineHeight: 1.5 }}>
                    {apiError.error}
                  </div>
                </div>
              </div>

              {/* Chi tiết lỗi */}
              {apiError.details && apiError.details.length > 0 && (
                <div style={{
                  fontSize: 12, lineHeight: 1.9,
                  background: 'rgba(0,0,0,0.04)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 8, padding: '12px 16px', marginBottom: 12,
                }}>
                  <div style={{ fontWeight: 600, marginBottom: 6, color: 'var(--color-text)' }}>
                    📋 Chi tiết lỗi:
                  </div>
                  {apiError.details.map((d, i) => (
                    <div key={i} style={{ color: d.startsWith('  •') || d.startsWith('  ⚠') ? '#6b7280' : 'var(--color-text)' }}>
                      {d || <br />}
                    </div>
                  ))}
                </div>
              )}

              {/* Column matching log — collapsible */}
              {apiError.columnLog && apiError.columnLog.length > 0 && (
                <details style={{ marginBottom: 16 }}>
                  <summary style={{ cursor: 'pointer', fontSize: 12, color: '#6b7280' }}>
                    🔬 Xem log nhận diện cột (cho kỹ thuật viên)
                  </summary>
                  <pre style={{
                    fontSize: 11, marginTop: 8, padding: '8px 12px',
                    background: 'rgba(0,0,0,0.06)', borderRadius: 6,
                    overflowX: 'auto', whiteSpace: 'pre-wrap',
                    color: '#374151', fontFamily: 'monospace',
                  }}>
                    {apiError.columnLog.join('\n')}
                  </pre>
                </details>
              )}

              {/* Nút thử lại */}
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary" style={{ flex: 1 }}
                  onClick={() => { setApiError(null); setFile(null); }}>
                  🔄 Chọn file khác
                </button>
                <a href="/api/import/template" className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }}>
                  📥 Tải file mẫu
                </a>
              </div>
            </div>
          )}

          {/* ── Màn hình UPLOAD FILE (mặc định) ────────────────────────────── */}
          {!result && !apiError && (
            <>
              {inputErr && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
                  borderRadius: 8, padding: '10px 14px', marginBottom: 16,
                  fontSize: 13, color: '#EF4444',
                }}>
                  <AlertCircle size={16} /> {inputErr}
                </div>
              )}

              <div style={{ marginBottom: 20 }}>
                <p style={{ fontSize: 14, color: 'var(--color-text-muted)', marginBottom: 12, lineHeight: 1.6 }}>
                  Tải <strong>File mẫu Excel / CSV</strong> chuẩn của HomePro Manager, điền thông tin dự án &amp; công việc, rồi tải file lên đây.
                  Hệ thống tự động nhận diện tên cột linh hoạt (không cần khớp 100%).
                </p>
                <a
                  href="/api/import/template"
                  className="btn btn-secondary"
                  style={{ width: '100%', justifyContent: 'center', gap: 8, marginBottom: 4 }}
                  id="download-template-link"
                >
                  <Download size={16} color="#10B981" />
                  📥 Tải File Mẫu Excel (.csv)
                </a>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textAlign: 'center' }}>
                  Hỗ trợ cả tên cột tiếng Việt có dấu, không dấu, tiếng Anh
                </div>
              </div>

              {/* Dropzone */}
              <label
                htmlFor="excel-file-input"
                style={{
                  display: 'block',
                  border: file ? '2px dashed #10B981' : '2px dashed var(--color-border-light)',
                  borderRadius: 12, padding: '32px 20px', textAlign: 'center',
                  background: file ? 'rgba(16,185,129,0.06)' : 'rgba(31,41,55,0.4)',
                  cursor: 'pointer', transition: 'all 0.2s',
                }}
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = '#3B82F6'; }}
                onDragLeave={(e) => { e.currentTarget.style.borderColor = file ? '#10B981' : 'var(--color-border-light)'; }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.style.borderColor = '#10B981';
                  const dropped = e.dataTransfer.files[0];
                  if (dropped && (dropped.name.endsWith('.xlsx') || dropped.name.endsWith('.xls') || dropped.name.endsWith('.csv'))) {
                    setFile(dropped); setInputErr(''); setApiError(null);
                  } else {
                    setInputErr('Chỉ hỗ trợ file .xlsx, .xls, .csv');
                  }
                }}
              >
                <Upload size={32} color={file ? '#10B981' : '#3B82F6'} style={{ margin: '0 auto 12px' }} />
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)', marginBottom: 4 }}>
                  {file ? `✅ ${file.name}` : 'Nhấp hoặc kéo-thả file vào đây'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                  {file ? `${(file.size / 1024).toFixed(1)} KB — sẵn sàng nhập` : 'Hỗ trợ .xlsx, .xls, .csv'}
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

        {/* Footer — chỉ hiển thị khi chưa có kết quả / lỗi */}
        {!result && !apiError && (
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
              {loading ? 'Đang xử lý...' : 'Nhập từ Excel'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
