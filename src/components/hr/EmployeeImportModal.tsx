'use client';
// src/components/hr/EmployeeImportModal.tsx
// ══════════════════════════════════════════════════════════════════════════════
// Import Excel Nhân viên — Drag & Drop + Preview + Upsert
//
// Luồng UX:
//   [Kéo thả / Chọn file] → [Parse Excel client-side] → [Preview table]
//   → [Validate client] → [Xác nhận Import] → [Gọi API upsert]
//   → [Hiển thị kết quả: created / updated / errors]
// ══════════════════════════════════════════════════════════════════════════════

import { useState, useRef, useCallback } from 'react';
import {
  X, Upload, FileSpreadsheet, CheckCircle2,
  AlertTriangle, Loader2, Download, RefreshCw,
} from 'lucide-react';
import type { EmployeeImportRow, RowError } from '@/app/api/hr/employees/import/route';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const MAX_FILE_MB   = 5;
const MAX_FILE_BYTE = MAX_FILE_MB * 1024 * 1024;
const MAX_ROWS      = 500;

// Mapping header tiếng Việt → field name
const HEADER_MAP: Record<string, keyof EmployeeImportRow> = {
  'mã nv':        'employeeCode',
  'ma nv':        'employeeCode',
  'mã nhân viên': 'employeeCode',
  'ma nhan vien': 'employeeCode',
  'employee code':'employeeCode',
  'họ tên':       'name',
  'ho ten':       'name',
  'họ và tên':    'name',
  'name':         'name',
  'chức vụ':      'position',
  'chuc vu':      'position',
  'position':     'position',
  'bộ phận':      'department',
  'bo phan':      'department',
  'department':   'department',
  'sdt':          'phone',
  'số điện thoại':'phone',
  'phone':        'phone',
  'email':        'email',
  'ngày sinh':    'birthDate',
  'ngay sinh':    'birthDate',
  'birth date':   'birthDate',
  'ngày vào':     'joinDate',
  'ngay vao':     'joinDate',
  'join date':    'joinDate',
  'loại hđ':      'employmentType',
  'loai hd':      'employmentType',
  'employment type':'employmentType',
  'trạng thái':   'employeeStatus',
  'trang thai':   'employeeStatus',
  'status':       'employeeStatus',
  'ghi chú':      'note',
  'ghi chu':      'note',
  'note':         'note',
};

