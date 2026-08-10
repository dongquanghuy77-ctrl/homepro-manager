'use client';
// src/components/tasks/TaskBomModal.tsx
// ══════════════════════════════════════════════════════════════════════════════
// BOM Vật liệu Modal — Hiển thị danh sách vật tư từ file Excel
//
// - Tab 1: BOM (STT, Hạng mục, SL, ĐV)
// - Tab 2: Cut List (ID, Tên chi tiết, Vật liệu, Độ dày, W×H)
// - Nút Download: tải xuống file Excel gốc để chỉnh sửa thủ công
// - Fuzzy match: tên task → file BOM tương ứng
// ══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import { X, Download, Package, Scissors, AlertCircle, Loader2 } from 'lucide-react';
import type { BomTemplate, BomItem, CutItem } from '@/app/api/bom/templates/route';

interface TaskBomModalProps {
  taskTitle: string;
  onClose:   () => void;
}

type TabKey = 'bom' | 'cut';

// ─────────────────────────────────────────────────────────────────────────────
// Fuzzy match: chuẩn hóa tên task → tìm file BOM phù hợp nhất
// Ví dụ: "Kệ tivi treo tường" → "bom-KỆ TIVI.xlsx"
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
  const taskNorm = normStr(taskTitle);
  const fileNorm = normStr(displayName);
  const taskWords = taskNorm.split(' ');
  const fileWords = fileNorm.split(' ');
  let score = 0;
  for (const fw of fileWords) {
    if (fw.length < 2) continue;
    for (const tw of taskWords) {
      if (tw === fw)         { score += 3; break; }
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
// Component chính
// ─────────────────────────────────────────────────────────────────────────────
export default function TaskBomModal({ taskTitle, onClose }: TaskBomModalProps) {
  const [tab,           setTab]      = useState<TabKey>('bom');
  const [loading,       setLoading]  = useState(true);
  const [error,         setError]    = useState('');
  const [template,      setTemplate] = useState<BomTemplate | null>(null);
  const [matchedFile,   setMatchedFile]  = useState<string | null>(null);
  const [allFiles,      setAllFiles]     = useState<Array<{ fileName: string; displayName: string }>>([]);
  const [downloading,   setDownloading]  = useState(false);

  // ── Load danh sách files → fuzzy match → load template ──────────────────
  const loadTemplate = useCallback(async (fileName: string) => {
    setLoading(true);
    setError('');
    try {
      const res  = await fetch(`/api/bom/templates?file=${encodeURIComponent(fileName)}`);
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Không thể tải BOM');
      }
      const data: BomTemplate = await res.json();
      setTemplate(data);
      setMatchedFile(fileName);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lỗi tải BOM');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch('/api/bom/templates');
        if (!res.ok) throw new Error('Không lấy được danh sách BOM');
        const { files } = await res.json();
        if (!mounted) return;
        setAllFiles(files);
        const best = findBestMatch(taskTitle, files);
        if (best) {
          await loadTemplate(best);
        } else {
          setLoading(false);
          setError(`Không tìm thấy file BOM phù hợp với "${taskTitle}"`);
        }
      } catch (e) {
        if (!mounted) return;
        setLoading(false);
        setError(e instanceof Error ? e.message : 'Lỗi kết nối');
      }
    })();
    return () => { mounted = false; };
  }, [taskTitle, loadTemplate]);

  // ── Download Excel ─────────────────────────────────────────────────────────
  async function handleDownload() {
    if (!matchedFile) return;
    setDownloading(true);
    try {
      const res = await fetch(
        `/api/bom/templates?download=${encodeURIComponent(matchedFile)}`
      );
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

  // ── Chọn file thủ công ───────────────────────────────────────────────────
  function handleSelectFile(e: React.ChangeEvent<HTMLSelectElement>) {
    const f = e.target.value;
    if (f) loadTemplate(f);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div
      className="modal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="modal modal-xl"
        style={{ maxWidth: 900, maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="modal-header" style={{ flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Package size={20} style={{ color: 'var(--color-primary)' }} />
            <div>
              <h2 className="modal-title" style={{ marginBottom: 2 }}>
                BOM Vật liệu
              </h2>
              <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: 0 }}>
                {taskTitle}
                {template && (
                  <span style={{ marginLeft: 8, color: 'var(--color-success)', fontWeight: 600 }}>
                    ← {template.displayName}
                  </span>
                )}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {/* Chọn file thủ công */}
            {allFiles.length > 1 && (
              <select
                className="form-select"
                style={{ height: 32, fontSize: 12, padding: '0 8px', minWidth: 180 }}
                value={matchedFile ?? ''}
                onChange={handleSelectFile}
              >
                <option value="">— Chọn BOM khác —</option>
                {allFiles.map((f) => (
                  <option key={f.fileName} value={f.fileName}>{f.displayName}</option>
                ))}
              </select>
            )}
            {/* Download */}
            {matchedFile && (
              <button
                className="btn btn-secondary"
                style={{ height: 32, fontSize: 12, padding: '0 12px', display: 'flex', gap: 6, alignItems: 'center' }}
                onClick={handleDownload}
                disabled={downloading}
                title="Tải xuống file Excel gốc để chỉnh sửa thủ công"
              >
                {downloading
                  ? <Loader2 size={14} className="spin" />
                  : <Download size={14} />}
                {downloading ? 'Đang tải...' : 'Tải Excel'}
              </button>
            )}
            <button className="btn btn-ghost btn-icon" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── Tabs ──────────────────────────────────────────────────────── */}
        {template && (
          <div style={{ padding: '0 24px', borderBottom: '1px solid var(--color-border)', flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: 4 }}>
              {[
                { key: 'bom' as TabKey,  icon: <Package  size={14} />, label: `BOM (${template.bomItems.length} hạng mục)` },
                { key: 'cut' as TabKey,  icon: <Scissors size={14} />, label: `Cut List (${template.cutItems.length} tấm)` },
              ].map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  style={{
                    display:      'flex',
                    gap:          6,
                    alignItems:   'center',
                    padding:      '8px 16px',
                    background:   'none',
                    border:       'none',
                    borderBottom: tab === t.key
                      ? '2px solid var(--color-primary)'
                      : '2px solid transparent',
                    color:       tab === t.key ? 'var(--color-primary)' : 'var(--color-text-muted)',
                    fontWeight:  tab === t.key ? 600 : 400,
                    cursor:      'pointer',
                    fontSize:    13,
                    marginBottom: -1,
                    transition:  'all 0.15s',
                  }}
                >
                  {t.icon}
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Body ──────────────────────────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {/* Loading */}
          {loading && (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--color-text-muted)' }}>
              <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', marginBottom: 12 }} />
              <p>Đang tải BOM...</p>
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div style={{
              display:      'flex', flexDirection: 'column', alignItems: 'center',
              gap:          12, padding: '48px 0',
              color:        'var(--color-warning)',
            }}>
              <AlertCircle size={36} />
              <p style={{ textAlign: 'center', maxWidth: 400 }}>{error}</p>
              {allFiles.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
                  <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                    Chọn thủ công từ danh sách BOM có sẵn:
                  </p>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                    {allFiles.map((f) => (
                      <button
                        key={f.fileName}
                        className="btn btn-secondary"
                        style={{ fontSize: 12 }}
                        onClick={() => loadTemplate(f.fileName)}
                      >
                        {f.displayName}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* BOM Tab */}
          {!loading && !error && template && tab === 'bom' && (
            <BomTable items={template.bomItems} />
          )}

          {/* Cut List Tab */}
          {!loading && !error && template && tab === 'cut' && (
            <CutTable items={template.cutItems} />
          )}
        </div>

        {/* ── Footer ────────────────────────────────────────────────────── */}
        <div className="modal-footer" style={{ flexShrink: 0 }}>
          {template && (
            <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
              📄 {template.fileName} · {template.bomItems.length} vật liệu · {template.cutItems.length} tấm cắt
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
    return (
      <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: 32 }}>
        Không có dữ liệu BOM
      </p>
    );
  }
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="table" style={{ width: '100%', fontSize: 13 }}>
        <thead>
          <tr>
            <th style={{ width: 50, textAlign: 'center' }}>STT</th>
            <th>Hạng mục / Vật liệu</th>
            <th style={{ width: 100, textAlign: 'right' }}>Số lượng</th>
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
    return (
      <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: 32 }}>
        Không có dữ liệu Cut List
      </p>
    );
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
              <td style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>
                {item.id}
              </td>
              <td style={{ fontWeight: 500, fontSize: 11 }}>{item.tenChiTiet}</td>
              <td>
                <span style={{
                  display:         'inline-block',
                  background:      'var(--color-surface-raised)',
                  borderRadius:    4,
                  padding:         '1px 6px',
                  fontSize:        11,
                  fontFamily:      'monospace',
                  color:           'var(--color-primary)',
                }}>
                  {item.vatLieu}
                </span>
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
