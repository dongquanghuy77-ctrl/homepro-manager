'use client';
// src/app/bom/BomClient.tsx — Giao diện quản lý BOQ/BOM theo Zone

import { useState, useMemo, useEffect } from 'react';
import { buildColumnMap, parseClientHeaders } from '@/lib/import-parser';
import type { ColumnMapResult } from '@/lib/import-parser';

type Project = { id: number; code: string; name: string; status: string };
type BomLine = {
  id: number; projectId: number; zoneId: string; zoneName: string | null;
  productName: string; unit: string; qty: number | null; unitPrice: number | null;
  total: number | null; supplyType: string; note: string | null; sttInZone: number | null;
};

const SUPPLY_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  HOMEPRO_PRODUCTION: { bg: 'rgba(59,130,246,0.12)', text: '#3b82f6', label: 'HomePro SX' },
  INSTALLATION_ONLY:  { bg: 'rgba(156,163,175,0.15)', text: '#9ca3af', label: 'CĐT c\u1ea5p' },
};

function fmt(n: number | null | undefined) {
  if (n == null) return '—';
  return n.toLocaleString('vi-VN');
}

export default function BomClient({ projects, initialBomLines, defaultProject = '' }: {
  projects: Project[];
  initialBomLines: BomLine[];
  defaultProject?: string;
}) {
  const [selProject, setSelProject] = useState<string>(
    defaultProject
      ? defaultProject
      : projects.find(p => p.status === 'ACTIVE')?.id.toString() ?? projects[0]?.id.toString() ?? ''
  );
  const [bomLines, setBomLines]     = useState<BomLine[]>(initialBomLines);
  const [showAdd,    setShowAdd]    = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [search,     setSearch]     = useState('');

  // L\u1ecdc theo d\u1ef1 \u00e1n + search
  const filtered = useMemo(() => bomLines.filter(b =>
    b.projectId === parseInt(selProject) &&
    (search === '' || b.productName.toLowerCase().includes(search.toLowerCase()) ||
      b.zoneId.toLowerCase().includes(search.toLowerCase()))
  ), [bomLines, selProject, search]);

  // Nh\u00f3m theo Zone
  const byZone = useMemo(() => {
    const map = new Map<string, { zoneName: string; lines: BomLine[] }>();
    for (const b of filtered) {
      if (!map.has(b.zoneId)) map.set(b.zoneId, { zoneName: b.zoneName ?? b.zoneId, lines: [] });
      map.get(b.zoneId)!.lines.push(b);
    }
    return map;
  }, [filtered]);

  // T\u1ed5ng gi\u00e1 tr\u1ecb to\u00e0n b\u1ed9
  const grandTotal = useMemo(() =>
    filtered.reduce((s, b) => s + (b.total ?? 0), 0), [filtered]);

  // BƯỚC 4: reload với cache:no-store để luôn lấy dữ liệu mới nhất từ DB
  const reload = async () => {
    if (!selProject) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/bom?projectId=${selProject}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
      });
      const { data } = await r.json();
      setBomLines(prev => [
        ...prev.filter(b => b.projectId !== parseInt(selProject)),
        ...(data ?? []),
      ]);
    } catch (e) {
      console.error('[reload BOM]', e);
    } finally { setLoading(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('X\u00e1c nh\u1eadn x\u00f3a d\u00f2ng BOM n\u00e0y?')) return;
    await fetch(`/api/bom?id=${id}`, { method: 'DELETE' });
    setBomLines(prev => prev.filter(b => b.id !== id));
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: 1200, margin: '0 auto' }}>
      {/* ─ Header ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>📋 BOQ / BOM Xưởng</h1>
          <p style={{ fontSize: 13, color: 'var(--color-muted)', marginTop: 4 }}>
            Quản lý cấu kiện sản xuất theo phân khu — phân loại HomePro SX / CĐT cấp
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={() => setShowImport(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}>⬆ Import BOQ</button>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}>+ Thêm dòng BOM</button>
        </div>
      </div>

      {/* ─ Toolbar ────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <select className="form-select" style={{ flex: '0 0 280px' }}
          value={selProject} onChange={e => { setSelProject(e.target.value); }}>
          <option value="">-- Ch\u1ecdn d\u1ef1 \u00e1n --</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>
              [{p.code}] {p.name}
            </option>
          ))}
        </select>
        <input className="form-input" placeholder="🔍 T\u00ecm ki\u1ebfm s\u1ea3n ph\u1ea9m / zone..."
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 200 }} />
        <button className="btn btn-ghost" onClick={reload} disabled={loading}>
          {loading ? '...' : '↺ T\u1ea3i l\u1ea1i'}
        </button>
      </div>

      {/* ─ T\u1ed5ng gi\u00e1 tr\u1ecb ──────────────────────────────────────────────────── */}
      {filtered.length > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(59,130,246,0.1) 0%, rgba(99,102,241,0.1) 100%)',
          border: '1px solid rgba(59,130,246,0.25)', borderRadius: 10,
          padding: '12px 20px', marginBottom: '1.5rem',
          display: 'flex', gap: '2rem', alignItems: 'center',
        }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--color-muted)' }}>T\u1ed5ng gi\u00e1 tr\u1ecb BOM</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#3b82f6' }}>
              {fmt(grandTotal)} VN\u0110
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--color-muted)' }}>S\u1ed1 ph\u00e2n khu</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{byZone.size}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--color-muted)' }}>T\u1ed5ng d\u00f2ng</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{filtered.length}</div>
          </div>
        </div>
      )}

      {/* ─ B\u1ea3ng theo Zone ─────────────────────────────────────────────────── */}
      {!selProject && (
        <div style={{ textAlign: 'center', color: 'var(--color-muted)', padding: '4rem 0' }}>
          👆 Vui l\u00f2ng ch\u1ecdn d\u1ef1 \u00e1n \u0111\u1ec3 xem BOM
        </div>
      )}

      {selProject && filtered.length === 0 && (
        <div style={{ textAlign: 'center', color: 'var(--color-muted)', padding: '4rem 0' }}>
          Kh\u00f4ng c\u00f3 d\u1eef li\u1ec7u BOM cho d\u1ef1 \u00e1n n\u00e0y
          <br /><br />
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
            + Th\u00eam d\u00f2ng BOM \u0111\u1ea7u ti\u00ean
          </button>
        </div>
      )}

      {[...byZone.entries()].map(([zoneId, { zoneName, lines }]) => {
        const zoneTotal = lines.reduce((s, b) => s + (b.total ?? 0), 0);
        return (
          <ZoneSection key={zoneId} zoneId={zoneId} zoneName={zoneName}
            lines={lines} zoneTotal={zoneTotal} onDelete={handleDelete} />
        );
      })}

      {/* ─ Modal thêm dòng BOM ──────────────────────────────────────────────── */}
      {showAdd && (
        <AddBomModal
          projectId={parseInt(selProject)}
          onClose={() => setShowAdd(false)}
          onSuccess={() => { setShowAdd(false); reload(); }}
        />
      )}

      {/* ─ Modal Import BOQ (ETL Parser) ──────────────────────────────────── */}
      {showImport && selProject && (
        <ImportBomModal
          projectId={parseInt(selProject)}
          onClose={() => setShowImport(false)}
          onSuccess={async () => { await reload(); setShowImport(false); }}
        />
      )}
    </div>
  );
}