// Normalize: bỏ dấu, lowercase, trim
function normHeader(s: string): string {
  return s
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase().trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// Import result type
// ─────────────────────────────────────────────────────────────────────────────
interface ImportResult {
  created: number;
  updated: number;
  skipped: number;
  errors:  RowError[];
  total:   number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────
interface EmployeeImportModalProps {
  onClose:    () => void;
  onImported: () => void;  // callback để refresh danh sách sau khi import
}

type Step = 'upload' | 'preview' | 'importing' | 'result';

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
export default function EmployeeImportModal({ onClose, onImported }: EmployeeImportModalProps) {
  const [step,      setStep]      = useState<Step>('upload');
  const [parseErr,  setParseErr]  = useState('');
  const [isDragging,setIsDragging]= useState(false);
  const [fileName,  setFileName]  = useState('');
  const [rows,      setRows]      = useState<EmployeeImportRow[]>([]);
  const [result,    setResult]    = useState<ImportResult | null>(null);
  const [apiErr,    setApiErr]    = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Parse Excel file → EmployeeImportRow[] ────────────────────────────────
  const parseExcel = useCallback(async (file: File) => {
    setParseErr('');

    // Guard: file type
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      setParseErr('Chỉ hỗ trợ file .xlsx hoặc .xls');
      return;
    }
    // Guard: file size
    if (file.size > MAX_FILE_BYTE) {
      setParseErr(`File quá lớn (${(file.size / 1024 / 1024).toFixed(1)} MB). Giới hạn ${MAX_FILE_MB} MB.`);
      return;
    }

    setFileName(file.name);

    try {
      // Dynamic import xlsx để không block SSR
      const XLSX = await import('xlsx');
      const buf  = await file.arrayBuffer();
      const wb   = XLSX.read(buf, { type: 'array' });
      const ws   = wb.Sheets[wb.SheetNames[0]];  // Sheet đầu tiên
      const raw  = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
        defval:    '',
        raw:       false,  // Tất cả về string
        blankrows: false,
      });

      if (raw.length === 0) {
        setParseErr('File Excel trống hoặc không có dữ liệu');
        return;
      }
      if (raw.length > MAX_ROWS) {
        setParseErr(`File có ${raw.length} dòng, vượt quá giới hạn ${MAX_ROWS} nhân viên / lần import`);
        return;
      }

      // Map headers → fields
      const firstRow = raw[0];
      const keyMap: Record<string, keyof EmployeeImportRow> = {};
      for (const excelKey of Object.keys(firstRow)) {
        const mapped = HEADER_MAP[normHeader(excelKey)];
        if (mapped) keyMap[excelKey] = mapped;
      }

      // Check employeeCode và name column tồn tại
      const hasCode = Object.values(keyMap).includes('employeeCode');
      const hasName = Object.values(keyMap).includes('name');
      if (!hasCode || !hasName) {
        setParseErr(
          `Không tìm thấy cột bắt buộc trong file. Cần có cột "Mã NV" và "Họ tên".\n` +
          `Các cột tìm thấy: ${Object.keys(firstRow).join(', ')}`
        );
        return;
      }

      // Map rows
      const parsed: EmployeeImportRow[] = raw.map((r) => {
        const out: Partial<EmployeeImportRow> = {};
        for (const [excelKey, field] of Object.entries(keyMap)) {
          (out as Record<string, unknown>)[field] = String(r[excelKey] ?? '').trim();
        }
        return out as EmployeeImportRow;
      }).filter((r) => r.employeeCode && r.name);  // Bỏ dòng trống

      if (parsed.length === 0) {
        setParseErr('Không có dòng dữ liệu hợp lệ nào (cần ít nhất Mã NV + Họ tên)');
        return;
      }

      setRows(parsed);
      setStep('preview');
    } catch (err) {
      setParseErr(`Lỗi đọc file Excel: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, []);

  // ── Drag & Drop handlers ───────────────────────────────────────────────────
  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }
  function handleDragLeave() { setIsDragging(false); }
  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) parseExcel(file);
  }
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) parseExcel(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  // ── Gọi API Import ─────────────────────────────────────────────────────────
  async function handleImport() {
    setStep('importing');
    setApiErr('');

    try {
      const res = await fetch('/api/hr/employees/import', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ rows }),
      });

      const data = await res.json();

      if (!res.ok) {
        setApiErr(data.error || `Lỗi server ${res.status}`);
        setStep('preview');
        return;
      }

      setResult(data as ImportResult);
      setStep('result');

      // Nếu có tạo/cập nhật ít nhất 1 → refresh danh sách
      if ((data.created ?? 0) + (data.updated ?? 0) > 0) {
        onImported();
      }
    } catch (err) {
      setApiErr(`Lỗi kết nối: ${err instanceof Error ? err.message : 'Không thể gọi API'}`);
      setStep('preview');
    }
  }

  // ── Download template ──────────────────────────────────────────────────────
  async function handleDownloadTemplate() {
    const a = document.createElement('a');
    a.href  = '/api/hr/employees/export';
    a.download = 'template-nhan-vien.xlsx';
    a.click();
  }

  // ── Reset ──────────────────────────────────────────────────────────────────
  function reset() {
    setStep('upload');
    setRows([]);
    setResult(null);
    setParseErr('');
    setApiErr('');
    setFileName('');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal modal-xl" style={{ maxWidth: 860, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>

        {/* ── Header ── */}
        <div className="modal-header" style={{ flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <FileSpreadsheet size={22} style={{ color: '#10B981' }} />
            <div>
              <h2 className="modal-title">Import Nhân viên từ Excel</h2>
              <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: 0 }}>
                {step === 'upload'    && 'Tải lên file .xlsx để import hàng loạt (Upsert)'}
                {step === 'preview'   && `Xem trước ${rows.length} nhân viên — kiểm tra trước khi xác nhận`}
                {step === 'importing' && 'Đang import vào database...'}
                {step === 'result'    && 'Kết quả import'}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {step === 'upload' && (
              <button
                className="btn btn-secondary"
                style={{ fontSize: 12, display: 'flex', gap: 5, alignItems: 'center' }}
                onClick={handleDownloadTemplate}
                title="Tải file Excel mẫu để điền dữ liệu"
              >
                <Download size={13} /> Tải mẫu Excel
              </button>
            )}
            <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
          </div>
        </div>

        {/* ── Step indicators ── */}
        <div style={{ padding: '8px 24px', borderBottom: '1px solid var(--color-border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 0 }}>
            {(['upload', 'preview', 'result'] as const).map((s, i) => {
              const labels = ['1. Tải file', '2. Xem trước', '3. Kết quả'];
              const isDone = (step === 'preview' && i === 0) ||
                             (step === 'importing' && i <= 1) ||
                             (step === 'result' && i <= 2);
              const isActive = step === s || (step === 'importing' && s === 'preview');
              return (
                <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 4, marginRight: 16 }}>
                  <div style={{
                    width:        20, height: 20, borderRadius: '50%',
                    background:   isDone ? '#10B981' : isActive ? '#2563EB' : 'var(--color-surface-raised)',
                    display:      'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize:     10, fontWeight: 700,
                    color:        isDone || isActive ? '#fff' : 'var(--color-text-muted)',
                  }}>{i + 1}</div>
                  <span style={{ fontSize: 11, color: isActive ? 'var(--color-text)' : 'var(--color-text-muted)', fontWeight: isActive ? 600 : 400 }}>
                    {labels[i]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Body ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>

          {/* ── STEP: Upload ── */}
          {step === 'upload' && (
            <div>
              <input ref={fileInputRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleFileChange} />

              {/* Dropzone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border:       `2px dashed ${isDragging ? '#2563EB' : 'var(--color-border)'}`,
                  borderRadius: 12,
                  padding:      '48px 24px',
                  textAlign:    'center',
                  cursor:       'pointer',
                  background:   isDragging ? '#2563EB11' : 'var(--color-surface-raised)',
                  transition:   'all 0.2s',
                  marginBottom: 20,
                }}
              >
                <FileSpreadsheet size={48} style={{ color: isDragging ? '#2563EB' : '#10B981', marginBottom: 12 }} />
                <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>
                  {isDragging ? 'Thả file vào đây!' : 'Kéo thả file Excel hoặc click để chọn'}
                </p>
                <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 16 }}>
                  Hỗ trợ .xlsx, .xls · Tối đa {MAX_FILE_MB} MB · Tối đa {MAX_ROWS} nhân viên
                </p>

                {/* Format hint */}
                <div style={{
                  display: 'inline-block', textAlign: 'left',
                  background: 'var(--color-bg)', borderRadius: 8,
                  padding: '10px 16px', fontSize: 11, fontFamily: 'monospace',
                }}>
                  <div style={{ color: '#10B981', fontWeight: 700, marginBottom: 4 }}>Cột bắt buộc:</div>
                  <span style={{ color: '#F59E0B' }}>Mã NV</span>
                  {' | '}
                  <span style={{ color: '#F59E0B' }}>Họ tên</span>
                  <div style={{ color: 'var(--color-text-muted)', marginTop: 4 }}>
                    Cột tùy chọn: Chức vụ | Bộ phận | SĐT | Email | Ngày sinh | Ngày vào | Loại HĐ | Trạng thái
                  </div>
                </div>
              </div>

              {/* Parse error */}
              {parseErr && (
                <div style={{
                  background: '#EF444411', border: '1px solid #EF444444',
                  borderRadius: 8, padding: '12px 16px',
                  color: '#EF4444', fontSize: 13,
                  display: 'flex', gap: 8, alignItems: 'flex-start',
                }}>
                  <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                  <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{parseErr}</pre>
                </div>
              )}
            </div>
          )}

          {/* ── STEP: Preview ── */}
          {(step === 'preview' || step === 'importing') && (
            <div>
              {/* File info + API error */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FileSpreadsheet size={16} style={{ color: '#10B981' }} />
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{fileName}</span>
                  <span style={{
                    background: '#2563EB22', color: '#2563EB',
                    borderRadius: 4, padding: '1px 8px', fontSize: 11, fontWeight: 700,
                  }}>{rows.length} nhân viên</span>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={reset} style={{ fontSize: 11, display: 'flex', gap: 4 }}>
                  <RefreshCw size={12} /> Chọn file khác
                </button>
              </div>

              {apiErr && (
                <div style={{
                  background: '#EF444411', border: '1px solid #EF444444',
                  borderRadius: 8, padding: '10px 14px', marginBottom: 12,
                  color: '#EF4444', fontSize: 12, display: 'flex', gap: 6,
                }}>
                  <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                  {apiErr}
                </div>
              )}

              {/* Preview table */}
              <div style={{ overflowX: 'auto', maxHeight: 380, border: '1px solid var(--color-border)', borderRadius: 8 }}>
                <table className="table" style={{ width: '100%', fontSize: 12 }}>
                  <thead>
                    <tr>
                      <th style={{ position: 'sticky', top: 0, zIndex: 1, width: 32, textAlign: 'center' }}>#</th>
                      <th style={{ position: 'sticky', top: 0, zIndex: 1, width: 90 }}>Mã NV</th>
                      <th style={{ position: 'sticky', top: 0, zIndex: 1, minWidth: 140 }}>Họ tên</th>
                      <th style={{ position: 'sticky', top: 0, zIndex: 1 }}>Chức vụ</th>
                      <th style={{ position: 'sticky', top: 0, zIndex: 1 }}>Bộ phận</th>
                      <th style={{ position: 'sticky', top: 0, zIndex: 1 }}>SĐT</th>
                      <th style={{ position: 'sticky', top: 0, zIndex: 1 }}>Loại HĐ</th>
                      <th style={{ position: 'sticky', top: 0, zIndex: 1 }}>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={i}>
                        <td style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>{i + 1}</td>
                        <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#2563EB' }}>{r.employeeCode}</td>
                        <td style={{ fontWeight: 600 }}>{r.name}</td>
                        <td style={{ color: 'var(--color-text-muted)' }}>{r.position || '—'}</td>
                        <td style={{ color: 'var(--color-text-muted)' }}>{r.department || '—'}</td>
                        <td>{r.phone || '—'}</td>
                        <td>
                          {r.employmentType && (
                            <span style={{
                              fontSize: 10, fontWeight: 700, borderRadius: 4, padding: '1px 5px',
                              background: r.employmentType === 'FULL_TIME' ? '#10B98122' : '#F59E0B22',
                              color: r.employmentType === 'FULL_TIME' ? '#10B981' : '#F59E0B',
                            }}>
                              {r.employmentType}
                            </span>
                          )}
                        </td>
                        <td>
                          {r.employeeStatus && (
                            <span style={{
                              fontSize: 10, fontWeight: 700, borderRadius: 4, padding: '1px 5px',
                              background: r.employeeStatus === 'ACTIVE' ? '#10B98122' : '#6B728022',
                              color: r.employeeStatus === 'ACTIVE' ? '#10B981' : '#6B7280',
                            }}>
                              {r.employeeStatus}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 8 }}>
                ⚠️ Nhân viên <strong>đã có mã NV</strong> sẽ bị <strong>cập nhật</strong>. Nhân viên <strong>mới</strong> sẽ được tạo với mật khẩu mặc định <code>123456</code>.
              </p>
            </div>
          )}

          {/* ── STEP: Importing ── */}
          {step === 'importing' && (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <Loader2 size={36} style={{ animation: 'spin 1s linear infinite', color: '#2563EB', marginBottom: 12 }} />
              <p style={{ fontWeight: 600 }}>Đang import {rows.length} nhân viên...</p>
              <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Vui lòng không đóng cửa sổ</p>
            </div>
          )}

          {/* ── STEP: Result ── */}
          {step === 'result' && result && (
            <div>
              {/* Summary cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
                {[
                  { label: 'Tổng nhân viên', val: result.total,   color: '#2563EB' },
                  { label: '✅ Tạo mới',      val: result.created, color: '#10B981' },
                  { label: '✏️ Cập nhật',     val: result.updated, color: '#F59E0B' },
                  { label: '⚠️ Lỗi / Bỏ qua', val: result.skipped, color: '#EF4444' },
                ].map((c) => (
                  <div key={c.label} style={{
                    background: `${c.color}11`, border: `1px solid ${c.color}33`,
                    borderRadius: 10, padding: '14px 16px', textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 28, fontWeight: 900, color: c.color }}>{c.val}</div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>{c.label}</div>
                  </div>
                ))}
              </div>

              {/* Success message */}
              {result.created + result.updated > 0 && (
                <div style={{
                  background: '#10B98111', border: '1px solid #10B98144',
                  borderRadius: 8, padding: '10px 14px', marginBottom: 12,
                  display: 'flex', gap: 8, alignItems: 'center', color: '#10B981', fontSize: 13,
                }}>
                  <CheckCircle2 size={16} />
                  <span>
                    Đã import thành công <strong>{result.created + result.updated}</strong> nhân viên
                    ({result.created} tạo mới, {result.updated} cập nhật).
                  </span>
                </div>
              )}

              {/* Error list */}
              {result.errors.length > 0 && (
                <div>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#EF4444', marginBottom: 6 }}>
                    ⚠️ {result.errors.length} dòng gặp lỗi:
                  </p>
                  <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid var(--color-border)', borderRadius: 8 }}>
                    {result.errors.map((e, i) => (
                      <div key={i} style={{
                        padding: '6px 12px', borderBottom: '1px solid var(--color-border)',
                        fontSize: 12, display: 'flex', gap: 8,
                      }}>
                        <span style={{ color: 'var(--color-text-muted)', minWidth: 40 }}>Hàng {e.row}</span>
                        <span style={{ color: '#F59E0B', fontFamily: 'monospace', minWidth: 70 }}>{e.code}</span>
                        <span style={{ color: 'var(--color-text-muted)' }}>{e.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="modal-footer" style={{ flexShrink: 0 }}>
          {step === 'upload' && (
            <button className="btn btn-secondary" onClick={onClose}>Đóng</button>
          )}

          {step === 'preview' && (
            <>
              <button className="btn btn-secondary" onClick={reset}>← Quay lại</button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
                <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                  {rows.length} nhân viên sẵn sàng import
                </span>
                <button
                  className="btn btn-primary"
                  onClick={handleImport}
                  style={{ display: 'flex', gap: 6, alignItems: 'center' }}
                >
                  <Upload size={15} />
                  Xác nhận Import
                </button>
              </div>
            </>
          )}

          {step === 'importing' && (
            <button className="btn btn-secondary" disabled>Đang xử lý...</button>
          )}

          {step === 'result' && (
            <>
              <button className="btn btn-secondary" onClick={reset} style={{ display: 'flex', gap: 5 }}>
                <RefreshCw size={13} /> Import thêm
              </button>
              <button className="btn btn-primary" onClick={onClose}>Hoàn tất</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
