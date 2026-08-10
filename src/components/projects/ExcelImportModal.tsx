'use client';
// src/components/projects/ExcelImportModal.tsx
// ══════════════════════════════════════════════════════════════════════════
// Tính năng mới:
//  1. onDownloadTemplate() — sinh CSV BOM client-side, tải về ngay
//  2. ColumnMatcherGrid   — bảng đối chiếu cột Xanh/Đỏ trực quan
//  3. Import disabled nếu required cols thiếu
// ══════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { X, FileSpreadsheet, Download, Upload, CheckCircle2, AlertCircle, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  buildColumnMap, parseClientHeaders, UI_REQUIRED_COLUMNS,
  type ColumnMapResult,
} from '@/lib/import-parser';

interface ExcelImportModalProps {
  onClose: () => void;
  onSuccess?: () => void;
}

interface ImportResult {
  projectsImported: number;
  projectsUpdated?: number;   // Dự án đã tồn tại, được cập nhật cấu kiện
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

// ── 1. NỘI DUNG FILE MẪU CSV (có BOM UTF-8) ─────────────────────────────────
const CSV_TEMPLATE =
  '\uFEFF' +   // Byte Order Mark — Excel nhận dạng UTF-8 tiếng Việt
  'Mã dự án,Tên dự án,STT,Hạng mục,Vật liệu / Quy cách,Khối lượng,Đơn vị,Đơn giá,Tên công việc,Người phụ trách,Trạng thái,Ưu tiên,Ghi chú\r\n' +
  'DA-BM01,Văn phòng Chứng khoán Bảo Minh,,,,,,,,,,\r\n' +
  ',,1,Kệ tivi treo,"MDF chống ẩm phủ Melamine, hậu 9mm phụ kiện Hafele",2.3,md,850000,,,,,\r\n' +
  ',,2,Tủ bếp trên,"MDF chống ẩm phủ Acrylic bóng, bản lề Blum Clip-top",4.5,m2,1200000,,,,,\r\n' +
  ',,3,Vách ngăn kính,"Kính cường lực 10mm, khung nhôm sơn tĩnh điện",12.0,m2,950000,,,,,\r\n' +
  'DA-BM02,Nhà ở Anh Tuấn Bình Thạnh,,,,,,,,,,\r\n' +
  ',,1,Tủ quần áo,"MFC phủ Melamine vân gỗ, tay nắm âm Hafele",3.2,m2,950000,,,,,\r\n' +
  ',,2,Kệ đầu giường,"MDF sơn phủ PU trắng bóng, tích hợp đèn LED",1.8,md,650000,,,,,\r\n';

// ── 2. VISUAL COLUMN MATCHER COMPONENT ──────────────────────────────────────
function ColumnMatcherGrid({
  colMap,
  fileHeaders,
}: {
  colMap: ColumnMapResult;
  fileHeaders: string[];
}) {
  const requiredMissing = UI_REQUIRED_COLUMNS
    .filter(c => c.required && !colMap.fieldToColumn[c.field]);
  const canImport = requiredMissing.length === 0;

  return (
    <div style={{ marginBottom: 16 }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Search size={15} color="#3B82F6" />
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>
            Bảng đối chiếu cột
          </span>
          <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
            ({fileHeaders.length} cột trong file)
          </span>
        </div>
        {canImport ? (
          <span style={{
            fontSize: 11, padding: '3px 10px', borderRadius: 20,
            background: 'rgba(16,185,129,0.12)', color: '#10B981', fontWeight: 600,
          }}>✓ Sẵn sàng import</span>
        ) : (
          <span style={{
            fontSize: 11, padding: '3px 10px', borderRadius: 20,
            background: 'rgba(239,68,68,0.12)', color: '#EF4444', fontWeight: 600,
          }}>❌ Thiếu {requiredMissing.length} cột bắt buộc</span>
        )}
      </div>

      {/* Grid */}
      <div style={{
        border: '1px solid var(--color-border)', borderRadius: 10, overflow: 'hidden',
        fontSize: 12,
      }}>
        {/* Grid header row */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 100px',
          background: 'rgba(0,0,0,0.05)',
          padding: '7px 12px',
          fontWeight: 700, color: 'var(--color-text-muted)',
          fontSize: 11, letterSpacing: '0.05em',
        }}>
          <span>CỘT YÊU CẦU</span>
          <span>CỘT TRONG FILE CỦA BẠN</span>
          <span style={{ textAlign: 'center' }}>TRẠNG THÁI</span>
        </div>

        {UI_REQUIRED_COLUMNS.map((col, i) => {
          const matched = colMap.fieldToColumn[col.field];
          const isMatch   = !!matched;
          const isRequiredMissing = col.required && !isMatch;

          return (
            <div
              key={col.field}
              style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr 100px',
                padding: '9px 12px',
                background: isRequiredMissing
                  ? 'rgba(239,68,68,0.07)'
                  : isMatch
                    ? 'rgba(16,185,129,0.05)'
                    : 'transparent',
                borderTop: i > 0 ? '1px solid var(--color-border)' : 'none',
                transition: 'background 0.2s',
                alignItems: 'center',
              }}
            >
              {/* Cột trái: tên field yêu cầu */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>{col.label}</span>
                {col.required && (
                  <span style={{
                    fontSize: 9, padding: '1px 5px', borderRadius: 4,
                    background: 'rgba(239,68,68,0.15)', color: '#EF4444', fontWeight: 700,
                  }}>BẮT BUỘC</span>
                )}
              </div>

              {/* Cột phải: tên cột thực trong file */}
              <div style={{
                color: isMatch ? '#059669' : '#9CA3AF',
                fontFamily: 'monospace', fontSize: 12,
              }}>
                {matched ? `"${matched}"` : '—  chưa tìm thấy'}
              </div>

              {/* Trạng thái */}
              <div style={{ textAlign: 'center' }}>
                {isRequiredMissing ? (
                  <span style={{
                    fontSize: 10, padding: '2px 7px', borderRadius: 10,
                    background: 'rgba(239,68,68,0.15)', color: '#EF4444', fontWeight: 700,
                  }}>❌ Thiếu cột</span>
                ) : isMatch ? (
                  <span style={{
                    fontSize: 10, padding: '2px 7px', borderRadius: 10,
                    background: 'rgba(16,185,129,0.15)', color: '#10B981', fontWeight: 700,
                  }}>✓ Khớp</span>
                ) : (
                  <span style={{
                    fontSize: 10, padding: '2px 7px', borderRadius: 10,
                    background: 'rgba(245,158,11,0.12)', color: '#F59E0B', fontWeight: 600,
                  }}>⚠ Không bắt buộc</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Cột chưa nhận diện */}
      {colMap.unmappedHeaders.length > 0 && (
        <div style={{
          marginTop: 8, fontSize: 11, color: 'var(--color-text-muted)',
          padding: '6px 10px', background: 'rgba(0,0,0,0.04)', borderRadius: 6,
        }}>
          🔵 Cột không nhận diện được:{' '}
          {colMap.unmappedHeaders.map(h => (
            <span key={h} style={{
              display: 'inline-block', margin: '0 3px',
              padding: '1px 7px', background: 'rgba(0,0,0,0.06)',
              borderRadius: 4, fontFamily: 'monospace',
            }}>"{h}"</span>
          ))}
        </div>
      )}

      {/* Cảnh báo BLOCK khi thiếu required */}
      {!canImport && (
        <div style={{
          marginTop: 10, padding: '10px 14px',
          background: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8,
          fontSize: 12, color: '#EF4444', lineHeight: 1.7,
        }}>
          <strong>⛔ Không thể Import</strong> — File thiếu cột bắt buộc:{' '}
          {requiredMissing.map(c => <strong key={c.field}> "{c.label}"</strong>)}.
          <br />
          Đổi tên cột trong file Excel hoặc tải lại file mẫu để xem định dạng đúng.
        </div>
      )}
    </div>
  );
}

// ── MAIN COMPONENT ──────────────────────────────────────────────────────────
export default function ExcelImportModal({ onClose, onSuccess }: ExcelImportModalProps) {
  const router = useRouter();
  const [file,       setFile]      = useState<File | null>(null);
  const [loading,    setLoading]   = useState(false);
  const [parsing,    setParsing]   = useState(false);  // đang đọc headers file
  const [result,     setResult]    = useState<ImportResult | null>(null);
  const [apiError,   setApiError]  = useState<ImportError | null>(null);
  const [inputErr,   setInputErr]  = useState('');
  const [fileHeaders, setFileHeaders] = useState<string[]>([]);
  const [colMap,     setColMap]    = useState<ColumnMapResult | null>(null);

  // ── 1. Auto-detect headers khi user chọn file ─────────────────────────────
  useEffect(() => {
    if (!file) { setFileHeaders([]); setColMap(null); return; }
    setParsing(true);
    parseClientHeaders(file).then(headers => {
      setFileHeaders(headers);
      if (headers.length > 0) {
        setColMap(buildColumnMap(headers));
      } else {
        setColMap(null);
      }
      setParsing(false);
    });
  }, [file]);

  // Tính canImport từ colMap
  const canImport = !colMap
    ? false
    : UI_REQUIRED_COLUMNS
        .filter(c => c.required)
        .every(c => !!colMap.fieldToColumn[c.field]);

  // ── 1. DOWNLOAD TEMPLATE — CSV BOM client-side ────────────────────────────
  function onDownloadTemplate() {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'HomePro_Project_Template.csv';
    a.setAttribute('data-testid', 'template-download-anchor');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setInputErr('');
      setApiError(null);
    }
  }

  async function handleImport() {
    if (!file)       { setInputErr('Vui lòng chọn file trước'); return; }
    if (!canImport)  { setInputErr('File thiếu cột bắt buộc — xem bảng đối chiếu bên dưới'); return; }

    setLoading(true); setInputErr(''); setApiError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res  = await fetch('/api/import', { method: 'POST', body: formData });
      const data = await res.json();

      if (res.status === 422 || res.status === 400 || res.status === 500) {
        setApiError({
          error:     data.error   ?? 'Lỗi xử lý file',
          details:   data.details ?? [],
          columnLog: data.columnLog ?? [],
        });
        return;
      }
      if (!res.ok) { setApiError({ error: data.error ?? 'Lỗi không xác định' }); return; }

      setResult({
        projectsImported: data.projectsImported,
        projectsUpdated:  data.projectsUpdated ?? 0,
        tasksImported:    data.tasksImported,
        skippedRows:      data.skippedRows,
        encodingFixed:    data.encodingFixed,
        columnMap:        data.columnMap,
        warnings:         data.warnings,
      });
      if (onSuccess) onSuccess();
      router.refresh();
    } catch (err: unknown) {
      setApiError({ error: String(err) || 'Lỗi kết nối mạng' });
    } finally {
      setLoading(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ maxWidth: 680 }}>

        {/* Header */}
        <div className="modal-header">
          <div className="flex items-center gap-2">
            <FileSpreadsheet size={20} color="#10B981" />
            <h2 className="modal-title" style={{ fontSize: 18 }}>Nhập dữ liệu từ Excel / CSV</h2>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose} id="close-import-modal">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ maxHeight: '80vh', overflowY: 'auto' }}>

          {/* ── MÀN HÌNH THÀNH CÔNG ──────────────────────────────────────── */}
          {result && (
            <div style={{ textAlign: 'center', padding: '24px 16px' }}>
              <CheckCircle2 size={52} color="#10B981" style={{ margin: '0 auto 16px' }} />
              <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
                {result.projectsImported > 0 ? 'Import thành công!' : '✅ Cập nhật thành công!'}
              </h3>
              <p style={{ color: 'var(--color-text-muted)', fontSize: 14, marginBottom: 16 }}>
                {result.projectsImported > 0 ? (
                  <>
                    Đã thêm{' '}
                    <strong style={{ color: '#10B981' }}>{result.projectsImported} dự án mới</strong>{' '}và{' '}
                    <strong style={{ color: '#3B82F6' }}>{result.tasksImported} công việc</strong>.
                  </>
                ) : (
                  <>
                    Đã cập nhật dữ liệu cấu kiện cho{' '}
                    <strong style={{ color: '#10B981' }}>
                      {result.projectsUpdated ?? 1} dự án hiện tại
                    </strong>{' '}—{' '}
                    <strong style={{ color: '#3B82F6' }}>{result.tasksImported} công việc</strong> được nạp vào.
                  </>
                )}
              </p>
              {result.skippedRows != null && result.skippedRows > 0 && (
                <p style={{ fontSize: 12, color: '#F59E0B' }}>
                  ⚠️ {result.skippedRows} dòng bị bỏ qua (thiếu Mã/Tên dự án)
                </p>
              )}
              {result.encodingFixed && (
                <p style={{ fontSize: 12, color: '#6B7280' }}>
                  🔤 Tự động sửa lỗi font Windows-1258 → UTF-8
                </p>
              )}
              <button
                className="btn btn-primary"
                style={{ marginTop: 20 }}
                onClick={() => { onClose(); router.push('/projects'); router.refresh(); }}
              >
                🎉 Xem danh sách dự án
              </button>
            </div>
          )}

          {/* ── MÀN HÌNH LỖI 422 ─────────────────────────────────────────── */}
          {apiError && !result && (
            <div style={{ padding: '16px 0' }}>
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
                  <div style={{ fontSize: 13, lineHeight: 1.5 }}>{apiError.error}</div>
                </div>
              </div>
              {apiError.details && apiError.details.length > 0 && (
                <div style={{
                  fontSize: 12, lineHeight: 1.9,
                  background: 'rgba(0,0,0,0.04)', border: '1px solid var(--color-border)',
                  borderRadius: 8, padding: '12px 16px', marginBottom: 12,
                }}>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>📋 Chi tiết lỗi:</div>
                  {apiError.details.map((d, i) => <div key={i}>{d || <br />}</div>)}
                </div>
              )}
              {apiError.columnLog && apiError.columnLog.length > 0 && (
                <details style={{ marginBottom: 16 }}>
                  <summary style={{ cursor: 'pointer', fontSize: 12, color: '#6B7280' }}>
                    🔬 Log nhận diện cột (kỹ thuật viên)
                  </summary>
                  <pre style={{
                    fontSize: 11, marginTop: 8, padding: '8px 12px',
                    background: 'rgba(0,0,0,0.06)', borderRadius: 6,
                    overflowX: 'auto', whiteSpace: 'pre-wrap',
                    fontFamily: 'monospace',
                  }}>{apiError.columnLog.join('\n')}</pre>
                </details>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary" style={{ flex: 1 }}
                  onClick={() => { setApiError(null); setFile(null); }}>
                  🔄 Chọn file khác
                </button>
                <button className="btn btn-ghost" style={{ flex: 1 }}
                  onClick={onDownloadTemplate} id="retry-download-template-btn">
                  📥 Tải file mẫu
                </button>
              </div>
            </div>
          )}

          {/* ── MÀN HÌNH UPLOAD FILE ─────────────────────────────────────── */}
          {!result && !apiError && (
            <>
              {/* Lỗi client */}
              {inputErr && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
                  borderRadius: 8, padding: '10px 14px', marginBottom: 14,
                  fontSize: 13, color: '#EF4444',
                }}>
                  <AlertCircle size={16} /> {inputErr}
                </div>
              )}

              {/* Download template button */}
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 10, lineHeight: 1.6 }}>
                  Tải <strong>File mẫu CSV chuẩn</strong> (UTF-8 BOM, Excel đọc đúng tiếng Việt),
                  điền thông tin dự án &amp; hạng mục vào file, sau đó tải lên đây.
                  Hệ thống tự nhận diện tên cột linh hoạt (có dấu / không dấu / tiếng Anh).
                </p>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ width: '100%', justifyContent: 'center', gap: 8, marginBottom: 4 }}
                  onClick={onDownloadTemplate}
                  id="download-template-btn"
                >
                  <Download size={16} color="#10B981" />
                  📥 Tải File Mẫu CSV (UTF-8 BOM — Excel đọc đúng tiếng Việt)
                </button>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textAlign: 'center' }}>
                  Bao gồm 2 dự án mẫu + 5 hạng mục BOQ · {CSV_TEMPLATE.length} bytes
                </div>
              </div>

              {/* Dropzone */}
              <label
                htmlFor="excel-file-input"
                style={{
                  display: 'block',
                  border: file ? '2px dashed #10B981' : '2px dashed var(--color-border-light)',
                  borderRadius: 12, padding: '28px 20px', textAlign: 'center',
                  background: file ? 'rgba(16,185,129,0.06)' : 'rgba(31,41,55,0.4)',
                  cursor: 'pointer', transition: 'all 0.2s', marginBottom: 16,
                }}
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = '#3B82F6'; }}
                onDragLeave={(e) => { e.currentTarget.style.borderColor = file ? '#10B981' : 'var(--color-border-light)'; }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.style.borderColor = '#10B981';
                  const dropped = e.dataTransfer.files[0];
                  if (dropped && /\.(xlsx|xls|csv)$/i.test(dropped.name)) {
                    setFile(dropped); setInputErr(''); setApiError(null);
                  } else {
                    setInputErr('Chỉ hỗ trợ .xlsx, .xls, .csv');
                  }
                }}
              >
                <Upload size={30} color={file ? '#10B981' : '#3B82F6'} style={{ margin: '0 auto 10px' }} />
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
                  {file ? `✅ ${file.name}` : 'Nhấp hoặc kéo-thả file vào đây'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                  {file
                    ? `${(file.size / 1024).toFixed(1)} KB${parsing ? ' — Đang phân tích cột...' : ' — Sẵn sàng'}`
                    : 'Hỗ trợ .xlsx, .xls, .csv'}
                </div>
                <input
                  id="excel-file-input"
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />
              </label>

              {/* ── 2. VISUAL COLUMN MATCHER ─────────────────────────────── */}
              {file && !parsing && colMap && fileHeaders.length > 0 && (
                <ColumnMatcherGrid colMap={colMap} fileHeaders={fileHeaders} />
              )}

              {/* Đang parse headers */}
              {file && parsing && (
                <div style={{
                  textAlign: 'center', padding: '16px', fontSize: 13,
                  color: 'var(--color-text-muted)',
                }}>
                  <span className="spinner" style={{ display: 'inline-block', marginRight: 8 }} />
                  Đang phân tích cột từ file...
                </div>
              )}

              {/* Không đọc được headers (XLSX bị lỗi) */}
              {file && !parsing && fileHeaders.length === 0 && (
                <div style={{
                  padding: '10px 14px', fontSize: 12, color: '#F59E0B',
                  background: 'rgba(245,158,11,0.08)', borderRadius: 8, marginBottom: 12,
                }}>
                  ⚠️ Không đọc được tiêu đề cột từ file. Hệ thống sẽ cố gắng import và báo lỗi chi tiết nếu có.
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!result && !apiError && (
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Hủy</button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleImport}
              disabled={loading || !file || parsing || (fileHeaders.length > 0 && !canImport)}
              id="submit-excel-import-btn"
              style={{
                opacity: (fileHeaders.length > 0 && !canImport) ? 0.5 : 1,
              }}
              title={!canImport && fileHeaders.length > 0 ? 'File thiếu cột bắt buộc' : ''}
            >
              {loading ? <span className="spinner" /> : <Upload size={14} />}
              {loading
                ? 'Đang xử lý...'
                : !canImport && fileHeaders.length > 0
                  ? '⛔ Thiếu cột bắt buộc'
                  : `Nhập từ Excel${file ? ` (${(file.size / 1024).toFixed(0)} KB)` : ''}`
              }
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