// ─ Zone Section Component ─────────────────────────────────────────────────────
function ZoneSection({ zoneId, zoneName, lines, zoneTotal, onDelete }: {
  zoneId: string; zoneName: string; lines: BomLine[];
  zoneTotal: number; onDelete: (id: number) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div style={{
      background: 'var(--color-surface)', border: '1px solid var(--color-border)',
      borderRadius: 12, marginBottom: '1rem', overflow: 'hidden',
    }}>
      {/* Zone header */}
      <div onClick={() => setCollapsed(v => !v)}
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '12px 16px', cursor: 'pointer',
          background: 'linear-gradient(90deg, rgba(59,130,246,0.08) 0%, transparent 100%)',
          borderBottom: collapsed ? 'none' : '1px solid var(--color-border)',
        }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 16 }}>{collapsed ? '▶' : '▼'}</span>
          <span style={{ fontWeight: 700, color: '#3b82f6' }}>{zoneId}</span>
          <span style={{ fontSize: 14, color: 'var(--color-muted)' }}>{zoneName}</span>
          <span style={{
            background: 'rgba(59,130,246,0.1)', color: '#3b82f6',
            borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 600,
          }}>{lines.length} d\u00f2ng</span>
        </div>
        <div style={{ fontWeight: 700, color: '#3b82f6', fontSize: 15 }}>
          {zoneTotal.toLocaleString('vi-VN')} VN\u0110
        </div>
      </div>

      {!collapsed && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'rgba(0,0,0,0.03)' }}>
                {['STT', 'T\u00ean s\u1ea3n ph\u1ea9m', '\u0110V', 'S\u1ed1 l\u01b0\u1ee3ng', '\u0110\u01a1n gi\u00e1', 'Th\u00e0nh ti\u1ec1n', 'Ph\u00e2n lo\u1ea1i', 'Ghi ch\u00fa', ''].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: h === 'S\u1ed1 l\u01b0\u1ee3ng' || h === '\u0110\u01a1n gi\u00e1' || h === 'Th\u00e0nh ti\u1ec1n' ? 'right' : 'left',
                    color: 'var(--color-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lines.map((b, i) => {
                const sup = SUPPLY_COLORS[b.supplyType] ?? SUPPLY_COLORS.INSTALLATION_ONLY;
                return (
                  <tr key={b.id} style={{ borderTop: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '8px 12px', color: 'var(--color-muted)' }}>{b.sttInZone ?? i + 1}</td>
                    <td style={{ padding: '8px 12px', fontWeight: 500 }}>{b.productName}</td>
                    <td style={{ padding: '8px 12px', color: 'var(--color-muted)' }}>{b.unit}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right' }}>{fmt(b.qty)}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right' }}>{fmt(b.unitPrice)}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>{fmt(b.total)}</td>
                    <td style={{ padding: '8px 12px' }}>
                      <span style={{
                        background: sup.bg, color: sup.text,
                        borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 600,
                      }}>{sup.label}</span>
                    </td>
                    <td style={{ padding: '8px 12px', color: 'var(--color-muted)', fontSize: 12 }}>{b.note ?? ''}</td>
                    <td style={{ padding: '8px 12px' }}>
                      <button onClick={() => onDelete(b.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer',
                          color: 'var(--color-danger)', fontSize: 14, padding: 4 }}
                        title="X\u00f3a">🗑</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ background: 'rgba(59,130,246,0.05)', borderTop: '2px solid rgba(59,130,246,0.2)' }}>
                <td colSpan={5} style={{ padding: '8px 12px', fontWeight: 700 }}>
                  T\u1ed5ng {zoneId}
                </td>
                <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: '#3b82f6' }}>
                  {zoneTotal.toLocaleString('vi-VN')}
                </td>
                <td colSpan={3} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

