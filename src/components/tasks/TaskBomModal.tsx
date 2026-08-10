'use client';
// src/components/tasks/TaskBomModal.tsx
// ══════════════════════════════════════════════════════════════════════════════
// BOM Vật liệu Modal — v2.0
//
// - Tab BOM:      STT | Hạng mục | SL | ĐV
// - Tab Cut List: ID | Chi tiết | Vật liệu | Dày | W×H
// - Fuzzy match:  tên task → file Excel trong public/bom/
// - Upload:       Tải lên bất kỳ file BOM Excel nào từ máy tính
//                 → parse client-side → hiển thị ngay
//                 → lưu localStorage (persist theo taskId)
// - Download:     Tải xuống Excel gốc để chỉnh sửa thủ công
// ══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  X, Download, Package, Scissors, AlertCircle,
  Loader2, Upload, FileSpreadsheet, RefreshCw,
} from 'lucide-react';
import type { BomTemplate, BomItem, CutItem } from '@/app/api/bom/templates/route';

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────
interface TaskBomModalProps {
  taskTitle: string;
  taskId?:   number;   // Dùng để lưu localStorage theo task
  onClose:   () => void;
}

type TabKey = 'bom' | 'cut';

// ─────────────────────────────────────────────────────────────────────────────
// localStorage key theo taskId hoặc title
// ─────────────────────────────────────────────────────────────────────────────
function localKey(taskId: number | undefined, taskTitle: string): string {
  return taskId ? `bom_task_${taskId}` : `bom_title_${taskTitle.slice(0, 40)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Fuzzy match: task title → best matching BOM file
// ─────────────────────────────────────────────────────────────────────────────
function normStr(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function matchScore(taskTitle: string, displayName: string): number {
  const taskNorm  = normStr(taskTitle);
  const fileNorm  = normStr(displayName);
  const taskWords = taskNorm.split(' ');
  const fileWords = fileNorm.split(' ');
  let score = 0;
  for (const fw of fileWords) {
    if (fw.length < 2) continue;
    for (const tw of taskWords) {
      if (tw === fw)                           { score += 3; break; }
      if (tw.includes(fw) || fw.includes(tw)) { score += 1; break; }
    }
  }
  return score;
}

function findBestMatch(
  taskTitle: string,
  files: Array<{ fileName: string; displayName: string }>
): string | null {
  if (!files.length) return null;
  let best = { fileName: '', score: 0 };
  for (const f of files) {
    const s = matchScore(taskTitle, f.displayName);
    if (s > best.score) best = { fileName: f.fileName, score: s };
  }
  return best.score > 0 ? best.fileName : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Client-side Excel parser (dùng xlsx đã có sẵn trong package.json)
// Chạy trên browser — không cần server
// ─────────────────────────────────────────────────────────────────────────────
async function parseExcelFile(file: File): Promise<BomTemplate> {
  // Dynamic import để tránh SSR error
  const XLSX = await import('xlsx');

  const buf  = await file.arrayBuffer();
  const wb   = XLSX.read(buf, { type: 'array' });
  const sheets = wb.SheetNames;

  // ── Parse sheet BOM (sheet đầu tiên) ──────────────────────────────────────
  const bomWs  = wb.Sheets[sheets[0]];
  const bomRaw = XLSX.utils.sheet_to_json<(string | number)[]>(bomWs, {
    header: 1, defval: '',
  });

  const bomItems: BomItem[] = [];
  for (let i = 1; i < bomRaw.length; i++) {
    const row     = bomRaw[i];
    const stt     = Number(row[0]);
    const hangMuc = String(row[1] ?? '').trim();
    const soLuong = Number(row[2]) || 0;
    const donVi   = String(row[3] ?? '').trim();
    if (!hangMuc) continue;
    bomItems.push({ stt: isNaN(stt) ? i : stt, hangMuc, soLuong, donVi });
  }

  // ── Parse sheet Cut List (sheet thứ hai nếu có) ───────────────────────────
  const cutItems: CutItem[] = [];
  if (sheets[1]) {
    const cutWs  = wb.Sheets[sheets[1]];
    const cutRaw = XLSX.utils.sheet_to_json<(string | number)[]>(cutWs, {
      header: 1, defval: '',
    });
    for (let i = 1; i < cutRaw.length; i++) {
      const row        = cutRaw[i];
      const id         = String(row[0] ?? '').trim();
      const tenChiTiet = String(row[1] ?? '').trim();
      const tenNhom    = String(row[2] ?? '').trim();
      const vatLieu    = String(row[3] ?? '').trim();
      const doDay      = Number(row[4]) || 0;
      const chieuRong  = Number(row[5]) || 0;
      const chieuCao   = Number(row[6]) || 0;
      if (!tenChiTiet) continue;
      cutItems.push({ id, tenChiTiet, tenNhom, vatLieu, doDay, chieuRong, chieuCao });
    }
  }

  // Tên hiển thị từ tên file (bỏ bom- prefix và .xlsx suffix)
  const displayName = file.name
    .replace(/^bom-/i, '')
    .replace(/\.xlsx$/i, '')
    .trim();

  return {
    fileName:    file.name,
    displayName,
    bomItems,
    cutItems,
    sheets,
    totalQty:    bomItems.length,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Component chính
// ─────────────────────────────────────────────────────────────────────────────
export default function TaskBomModal({
  taskTitle,
  taskId,
  onClose,
}: TaskBomModalProps) {
  const [tab,          setTab]       = useState<TabKey>('bom');
  const [loading,      setLoading]   = useState(true);
  const [error,        setError]     = useState('');
  const [template,     setTemplate]  = useState<BomTemplate | null>(null);
  const [matchedFile,  setMatchedFile]  = useState<string | null>(null);
  const [allFiles,     setAllFiles]  = useState<Array<{ fileName: string; displayName: string }>>([]);
  const [downloading,  setDownloading]  = useState(false);
  const [uploading,    setUploading]    = useState(false);
  const [uploadSource, setUploadSource] = useState<'server' | 'local' | 'cache'>('server');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const lsKey        = localKey(taskId, taskTitle);

  // ── Load server BOM → fallback to localStorage cache ────────────────────
  const loadTemplate = useCallback(async (fileName: string) => {
    setLoading(true);
    setError('');
    try {
      const res  = await fetch(`/api/bom/templates?file=${encodeURIComponent(fileName)}`);
      if (!res.ok) throw new Error((await res.json()).error || 'Không thể tải BOM');
      const data: BomTemplate = await res.json();
      setTemplate(data);
      setMatchedFile(fileName);
      setUploadSource('server');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lỗi tải BOM');
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Khởi tạo: server files → fuzzy match → localStorage cache ────────────
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // 1. Lấy danh sách file từ server
        const res   = await fetch('/api/bom/templates');
        const { files } = await res.json();
        if (!mounted) return;
        setAllFiles(files ?? []);

        // 2. Fuzzy match với server files
        const best = findBestMatch(taskTitle, files ?? []);
        if (best) {
          await loadTemplate(best);
          return;
        }

        // 3. Không có server match → kiểm tra localStorage
        const cached = localStorage.getItem(lsKey);
        if (cached) {
          const parsed: BomTemplate = JSON.parse(cached);
          if (mounted) {
            setTemplate(parsed);
            setMatchedFile(parsed.fileName);
            setUploadSource('cache');
            setLoading(false);
            setError('');
          }
          return;
        }

        // 4. Không có gì → hiện thông báo + upload option
        if (mounted) {
          setLoading(false);
          setError(`Chưa có file BOM cho "${taskTitle}". Tải lên file Excel để tạo mới.`);
        }
      } catch {
        if (!mounted) return;
        setLoading(false);
        setError('Không thể kết nối API. Vui lòng tải lên file Excel BOM.');
      }
    })();
    return () => { mounted = false; };
  }, [taskTitle, loadTemplate, lsKey]);

  // ── Upload file Excel từ máy tính ─────────────────────────────────────────
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      alert('Chỉ hỗ trợ file .xlsx (Excel 2007+)');
      return;
    }

    setUploading(true);
    setError('');
    try {
      const parsed = await parseExcelFile(file);
      setTemplate(parsed);
      setMatchedFile(parsed.fileName);
      setUploadSource('local');
      setError('');
      setTab('bom');

      // Lưu vào localStorage để persist cho lần sau
      localStorage.setItem(lsKey, JSON.stringify(parsed));
      console.log(`[TaskBomModal] 💾 Đã lưu BOM "${parsed.fileName}" → localStorage key: ${lsKey}`);
    } catch (err) {
      setError(`Lỗi đọc file Excel: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setUploading(false);
      // Reset input để có thể upload lại cùng file
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  // ── Xóa cache localStorage ────────────────────────────────────────────────
  function handleClearCache() {
    localStorage.removeItem(lsKey);
    setTemplate(null);
    setMatchedFile(null);
    setError(`Đã xóa BOM đã lưu. Tải lên file Excel mới.`);
  }

  // ── Download Excel server file ────────────────────────────────────────────
  async function handleDownload() {
    if (!matchedFile || uploadSource !== 'server') return;
    setDownloading(true);
    try {
      const res  = await fetch(`/api/bom/templates?download=${encodeURIComponent(matchedFile)}`);
      if (!res.ok) throw new Error('Không thể tải file');
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = matchedFile;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Lỗi download');
    } finally {
      setDownloading(false);
    }
  }

  // ── Chọn file server thủ công ─────────────────────────────────────────────
  function handleSelectFile(e: React.ChangeEvent<HTMLSelectElement>) {
    const f = e.target.value;
    if (f) loadTemplate(f);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Source badge
  // ─────────────────────────────────────────────────────────────────────────
  const sourceBadge = template
    ? uploadSource === 'server' ? { label: 'Hệ thống', color: '#22c55e' }
    : uploadSource === 'cache'  ? { label: 'Đã lưu',   color: '#f59e0b' }
    : { label: 'Tải lên',       color: '#3b82f6' }
    : null;

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div
      className="modal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx"
        style={{ display: 'none' }}
        onChange={handleFileUpload}
        id="bom-file-upload"
      />

      <div
        className="modal modal-xl"
        style={{ maxWidth: 900, maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="modal-header" style={{ flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Package size={20} style={{ color: 'var(--color-primary)' }} />
            <div>
              <h2 className="modal-title" style={{ marginBottom: 2 }}>BOM Vật liệu</h2>
              <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: 0 }}>
                {taskTitle}
                {template && (
                  <>
                    <span style={{ marginLeft: 8, color: 'var(--color-text-muted)' }}>←</span>
                    <span style={{ marginLeft: 4, fontWeight: 600, color: 'var(--color-primary)' }}>
                      {template.displayName}
                    </span>
                    {sourceBadge && (
                      <span style={{
                        marginLeft: 8, fontSize: 10, fontWeight: 700,
                        background: sourceBadge.color + '22',
                        color:      sourceBadge.color,
                        border:    `1px solid ${sourceBadge.color}44`,
                        borderRadius: 4, padding: '1px 6px',
                      }}>
                        {sourceBadge.label}
                      </span>
                    )}
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Header actions */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Chọn từ server */}
            {allFiles.length > 1 && (
              <select
                className="form-select"
                style={{ height: 32, fontSize: 12, padding: '0 8px', minWidth: 160 }}
                value={matchedFile ?? ''}
                onChange={handleSelectFile}
              >
                <option value="">— BOM khác —</option>
                {allFiles.map((f) => (
                  <option key={f.fileName} value={f.fileName}>{f.displayName}</option>
                ))}
              </select>
            )}

            {/* Upload Excel */}
            <button
              className="btn btn-primary"
              style={{ height: 32, fontSize: 12, padding: '0 12px', display: 'flex', gap: 6, alignItems: 'center' }}
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              title="Tải lên file Excel BOM từ máy tính (parse client-side, lưu tự động)"
              id="upload-bom-btn"
            >
              {uploading
                ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                : <Upload size={14} />}
              {uploading ? 'Đang đọc...' : 'Tải lên Excel'}
            </button>

            {/* Download server file */}
            {matchedFile && uploadSource === 'server' && (
              <button
                className="btn btn-secondary"
                style={{ height: 32, fontSize: 12, padding: '0 12px', display: 'flex', gap: 6, alignItems: 'center' }}
                onClick={handleDownload}
                disabled={downloading}
                title="Tải xuống file Excel gốc để chỉnh sửa thủ công"
              >
                {downloading
                  ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                  : <Download size={14} />}
                {downloading ? 'Đang tải...' : 'Tải Excel'}
              </button>
            )}

            {/* Xóa cache */}
            {uploadSource === 'cache' && template && (
              <button
                className="btn btn-ghost"
                style={{ height: 32, fontSize: 12, padding: '0 10px', display: 'flex', gap: 6, alignItems: 'center', color: 'var(--color-warning)' }}
                onClick={handleClearCache}
                title="Xóa BOM đã lưu và tải lên file mới"
              >
                <RefreshCw size={13} />
                Đổi file
              </button>
            )}

            <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
          </div>
        </div>

        {/* ── Tabs ────────────────────────────────────────────────────── */}
        {template && (
          <div style={{ padding: '0 24px', borderBottom: '1px solid var(--color-border)', flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: 4 }}>
              {([
                { key: 'bom' as TabKey, icon: <Package  size={13} />, label: `BOM (${template.bomItems.length} hạng mục)` },
                { key: 'cut' as TabKey, icon: <Scissors size={13} />, label: `Cut List (${template.cutItems.length} tấm)` },
              ]).map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  style={{
                    display:      'flex', gap: 6, alignItems: 'center',
                    padding:      '8px 16px', background: 'none', border: 'none',
                    borderBottom: tab === t.key
                      ? '2px solid var(--color-primary)'
                      : '2px solid transparent',
                    color:       tab === t.key ? 'var(--color-primary)' : 'var(--color-text-muted)',
                    fontWeight:  tab === t.key ? 600 : 400,
                    cursor:      'pointer', fontSize: 13, marginBottom: -1,
                    transition:  'all 0.15s',
                  }}
                >
                  {t.icon}{t.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Body ────────────────────────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {/* Loading */}
          {loading && (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--color-text-muted)' }}>
              <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', marginBottom: 12 }} />
              <p>Đang tải BOM...</p>
            </div>
          )}

          {/* Upload loading */}
          {uploading && (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--color-primary)' }}>
              <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', marginBottom: 12 }} />
              <p>Đang đọc file Excel...</p>
            </div>
          )}

          {/* Error + Upload CTA */}
          {!loading && !uploading && error && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, padding: '32px 0' }}>
              <AlertCircle size={36} style={{ color: 'var(--color-warning)' }} />
              <p style={{ textAlign: 'center', maxWidth: 400, color: 'var(--color-warning)' }}>{error}</p>

              {/* Upload dropzone CTA */}
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border:       '2px dashed var(--color-border)',
                  borderRadius: 12,
                  padding:      '32px 48px',
                  textAlign:    'center',
                  cursor:       'pointer',
                  transition:   'all 0.2s',
                  maxWidth:     400,
                  width:        '100%',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--color-primary)';
                  (e.currentTarget as HTMLDivElement).style.background = 'var(--color-primary)11';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--color-border)';
                  (e.currentTarget as HTMLDivElement).style.background = 'transparent';
                }}
              >
                <FileSpreadsheet size={40} style={{ color: 'var(--color-primary)', marginBottom: 12 }} />
                <p style={{ fontWeight: 600, marginBottom: 6 }}>Kéo thả hoặc click để chọn file</p>
                <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 16 }}>
                  Hỗ trợ file Excel (.xlsx) với cấu trúc:
                </p>
                <div style={{
                  background:   'var(--color-surface-raised)',
                  borderRadius: 8,
                  padding:      '10px 16px',
                  textAlign:    'left',
                  fontSize:     11,
                  fontFamily:   'monospace',
                  color:        'var(--color-text-muted)',
                }}>
                  <div style={{ color: 'var(--color-success)', fontWeight: 700, marginBottom: 4 }}>Sheet 1: BOM</div>
                  STT | Hạng mục | Số lượng | Đơn vị<br />
                  <br />
                  <div style={{ color: 'var(--color-primary)', fontWeight: 700, marginBottom: 4, marginTop: 4 }}>Sheet 2: Cut List (tùy chọn)</div>
                  ID | Tên chi tiết | Nhóm | Vật liệu | Dày | Rộng | Cao
                </div>
              </div>

              {/* Hoặc chọn từ server */}
              {allFiles.length > 0 && (
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 8 }}>
                    Hoặc chọn BOM từ thư viện hệ thống:
                  </p>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                    {allFiles.map((f) => (
                      <button
                        key={f.fileName}
                        className="btn btn-secondary"
                        style={{ fontSize: 12 }}
                        onClick={() => { setError(''); loadTemplate(f.fileName); }}
                      >
                        📄 {f.displayName}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* BOM Table */}
          {!loading && !uploading && !error && template && tab === 'bom' && (
            <BomTable items={template.bomItems} />
          )}

          {/* Cut List Table */}
          {!loading && !uploading && !error && template && tab === 'cut' && (
            <CutTable items={template.cutItems} />
          )}
        </div>

        {/* ── Footer ──────────────────────────────────────────────────── */}
        <div className="modal-footer" style={{ flexShrink: 0 }}>
          {template ? (
            <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
              📄 {template.fileName} · {template.bomItems.length} vật liệu
              {template.cutItems.length > 0 && ` · ${template.cutItems.length} tấm cắt`}
              {uploadSource === 'cache' && ' · 💾 Từ bộ nhớ trình duyệt'}
              {uploadSource === 'local' && ' · ✅ Đã lưu vào trình duyệt'}
            </span>
          ) : (
            <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
              Cấu trúc: bom-TÊN SẢN PHẨM.xlsx → Sheet &quot;BOM&quot; + &quot;Cut List&quot;
            </span>
          )}
          <button className="btn btn-secondary" onClick={onClose}>Đóng</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: BOM Table
// ─────────────────────────────────────────────────────────────────────────────
function BomTable({ items }: { items: BomItem[] }) {
  if (!items.length) {
    return <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: 32 }}>Không có dữ liệu BOM</p>;
  }
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="table" style={{ width: '100%', fontSize: 13 }}>
        <thead>
          <tr>
            <th style={{ width: 50,  textAlign: 'center' }}>STT</th>
            <th>Hạng mục / Vật liệu</th>
            <th style={{ width: 110, textAlign: 'right' }}>Số lượng</th>
            <th style={{ width: 80,  textAlign: 'center' }}>Đơn vị</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={idx}>
              <td style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>{item.stt}</td>
              <td style={{ fontWeight: 500 }}>{item.hangMuc}</td>
              <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                {item.soLuong % 1 === 0 ? item.soLuong : item.soLuong.toFixed(2)}
              </td>
              <td style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>{item.donVi}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: Cut List Table
// ─────────────────────────────────────────────────────────────────────────────
function CutTable({ items }: { items: CutItem[] }) {
  if (!items.length) {
    return <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: 32 }}>Không có dữ liệu Cut List</p>;
  }
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="table" style={{ width: '100%', fontSize: 12 }}>
        <thead>
          <tr>
            <th style={{ width: 50, textAlign: 'center' }}>ID</th>
            <th>Tên chi tiết</th>
            <th style={{ width: 110 }}>Vật liệu</th>
            <th style={{ width: 70, textAlign: 'right' }}>Dày (mm)</th>
            <th style={{ width: 90, textAlign: 'right' }}>Rộng (mm)</th>
            <th style={{ width: 90, textAlign: 'right' }}>Cao (mm)</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={idx}>
              <td style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>{item.id}</td>
              <td style={{ fontWeight: 500, fontSize: 11 }}>{item.tenChiTiet}</td>
              <td>
                <span style={{
                  display: 'inline-block', background: 'var(--color-surface-raised)',
                  borderRadius: 4, padding: '1px 6px', fontSize: 11,
                  fontFamily: 'monospace', color: 'var(--color-primary)',
                }}>{item.vatLieu}</span>
              </td>
              <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{item.doDay}</td>
              <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{item.chieuRong}</td>
              <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{item.chieuCao}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
