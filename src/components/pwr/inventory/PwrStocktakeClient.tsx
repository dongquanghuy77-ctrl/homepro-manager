'use client';
import React, { useState, useMemo } from 'react';
import { ClipboardList, Save, RotateCcw, CheckCircle2, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react';

type Material = {
  id: number;
  name: string;
  skuCode?: string;
  category?: string;
  unit?: string;
  stockLevel: number | string;
  reservedLevel: number | string;
};

type EditState = {
  stockLevel: string;
  reservedLevel: string;
  dirty: boolean;
  saving: boolean;
  saved: boolean;
  error: string | null;
};

export default function PwrStocktakeClient({ materials }: { materials: Material[] }) {
  const [reason, setReason] = useState('Kiểm kê kho định kỳ');
  const [edits, setEdits] = useState<Record<number, EditState>>(() => {
    const init: Record<number, EditState> = {};
    materials.forEach(m => {
      init[m.id] = {
        stockLevel: String(parseFloat(String(m.stockLevel ?? 0))),
        reservedLevel: String(Math.max(0, parseFloat(String(m.reservedLevel ?? 0)))),
        dirty: false,
        saving: false,
        saved: false,
        error: null,
      };
    });
    return init;
  });

  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [globalMsg, setGlobalMsg] = useState<string | null>(null);

  const boardMats  = useMemo(() => materials.filter(m => m.category === 'BOARD' || m.category === 'VAN' || m.unit?.toLowerCase() === 'tam').sort((a,b) => a.name.localeCompare(b.name)), [materials]);
  const edgeMats   = useMemo(() => materials.filter(m => m.category === 'EDGE_BAND' || m.category === 'NEP').sort((a,b) => a.name.localeCompare(b.name)), [materials]);
  const otherMats  = useMemo(() => materials.filter(m => !boardMats.includes(m) && !edgeMats.includes(m)).sort((a,b) => a.name.localeCompare(b.name)), [materials, boardMats, edgeMats]);

  const dirtyCount = Object.values(edits).filter(e => e.dirty).length;

  const setField = (id: number, field: 'stockLevel' | 'reservedLevel', val: string) => {
    const orig = materials.find(m => m.id === id)!;
    const origStock = String(parseFloat(String(orig.stockLevel ?? 0)));
    const origReserve = String(Math.max(0, parseFloat(String(orig.reservedLevel ?? 0))));
    setEdits(prev => {
      const cur = { ...prev[id], [field]: val, saved: false, error: null };
      cur.dirty = cur.stockLevel !== origStock || cur.reservedLevel !== origReserve;
      return { ...prev, [id]: cur };
    });
  };

  const saveOne = async (id: number) => {
    const e = edits[id];
    const stock   = parseFloat(e.stockLevel);
    const reserve = parseFloat(e.reservedLevel);
    if (isNaN(stock) || isNaN(reserve)) {
      setEdits(prev => ({ ...prev, [id]: { ...prev[id], error: 'So khong hop le' } }));
      return;
    }
    setEdits(prev => ({ ...prev, [id]: { ...prev[id], saving: true, error: null } }));
    try {
      const res = await fetch(`/api/pwr/materials/${id}/stock`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stockLevel: stock, reservedLevel: reserve, reason }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Loi');
      setEdits(prev => ({ ...prev, [id]: { ...prev[id], saving: false, saved: true, dirty: false } }));
    } catch (err: any) {
      setEdits(prev => ({ ...prev, [id]: { ...prev[id], saving: false, error: err.message } }));
    }
  };

  const saveAll = async () => {
    const dirtyIds = Object.entries(edits).filter(([, e]) => e.dirty).map(([id]) => parseInt(id));
    if (dirtyIds.length === 0) { setGlobalMsg('Khong co thay doi nao de luu.'); return; }
    setIsSavingAll(true);
    setGlobalMsg(null);
    let ok = 0, fail = 0;
    for (const id of dirtyIds) {
      const e = edits[id];
      const stock   = parseFloat(e.stockLevel);
      const reserve = parseFloat(e.reservedLevel);
      try {
        const res = await fetch(`/api/pwr/materials/${id}/stock`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stockLevel: stock, reservedLevel: reserve, reason }),
        });
        if (!res.ok) throw new Error('fail');
        setEdits(prev => ({ ...prev, [id]: { ...prev[id], saving: false, saved: true, dirty: false } }));
        ok++;
      } catch {
        setEdits(prev => ({ ...prev, [id]: { ...prev[id], error: 'Luu that bai' } }));
        fail++;
      }
    }
    setIsSavingAll(false);
    setGlobalMsg(`Da luu ${ok} vat tu${fail > 0 ? ` | ${fail} that bai` : ''}.`);
  };

  const resetAll = () => {
    setEdits(prev => {
      const next = { ...prev };
      materials.forEach(m => {
        next[m.id] = {
          stockLevel: String(parseFloat(String(m.stockLevel ?? 0))),
          reservedLevel: String(Math.max(0, parseFloat(String(m.reservedLevel ?? 0)))),
          dirty: false, saving: false, saved: false, error: null,
        };
      });
      return next;
    });
    setGlobalMsg(null);
  };

  const toggleGroup = (g: string) => {
    setCollapsedGroups(prev => { const n = new Set(prev); n.has(g) ? n.delete(g) : n.add(g); return n; });
  };

  const renderGroup = (title: string, icon: string, group: Material[]) => {
    if (group.length === 0) return null;
    const collapsed = collapsedGroups.has(title);
    return (
      <React.Fragment key={title}>
        <tr style={{ background: 'var(--color-surface-2)', borderBottom: '1px solid var(--color-border)', cursor: 'pointer' }} onClick={() => toggleGroup(title)}>
          <td colSpan={7} style={{ padding: '14px 20px', fontWeight: 800, fontSize: 15 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {collapsed ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
              {icon} {title} ({group.length} vat tu)
            </span>
          </td>
        </tr>
        {!collapsed && group.map(mat => {
          const e = edits[mat.id];
          const origStock = parseFloat(String(mat.stockLevel ?? 0));
          const origReserve = Math.max(0, parseFloat(String(mat.reservedLevel ?? 0)));
          const newStock = parseFloat(e.stockLevel);
          const newReserve = parseFloat(e.reservedLevel);
          const stockDiff = isNaN(newStock) ? null : newStock - origStock;
          const reserveDiff = isNaN(newReserve) ? null : newReserve - origReserve;

          let rowBg = 'transparent';
          if (e.saved) rowBg = 'rgba(16,185,129,0.06)';
          else if (e.dirty) rowBg = 'rgba(251,191,36,0.07)';
          if (e.error) rowBg = 'rgba(239,68,68,0.06)';

          return (
            <tr key={mat.id} style={{ borderBottom: '1px solid var(--color-border)', background: rowBg, transition: 'background 0.2s' }}>
              <td style={{ padding: '10px 8px', color: 'var(--color-text-muted)', fontFamily: 'monospace', fontSize: 12 }}>#{mat.id}</td>
              <td style={{ padding: '10px 16px', fontWeight: 600, fontSize: 14 }}>{mat.name}</td>
              <td style={{ padding: '10px 16px', fontSize: 12, color: 'var(--color-text-muted)' }}>{mat.unit}</td>

              {/* Ton Tong input */}
              <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                  <span style={{ fontSize: 11, color: 'var(--color-text-muted)', minWidth: 28 }}>{origStock}</span>
                  <span style={{ color: 'var(--color-text-muted)' }}>→</span>
                  <input
                    type="number"
                    value={e.stockLevel}
                    onChange={ev => setField(mat.id, 'stockLevel', ev.target.value)}
                    step="0.5"
                    style={{ width: 72, padding: '6px 8px', borderRadius: 6, border: e.dirty ? '2px solid #f59e0b' : '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)', fontWeight: 700, fontSize: 14, textAlign: 'center', outline: 'none' }}
                  />
                  {stockDiff !== null && stockDiff !== 0 && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: stockDiff > 0 ? '#10b981' : '#ef4444' }}>
                      {stockDiff > 0 ? '+' : ''}{stockDiff.toFixed(1)}
                    </span>
                  )}
                </div>
              </td>

              {/* Giam Long input */}
              <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                  <span style={{ fontSize: 11, color: 'var(--color-text-muted)', minWidth: 28 }}>{origReserve}</span>
                  <span style={{ color: 'var(--color-text-muted)' }}>→</span>
                  <input
                    type="number"
                    value={e.reservedLevel}
                    onChange={ev => setField(mat.id, 'reservedLevel', ev.target.value)}
                    step="0.5"
                    min="0"
                    style={{ width: 72, padding: '6px 8px', borderRadius: 6, border: e.dirty ? '2px solid #f59e0b' : '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)', fontWeight: 700, fontSize: 14, textAlign: 'center', outline: 'none' }}
                  />
                  {reserveDiff !== null && reserveDiff !== 0 && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#8b5cf6' }}>
                      {reserveDiff > 0 ? '+' : ''}{reserveDiff.toFixed(1)}
                    </span>
                  )}
                </div>
              </td>

              {/* Kha Dung preview */}
              <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 800 }}>
                {(() => {
                  const avail = isNaN(newStock) || isNaN(newReserve) ? origStock - origReserve : newStock - newReserve;
                  return <span style={{ color: avail < 0 ? '#ef4444' : '#10b981' }}>{avail.toFixed(1)}</span>;
                })()}
              </td>

              {/* Status */}
              <td style={{ padding: '10px 16px', textAlign: 'center', width: 100 }}>
                {e.error && <span style={{ color: '#ef4444', fontSize: 12 }}><AlertCircle size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> {e.error}</span>}
                {e.saved && !e.error && <span style={{ color: '#10b981', fontSize: 12 }}><CheckCircle2 size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> Da luu</span>}
                {e.dirty && !e.saving && !e.error && (
                  <button
                    onClick={() => saveOne(mat.id)}
                    style={{ background: '#f59e0b', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: 6, fontWeight: 700, cursor: 'pointer', fontSize: 12 }}
                  >
                    Luu
                  </button>
                )}
                {e.saving && <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>Dang luu...</span>}
              </td>
            </tr>
          );
        })}
      </React.Fragment>
    );
  };

  return (
    <div style={{ padding: '24px', maxWidth: 1100, margin: '0 auto', fontFamily: 'var(--font-sans)', color: 'var(--color-text)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg, #f59e0b, #d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ClipboardList size={24} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Kiem Ke Kho — Dieu Chinh Thu Cong</h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--color-text-muted)' }}>
              Chinh sua so luong tung vat tu. Moi thay doi se duoc ghi vao lich su giao dich (ADJUSTMENT).
            </p>
          </div>
        </div>
        <a href="/pwr/inventory" style={{ fontSize: 13, color: '#3b82f6', textDecoration: 'none', fontWeight: 600, padding: '8px 14px', border: '1px solid #3b82f6', borderRadius: 8 }}>
          Quay lai Kho
        </a>
      </div>

      {/* Reason + Action bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, padding: 16, background: 'var(--color-surface)', borderRadius: 12, border: '1px solid var(--color-border)' }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: 'var(--color-text-muted)' }}>Ly do dieu chinh (ghi vao lich su):</label>
          <input
            type="text"
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="VD: Kiem ke thang 9/2026"
            style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: 14 }}
          />
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', paddingTop: 20 }}>
          <button
            onClick={resetAll}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-text)', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
          >
            <RotateCcw size={16} /> Hoan tac
          </button>
          <button
            onClick={saveAll}
            disabled={dirtyCount === 0 || isSavingAll}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 8, border: 'none', background: dirtyCount > 0 ? '#10b981' : '#64748b', color: '#fff', cursor: dirtyCount > 0 ? 'pointer' : 'not-allowed', fontWeight: 700, fontSize: 14 }}
          >
            <Save size={16} /> {isSavingAll ? 'Dang luu...' : `Luu tat ca (${dirtyCount})`}
          </button>
        </div>
      </div>

      {globalMsg && (
        <div style={{ padding: '10px 16px', marginBottom: 16, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 8, color: '#10b981', fontWeight: 600, fontSize: 13 }}>
          {globalMsg}
        </div>
      )}

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 16, fontSize: 12, color: 'var(--color-text-muted)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 12, height: 12, borderRadius: 2, background: 'rgba(251,191,36,0.3)', display: 'inline-block' }} /> Da chinh sua (chua luu)</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 12, height: 12, borderRadius: 2, background: 'rgba(16,185,129,0.3)', display: 'inline-block' }} /> Da luu thanh cong</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 12, height: 12, borderRadius: 2, background: 'rgba(239,68,68,0.3)', display: 'inline-block' }} /> Luu that bai</span>
      </div>

      {/* Table */}
      <div style={{ background: 'var(--color-surface)', borderRadius: 12, border: '1px solid var(--color-border)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead style={{ background: 'var(--color-surface-2)', borderBottom: '2px solid var(--color-border)' }}>
            <tr>
              <th style={{ padding: '14px 8px', fontWeight: 700, color: 'var(--color-text-muted)', textAlign: 'left', width: 50 }}>Ma</th>
              <th style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--color-text-muted)', textAlign: 'left' }}>Ten Vat Tu</th>
              <th style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--color-text-muted)', width: 60 }}>DVT</th>
              <th style={{ padding: '14px 16px', fontWeight: 700, color: '#3b82f6', textAlign: 'center', width: 200 }}>Ton Tong (Cu → Moi)</th>
              <th style={{ padding: '14px 16px', fontWeight: 700, color: '#f59e0b', textAlign: 'center', width: 200 }}>Giam Long (Cu → Moi)</th>
              <th style={{ padding: '14px 16px', fontWeight: 700, color: '#10b981', textAlign: 'right', width: 100 }}>Kha Dung (preview)</th>
              <th style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--color-text-muted)', textAlign: 'center', width: 100 }}>Trang thai</th>
            </tr>
          </thead>
          <tbody>
            {renderGroup('PHAN KHU VAN (BOARDS)', '', boardMats)}
            {renderGroup('PHAN KHU NEP (EDGE BANDING)', '', edgeMats)}
            {renderGroup('PHAN KHU PHU KIEN (HARDWARE)', '', otherMats)}
          </tbody>
        </table>
      </div>

      <p style={{ marginTop: 16, fontSize: 12, color: 'var(--color-text-muted)', textAlign: 'center' }}>
        Tong: {materials.length} vat tu · {dirtyCount} da chinh sua · Moi thay doi tao transaction ADJUSTMENT trong Lich su Giao dich
      </p>
    </div>
  );
}