// ─ Modal th\u00eam d\u00f2ng BOM ──────────────────────────────────────────────────────
function AddBomModal({ projectId, onClose, onSuccess }: {
  projectId: number; onClose: () => void; onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    zoneId: 'ZN-PH-01', zoneName: 'Ph\u00f2ng h\u1ecd p',
    productName: '', unit: 'm2', qty: '', unitPrice: '', supplyType: 'HOMEPRO_PRODUCTION', note: '',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState('');

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.productName.trim()) { setErr('Vui l\u00f2ng nh\u1eadp t\u00ean s\u1ea3n ph\u1ea9m'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/bom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, projectId, qty: parseFloat(form.qty) || 0, unitPrice: parseFloat(form.unitPrice) || 0 }),
      });
      if (!res.ok) { const d = await res.json(); setErr(d.error ?? 'L\u1ed7i'); return; }
      onSuccess();
    } catch { setErr('Kh\u00f4ng th\u1ec3 k\u1ebft n\u1ed1i server'); }
    finally { setSaving(false); }
  };

  const ZONES = [
    { id: 'ZN-PH-01', name: 'Ph\u00f2ng h\u1ecd p' }, { id: 'ZN-PLV-02', name: 'Ph\u00f2ng l\u00e0m vi\u1ec7c' },
    { id: 'ZN-PGD-03', name: 'Ph\u00f2ng gi\u00e1m \u0111\u1ed1c' }, { id: 'ZN-PTR-04', name: 'Pantry' },
    { id: 'ZN-PCT-05', name: 'Ph\u00f2ng ch\u1ee7 t\u1ecbch' },
  ];

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 520 }}>
        <div className="modal-header">
          <h2 className="modal-title">+ Th\u00eam d\u00f2ng BOM</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {err && <div style={{ color: 'var(--color-danger)', fontSize: 13 }}>⚠️ {err}</div>}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Ph\u00e2n khu</label>
              <select className="form-select" value={form.zoneId}
                onChange={e => {
                  const z = ZONES.find(z => z.id === e.target.value);
                  set('zoneId', e.target.value); if (z) set('zoneName', z.name);
                }}>
                {ZONES.map(z => <option key={z.id} value={z.id}>{z.id} — {z.name}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Ph\u00e2n lo\u1ea1i</label>
              <select className="form-select" value={form.supplyType}
                onChange={e => set('supplyType', e.target.value)}>
                <option value="HOMEPRO_PRODUCTION">HomePro s\u1ea3n xu\u1ea5t</option>
                <option value="INSTALLATION_ONLY">CĐT c\u1ea5p — ch\u1ec9 l\u1eafp \u0111\u1eb7t</option>
              </select>
            </div>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">T\u00ean s\u1ea3n ph\u1ea9m *</label>
            <input className="form-input" value={form.productName}
              onChange={e => set('productName', e.target.value)}
              placeholder="VD: L\u00e8n ch\u00e2n t\u01b0\u1eddng, R\u00e8m che n\u1eafng..." />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">\u0110\u01a1n v\u1ecb</label>
              <select className="form-select" value={form.unit} onChange={e => set('unit', e.target.value)}>
                {['m2', 'md', 'c\u00e1i', 'h\u1ec7', 'b\u1ed9', 'kg', 'l\u00f4'].map(u => <option key={u}>{u}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">S\u1ed1 l\u01b0\u1ee3ng</label>
              <input className="form-input" type="number" min="0" step="0.01"
                value={form.qty} onChange={e => set('qty', e.target.value)} placeholder="0" />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">\u0110\u01a1n gi\u00e1 (VN\u0110)</label>
              <input className="form-input" type="number" min="0"
                value={form.unitPrice} onChange={e => set('unitPrice', e.target.value)} placeholder="0" />
            </div>
          </div>

          {form.qty && form.unitPrice && (
            <div style={{ background: 'rgba(16,185,129,0.08)', borderRadius: 8, padding: '8px 14px', fontSize: 13 }}>
              ✅ Th\u00e0nh ti\u1ec1n: <strong>{(parseFloat(form.qty) * parseFloat(form.unitPrice)).toLocaleString('vi-VN')} VN\u0110</strong>
            </div>
          )}

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Ghi ch\u00fa</label>
            <input className="form-input" value={form.note} onChange={e => set('note', e.target.value)}
              placeholder="VD: CĐT c\u1ea5p v\u1eadt t\u01b0..." />
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '1rem 1.5rem',
          borderTop: '1px solid var(--color-border)' }}>
          <button className="btn btn-ghost" onClick={onClose}>H\u1ee7y</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Đang lưu...' : '+ Lưu BOM'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BOQ Column Schema — dùng trong Visual Matcher của ImportBomModal
// ─────────────────────────────────────────────────────────────────────────────
const BOQ_UI_COLUMNS = [
  { field: 'index',     label: 'STT',                     required: false },
  { field: 'itemName',  label: 'Tên sản phẩm / Hạng mục', required: true  },
  { field: 'unit',      label: 'Đơn vị (ĐV)',              required: false },
  { field: 'quantity',  label: 'Khối lượng / Số lượng',    required: false },
  { field: 'unitPrice', label: 'Đơn giá',                  required: false },
  { field: 'projectNotes', label: 'Ghi chú / Phân loại',  required: false },
];

// ─────────────────────────────────────────────────────────────────────────────
// BomColumnMatcherGrid — Bảng đối chiếu Xanh/Đỏ cho BOQ import
// ─────────────────────────────────────────────────────────────────────────────
function BomColumnMatcherGrid({
  colMap, fileHeaders,
}: { colMap: ColumnMapResult; fileHeaders: string[] }) {
  const requiredMissing = BOQ_UI_COLUMNS.filter(c => c.required && !colMap.fieldToColumn[c.field]);
  const canImport = requiredMissing.length === 0;

  return (
    <div style={{ marginBottom: 12 }}>
      {/* Status badge */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 6 }}>
          🔍 Đối chiếu cột
          <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--color-muted)' }}>({fileHeaders.length} cột trong file)</span>
        </span>
        {canImport
          ? <span style={{ fontSize: 11, padding: '2px 10px', borderRadius: 20, background: 'rgba(16,185,129,0.12)', color: '#10B981', fontWeight: 600 }}>✓ Sẵn sàng phân tích</span>
          : <span style={{ fontSize: 11, padding: '2px 10px', borderRadius: 20, background: 'rgba(239,68,68,0.12)', color: '#EF4444', fontWeight: 600 }}>❌ Thiếu cột bắt buộc</span>}
      </div>

      {/* Grid */}
      <div style={{ border: '1px solid var(--color-border)', borderRadius: 8, overflow: 'hidden', fontSize: 12 }}>
        {/* Header */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 90px', background: 'rgba(0,0,0,0.05)', padding: '6px 12px', fontWeight: 700, fontSize: 11, color: 'var(--color-muted)', letterSpacing: '0.04em' }}>
          <span>CỘT YÊU CẦU</span><span>CỘT TRONG FILE</span><span style={{ textAlign: 'center' }}>TRẠNG THÁI</span>
        </div>

        {BOQ_UI_COLUMNS.map((col, i) => {
          const matched = colMap.fieldToColumn[col.field];
          const isMatch  = !!matched;
          const isMissRequired = col.required && !isMatch;
          return (
            <div key={col.field} style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr 90px',
              padding: '8px 12px', alignItems: 'center',
              background: isMissRequired ? 'rgba(239,68,68,0.07)' : isMatch ? 'rgba(16,185,129,0.05)' : 'transparent',
              borderTop: i > 0 ? '1px solid var(--color-border)' : 'none',
              transition: 'background 0.2s',
            }}>
              {/* Trái: tên cột yêu cầu */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontWeight: 600 }}>{col.label}</span>
                {col.required && (
                  <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 4, background: 'rgba(239,68,68,0.15)', color: '#EF4444', fontWeight: 700 }}>BẮT BUỘC</span>
                )}
              </div>
              {/* Phải: tên cột trong file */}
              <div style={{ color: isMatch ? '#059669' : '#9CA3AF', fontFamily: 'monospace', fontSize: 11 }}>
                {matched ? `"${matched}"` : '—  chưa tìm thấy'}
              </div>
              {/* Trạng thái */}
              <div style={{ textAlign: 'center' }}>
                {isMissRequired
                  ? <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 10, background: 'rgba(239,68,68,0.15)', color: '#EF4444', fontWeight: 700 }}>❌ Thiếu</span>
                  : isMatch
                    ? <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 10, background: 'rgba(16,185,129,0.15)', color: '#10B981', fontWeight: 700 }}>✓ Khớp</span>
                    : <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 10, background: 'rgba(245,158,11,0.12)', color: '#F59E0B', fontWeight: 600 }}>⚠ Tùy chọn</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Cảnh báo block */}
      {!canImport && (
        <div style={{ marginTop: 8, padding: '8px 12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, fontSize: 12, color: '#EF4444' }}>
          ⛔ File thiếu cột <strong>"Tên sản phẩm / Hạng mục"</strong>.
          Hãy đổi tên cột trong Excel thành: <code style={{ background: 'rgba(0,0,0,0.06)', padding: '1px 5px', borderRadius: 3 }}>"Hạng mục"</code>, <code style={{ background: 'rgba(0,0,0,0.06)', padding: '1px 5px', borderRadius: 3 }}>"Tên sản phẩm"</code> hoặc <code style={{ background: 'rgba(0,0,0,0.06)', padding: '1px 5px', borderRadius: 3 }}>"Item Name"</code>.
        </div>
      )}

      {/* Cột không nhận diện */}
      {colMap.unmappedHeaders.length > 0 && (
        <div style={{ marginTop: 6, fontSize: 11, color: 'var(--color-muted)' }}>
          🔵 Không nhận diện: {colMap.unmappedHeaders.map(h => (
            <code key={h} style={{ margin: '0 3px', padding: '1px 5px', background: 'rgba(0,0,0,0.06)', borderRadius: 3 }}>"{h}"</code>
          ))}
        </div>
      )}
    </div>
  );
}

// ─ Import BOQ Modal (ETL Parser 3 bước) ──────────────────────────────────────
const SAMPLE_CSV = `ZN-PH-01,Phong hop,
1,Len chan tuong,md,45.6,350000,HomePro sx
2,Rem che nang,m2,18.0,450000,CĐT cap
ZN-PLV-02,Phong lam viec,
1,Ban lam viec,cai,8,2500000,
2,Ke tuong,cai,12,800000,`;

type ParsedPreview = {
  zoneId: string; zoneName: string; productName: string;
  unit: string; qty: number; unitPrice: number; total: number; supplyType: string;
};

function ImportBomModal({ projectId, onClose, onSuccess }: {
  projectId: number; onClose: () => void; onSuccess: () => Promise<void>;
}) {
  const [step,       setStep]       = useState<'input' | 'preview' | 'done'>('input');
  const [csvText,    setCsvText]    = useState('');
  const [parsed,     setParsed]     = useState<ParsedPreview[]>([]);
  const [replace,    setReplace]    = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [err,        setErr]        = useState('');
  const [result,     setResult]     = useState<{ imported: number; corrected: number; warnings: string[] } | null>(null);
  // ── File upload states ─────────────────────────────────────────────────────
  const [inputMode,    setInputMode]    = useState<'file' | 'paste'>('file');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isDragOver,   setIsDragOver]   = useState(false);
  const [parsing,      setParsing]      = useState(false);
  const [fileHeaders,  setFileHeaders]  = useState<string[]>([]);
  const [colMap,       setColMap]       = useState<ColumnMapResult | null>(null);

  // ── Auto-parse headers khi chọn file ──────────────────────────────────────
  useEffect(() => {
    if (!uploadedFile) { setFileHeaders([]); setColMap(null); return; }
    setParsing(true);
    parseClientHeaders(uploadedFile).then(headers => {
      setFileHeaders(headers);
      setColMap(headers.length > 0 ? buildColumnMap(headers) : null);
      setParsing(false);
    });

    // Đọc nội dung file → điền vào csvText để ETL parse được
    const reader = new FileReader();
    if (uploadedFile.name.endsWith('.csv') || uploadedFile.name.endsWith('.txt')) {
      reader.onload = e => {
        const txt = ((e.target?.result as string) ?? '').replace(/^\uFEFF/, '');
        setCsvText(txt);
      };
      reader.readAsText(uploadedFile, 'utf-8');
    } else if (uploadedFile.name.match(/\.xlsx?$/i)) {
      reader.onload = async e => {
        try {
          const XLSX = await import('xlsx');
          const data = e.target?.result as ArrayBuffer;
          const wb = XLSX.read(new Uint8Array(data), { type: 'array' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          // Chuyển sheet → CSV text cho ETL parser
          const csv = XLSX.utils.sheet_to_csv(ws);
          setCsvText(csv);
        } catch { setErr('Không đọc được file XLSX'); }
      };
      reader.readAsArrayBuffer(uploadedFile);
    }
  }, [uploadedFile]);

  // canImport: file đủ cột bắt buộc
  const canImportFile = !colMap
    ? true  // chưa đọc được headers → vẫn cho thử
    : BOQ_UI_COLUMNS.filter(c => c.required).every(c => !!colMap.fieldToColumn[c.field]);

  // Hàm xử lý drop/change file
  function handleFileAccept(f: File) {
    if (!/\.(xlsx?|csv|txt)$/i.test(f.name)) {
      setErr('Chỉ hỗ trợ .xlsx, .xls, .csv'); return;
    }
    setUploadedFile(f); setErr('');
  }

  // BƯỚC 2: buildRawLines — nhận diện zone header linh hoạt
  // Hỗ trợ cả định dạng ZN-XXX-NN và plain Vietnamese text như "PHÒNG HỌP"
  const buildRawLines = (csv: string) => {
    const lines = csv.trim().split('\n').filter(Boolean);
    const raw: Array<{ stt: number; zoneHeader?: string; productName: string; unit: string; qty: number; unitPrice: number; note: string }> = [];
    let stt = 1;
    for (const line of lines) {
      const parts = line.split(',').map(s => s.trim());

      // Zone header kiểu ZN-XXX-NN (định dạng cũ)
      const isZnFormat = parts[0]?.match(/^ZN-[A-Z0-9]+-\d{2}/i);
      // Zone header kiểu plain text (chữ in hoa không có STT số, không có qty)
      const isPlainHeader = !parts[0]?.match(/^\d/) && parts.length <= 3
        && !parts[2] && (parts[0]?.length ?? 0) > 3;

      if (isZnFormat) {
        raw.push({ stt: 0, zoneHeader: `${parts[0]} - ${parts[1] ?? ''}`, productName: '', unit: '', qty: 0, unitPrice: 0, note: '' });
        stt = 1;
      } else if (isPlainHeader && parts[0]?.trim()) {
        // Auto-gen zone ID từ tên phân khu tiếng Việt
        raw.push({ stt: 0, zoneHeader: parts[0].trim(), productName: '', unit: '', qty: 0, unitPrice: 0, note: '' });
        stt = 1;
      } else if (parts.length >= 4) {
        // Dòng dữ liệu — parts: [STT, Tên, ĐV, SL, Đơn giá, Ghi chú]
        const productName = parts[1] ?? parts[0] ?? '';
        const unit        = parts[2] ?? 'cái';
        // BƯỚC 1: qty=0 → 1.0 (không từ chối bản ghi)
        const qty         = parseFloat(parts[3]) || 1.0;
        const unitPrice   = parseFloat(parts[4]) || 0;
        raw.push({ stt: stt++, productName, unit, qty, unitPrice, note: parts[5] ?? '' });
      }
    }
    return raw;
  };

  // BƯỚC 3: classifySupplyType cục bộ (xử lý đúng chữ Đ tiếng Việt)
  const classifyLocal = (note: string, name: string): string => {
    const n = (note + ' ' + name).toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
    if (n.includes('cdt') || n.includes('khong thuc hien') || n.includes('do cdt')) return 'INSTALLATION_ONLY';
    if (/sofa|ghe sofa|ban an|dining|quat tran|ceiling fan|dieu hoa|may lanh|rem|curtain|tranh treo|may giat|tu lanh/.test(n))
      return 'PROCUREMENT_COMMERCIAL';
    return 'HOMEPRO_PRODUCTION';
  };

  const handleParse = () => {
    setErr('');
    const raw = buildRawLines(csvText);
    const dataLines = raw.filter(r => !r.zoneHeader);
    if (dataLines.length === 0) { setErr('Không nhận dạng được dữ liệu. Kiểm tra định dạng CSV.'); return; }
    const preview: ParsedPreview[] = [];
    let curZone = 'ZN-GEN-00'; let curName = 'Tổng thể';
    let zoneCounter = 0;
    for (const r of raw) {
      if (r.zoneHeader) {
        // Thử match ZN-xxx-nn trước
        const m = r.zoneHeader.match(/ZN-[A-Z0-9]+-\d{2}/i);
        if (m) {
          curZone = m[0].toUpperCase();
          curName = r.zoneHeader.replace(curZone, '').replace(/[-,]/g, '').trim();
        } else {
          // Auto-generate zone ID từ tên phòng
          zoneCounter++;
          const nameClean = r.zoneHeader.toUpperCase().normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '').replace(/Đ/g, 'D')
            .replace(/[^A-Z0-9\s]/g, '').trim().split(/\s+/).slice(0, 2).join('')
            .slice(0, 3);
          curZone = `ZN-${nameClean || 'GEN'}-${String(zoneCounter).padStart(2, '0')}`;
          curName = r.zoneHeader.trim();
        }
        continue;
      }
      if (!r.productName) continue;
      preview.push({
        zoneId:     curZone,
        zoneName:   curName,
        productName: r.productName,
        unit:        r.unit || 'cái',
        qty:         r.qty > 0 ? r.qty : 1.0,   // BƯỚC 1: luôn > 0
        unitPrice:   r.unitPrice,
        total:       (r.qty > 0 ? r.qty : 1.0) * r.unitPrice,
        supplyType:  classifyLocal(r.note, r.productName),
      });
    }
    setParsed(preview);
    setStep('preview');
  };

  // BƯỚC 4: CRITICAL FIX — gọi reload() NGAY sau import thành công
  const handleImport = async () => {
    setSaving(true); setErr('');
    try {
      const res = await fetch('/api/bom/import', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, rawLines: buildRawLines(csvText), replaceZone: replace }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error ?? 'Lỗi import'); return; }
      setResult({ imported: data.imported, corrected: data.corrected, warnings: data.warnings ?? [] });
      setStep('done');
      // ★ RELOAD NGAY: cập nhật UI không cần F5
      await onSuccess();
    } catch { setErr('Không thể kết nối server'); }
    finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 680 }}>
        <div className="modal-header">
          <h2 className="modal-title">⬆ Import BOQ — ETL Parser</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {err && <div style={{ color: 'var(--color-danger)', fontSize: 13, background: 'rgba(239,68,68,0.08)', padding: '8px 12px', borderRadius: 8 }}>⚠️ {err}</div>}

          {step === 'input' && (
            <>
              {/* ── Tab switcher ─────────────────────────────────────────── */}
              <div style={{ display: 'flex', gap: 0, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--color-border)', fontSize: 12, marginBottom: 4 }}>
                {(['file', 'paste'] as const).map(mode => (
                  <button key={mode} type="button"
                    onClick={() => setInputMode(mode)}
                    style={{
                      flex: 1, padding: '7px 0', border: 'none', cursor: 'pointer',
                      fontWeight: inputMode === mode ? 700 : 400,
                      background: inputMode === mode ? 'rgba(59,130,246,0.12)' : 'transparent',
                      color: inputMode === mode ? '#3b82f6' : 'var(--color-muted)',
                      transition: 'all 0.2s',
                    }}>
                    {mode === 'file' ? '📁 Tải file lên (Excel / CSV)' : '✏️  Dán thủ công (CSV)'}
                  </button>
                ))}
              </div>

              {/* ── MODE 1: FILE UPLOAD ──────────────────────────────────── */}
              {inputMode === 'file' && (
                <>
                  {/* Dropzone */}
                  <label
                    htmlFor="bom-file-input"
                    onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={e => {
                      e.preventDefault(); setIsDragOver(false);
                      const f = e.dataTransfer.files[0];
                      if (f) handleFileAccept(f);
                    }}
                    style={{
                      display: 'block',
                      border: isDragOver ? '2px dashed #3b82f6' : uploadedFile ? '2px dashed #10B981' : '2px dashed var(--color-border-light)',
                      borderRadius: 10, padding: uploadedFile ? '14px 20px' : '28px 20px',
                      textAlign: 'center', cursor: 'pointer',
                      background: isDragOver ? 'rgba(59,130,246,0.06)' : uploadedFile ? 'rgba(16,185,129,0.05)' : 'rgba(31,41,55,0.3)',
                      transition: 'all 0.2s',
                    }}
                  >
                    {uploadedFile ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: 22 }}>📄</span>
                          <div style={{ textAlign: 'left' }}>
                            <div style={{ fontWeight: 700, fontSize: 13, color: '#10B981' }}>{uploadedFile.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--color-muted)' }}>
                              {(uploadedFile.size / 1024).toFixed(1)} KB
                              {parsing ? ' — Đang đọc headers...' : fileHeaders.length > 0 ? ` — ${fileHeaders.length} cột` : ''}
                            </div>
                          </div>
                        </div>
                        <button type="button"
                          onClick={e => { e.preventDefault(); setUploadedFile(null); setCsvText(''); setFileHeaders([]); setColMap(null); }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--color-muted)', lineHeight: 1 }}
                          title="Xóa file">
                          ✕
                        </button>
                      </div>
                    ) : (
                      <>
                        <div style={{ fontSize: 28, marginBottom: 8 }}>⬆️</div>
                        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Nhấp hoặc kéo-thả file vào đây</div>
                        <div style={{ fontSize: 11, color: 'var(--color-muted)' }}>Hỗ trợ .xlsx, .xls, .csv — có hoặc không có dòng tiêu đề</div>
                      </>
                    )}
                    <input id="bom-file-input" type="file" accept=".xlsx,.xls,.csv,.txt"
                      style={{ display: 'none' }}
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleFileAccept(f); }} />
                  </label>

                  {/* ── VISUAL COLUMN MATCHER ──────────────────────────── */}
                  {uploadedFile && !parsing && colMap && fileHeaders.length > 0 && (
                    <BomColumnMatcherGrid colMap={colMap} fileHeaders={fileHeaders} />
                  )}

                  {/* File không có headers (định dạng positional CSV) */}
                  {uploadedFile && !parsing && fileHeaders.length === 0 && (
                    <div style={{ fontSize: 12, color: '#F59E0B', padding: '8px 12px', background: 'rgba(245,158,11,0.08)', borderRadius: 6 }}>
                      ⚠️ Không đọc được tiêu đề cột — file sẽ được phân tích theo thứ tự cột (positional).
                    </div>
                  )}

                  {parsing && (
                    <div style={{ fontSize: 12, color: 'var(--color-muted)', textAlign: 'center', padding: 8 }}>
                      ⏳ Đang phân tích cột từ file...
                    </div>
                  )}
                </>
              )}

              {/* ── MODE 2: PASTE THỦ CÔNG ───────────────────────────────── */}
              {inputMode === 'paste' && (
                <>
                  <div style={{ fontSize: 12, color: 'var(--color-muted)', background: 'rgba(59,130,246,0.06)', borderRadius: 8, padding: '10px 14px', lineHeight: 1.8 }}>
                    <strong>Định dạng CSV positional:</strong><br />
                    <code>ZN-PH-01,Phong hop,</code> ← Zone ID, Tên zone<br />
                    <code>1,Len chan tuong,md,45.6,350000,HomePro sx</code> ← STT, Tên, ĐV, SL, Đơn giá, Ghi chú
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <label className="form-label" style={{ margin: 0 }}>Dữ liệu BOQ (CSV)</label>
                      <button type="button" onClick={() => setCsvText(SAMPLE_CSV)}
                        style={{ fontSize: 11, color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer' }}>
                        Dùng mẫu demo
                      </button>
                    </div>
                    <textarea className="form-input" rows={10} value={csvText} onChange={e => setCsvText(e.target.value)}
                      placeholder="Dán dữ liệu CSV tại đây..." style={{ fontFamily: 'monospace', fontSize: 12, resize: 'vertical' }} />
                  </div>
                </>
              )}

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                <input type="checkbox" checked={replace} onChange={e => setReplace(e.target.checked)} />
                Xóa dữ liệu cũ của các zone trong file này trước khi import
              </label>
            </>
          )}

          {step === 'preview' && (
            <>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-success)' }}>
                ✅ Phân tích: <strong>{parsed.length} dòng</strong> từ <strong>{[...new Set(parsed.map(p => p.zoneId))].length} phân khu</strong>
              </div>
              <div style={{ maxHeight: 280, overflowY: 'auto', fontSize: 12 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr style={{ background: 'rgba(0,0,0,0.04)' }}>
                    {['Zone','Sản phẩm','ĐV','SL','Đơn giá','Thành tiền','Loại'].map(h =>
                      <th key={h} style={{ padding: '6px 8px', textAlign: 'left', color: 'var(--color-muted)', fontWeight: 600 }}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {parsed.map((p, i) => (
                      <tr key={i} style={{ borderTop: '1px solid var(--color-border)' }}>
                        <td style={{ padding: '5px 8px', color: '#3b82f6', fontWeight: 600, fontSize: 11 }}>{p.zoneId}</td>
                        <td style={{ padding: '5px 8px' }}>{p.productName}</td>
                        <td style={{ padding: '5px 8px', color: 'var(--color-muted)' }}>{p.unit}</td>
                        <td style={{ padding: '5px 8px' }}>{p.qty}</td>
                        <td style={{ padding: '5px 8px' }}>{p.unitPrice.toLocaleString('vi-VN')}</td>
                        <td style={{ padding: '5px 8px', fontWeight: 600 }}>{p.total.toLocaleString('vi-VN')}</td>
                        <td style={{ padding: '5px 8px' }}>
                          <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 10,
                            background: p.supplyType === 'HOMEPRO_PRODUCTION' ? 'rgba(59,130,246,0.12)' : 'rgba(156,163,175,0.15)',
                            color: p.supplyType === 'HOMEPRO_PRODUCTION' ? '#3b82f6' : '#9ca3af' }}>
                            {p.supplyType === 'HOMEPRO_PRODUCTION' ? 'HP SX' : 'CĐT'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#3b82f6' }}>
                Tổng: {parsed.reduce((s, p) => s + p.total, 0).toLocaleString('vi-VN')} VNĐ
              </div>
            </>
          )}

          {step === 'done' && result && (
            <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Import thành công!</div>
              <div style={{ fontSize: 14, color: 'var(--color-muted)' }}>
                <strong>{result.imported}</strong> dòng đã lưu vào database
                {result.corrected > 0 && <><br /><span style={{ color: '#f59e0b' }}>⚡ {result.corrected} tên tự động sửa (Levenshtein)</span></>}
              </div>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '1rem 1.5rem', borderTop: '1px solid var(--color-border)' }}>
          <button className="btn btn-ghost" onClick={() => step === 'preview' ? setStep('input') : onClose}>
            {step === 'preview' ? '← Quay lại' : 'Đóng'}
          </button>
          {step === 'input' && (
            <button className="btn btn-primary"
              onClick={handleParse}
              disabled={!csvText.trim() || (inputMode === 'file' && !!uploadedFile && !canImportFile)}
              title={!canImportFile && uploadedFile ? 'File thiếu cột bắt buộc' : ''}
              style={{ opacity: (!canImportFile && !!uploadedFile) ? 0.5 : 1 }}
            >
              {!canImportFile && uploadedFile ? '⛔ Thiếu cột bắt buộc' : 'Phân tích →'}
            </button>
          )}
          {step === 'preview' && <button className="btn btn-primary" onClick={handleImport} disabled={saving}>{saving ? 'Đang import...' : `✅ Lưu ${parsed.length} dòng`}</button>}
          {step === 'done' && <button className="btn btn-primary" onClick={onSuccess}>Xong →</button>}
        </div>
      </div>
    </div>
  );
}
