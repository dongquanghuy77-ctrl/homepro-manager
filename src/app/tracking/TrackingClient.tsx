'use client';
// src/app/tracking/TrackingClient.tsx — Kanban theo d\u00f5i c\u00f4ng \u0111o\u1ea1n s\u1ea3n xu\u1ea5t (QR Scan)

import { useState, useMemo } from 'react';

const STAGES = [
  { id: 'CNC',      label: 'C\u1eaft v\u00e1n CNC',  icon: '🪚', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  { id: 'DAN_CANH', label: 'D\u00e1n c\u1ea1nh',    icon: '🔧', color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
  { id: 'DONG_GOI', label: '\u0110\u00f3ng g\u00f3i',    icon: '📦', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
  { id: 'LAP_DAT',  label: 'L\u1eafp \u0111\u1eb7t',     icon: '🏗️', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
] as const;

type Stage = typeof STAGES[number]['id'];

type TrackLog = {
  id: number; projectId: number | null; bomLineId: number | null;
  qrCode: string | null; stage: string; stageLabel: string | null;
  scannedByName: string | null; location: string | null; note: string | null;
  scannedAt: Date | string | null;
};
type Project = { id: number; code: string; name: string; status: string };
type BomRef   = { id: number; projectId: number; zoneId: string; productName: string };

export default function TrackingClient({ projects, initialLogs, bomLines }: {
  projects: Project[];
  initialLogs: TrackLog[];
  bomLines: BomRef[];
}) {
  const [logs,       setLogs]       = useState<TrackLog[]>(initialLogs);
  const [selProject, setSelProject] = useState(
    projects.find(p => p.status === 'ACTIVE')?.id.toString() ?? ''
  );
  const [showScan,   setShowScan]   = useState(false);
  const [loading,    setLoading]    = useState(false);

  const filtered = useMemo(() =>
    logs.filter(l => !selProject || l.projectId === parseInt(selProject)),
    [logs, selProject]
  );

  const reload = async () => {
    setLoading(true);
    try {
      const url = selProject ? `/api/tracking?projectId=${selProject}` : '/api/tracking';
      const r = await fetch(url);
      const { data } = await r.json();
      setLogs(data ?? []);
    } finally { setLoading(false); }
  };

  const byStage = (stage: string) => filtered.filter(l => l.stage === stage);

  const fmtTime = (d: Date | string | null) => {
    if (!d) return '';
    const dt = typeof d === 'string' ? new Date(d) : d;
    return dt.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh',
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div style={{ padding: '1.5rem' }}>
      {/* ─ Header ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>📡 Theo d\u00f5i c\u00f4ng \u0111o\u1ea1n SX</h1>
          <p style={{ fontSize: 13, color: 'var(--color-muted)', marginTop: 4 }}>
            Qu\u00e9t m\u00e3 QR theo chu\u1ed7i: C\u1eaft CNC → D\u00e1n c\u1ea1nh → \u0110\u00f3ng g\u00f3i → L\u1eafp \u0111\u1eb7t
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={reload} disabled={loading}>
            {loading ? '...' : '↺ T\u1ea3i l\u1ea1i'}
          </button>
          <button className="btn btn-primary" onClick={() => setShowScan(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            📷 Qu\u00e9t / Ghi nh\u1eadn
          </button>
        </div>
      </div>

      {/* ─ Filter ─────────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: '1.5rem' }}>
        <select className="form-select" style={{ maxWidth: 300 }}
          value={selProject} onChange={e => setSelProject(e.target.value)}>
          <option value="">-- T\u1ea5t c\u1ea3 d\u1ef1 \u00e1n --</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>[{p.code}] {p.name}</option>
          ))}
        </select>
      </div>

      {/* ─ T\u1ed5ng quan nhanh ─────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        {STAGES.map(s => {
          const count = byStage(s.id).length;
          return (
            <div key={s.id} style={{
              background: s.bg, border: `1px solid ${s.color}30`,
              borderRadius: 12, padding: '1rem', textAlign: 'center',
            }}>
              <div style={{ fontSize: 28 }}>{s.icon}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: s.color, margin: '4px 0' }}>{count}</div>
              <div style={{ fontSize: 12, color: 'var(--color-muted)' }}>{s.label}</div>
            </div>
          );
        })}
      </div>

      {/* ─ Kanban Board ──────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', alignItems: 'start' }}>
        {STAGES.map(s => {
          const stageLogs = byStage(s.id);
          return (
            <div key={s.id} style={{
              background: 'var(--color-surface)',
              border: `1px solid ${s.color}30`,
              borderRadius: 12, overflow: 'hidden',
            }}>
              {/* Column header */}
              <div style={{
                padding: '10px 14px', background: s.bg,
                borderBottom: `1px solid ${s.color}30`,
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <span style={{ fontSize: 18 }}>{s.icon}</span>
                <span style={{ fontWeight: 700, color: s.color, fontSize: 14 }}>{s.label}</span>
                <span style={{
                  marginLeft: 'auto', background: s.color, color: '#fff',
                  borderRadius: 20, padding: '2px 8px', fontSize: 11, fontWeight: 700,
                }}>{stageLogs.length}</span>
              </div>

              {/* Log cards */}
              <div style={{ padding: 8, maxHeight: 480, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {stageLogs.length === 0 && (
                  <div style={{ padding: '2rem 0', textAlign: 'center', color: 'var(--color-muted)', fontSize: 12 }}>
                    Ch\u01b0a c\u00f3 b\u1ea3n ghi
                  </div>
                )}
                {stageLogs.slice(0, 30).map(log => (
                  <div key={log.id} style={{
                    background: 'var(--color-background)',
                    border: '1px solid var(--color-border)',
                    borderLeft: `3px solid ${s.color}`,
                    borderRadius: 8, padding: '8px 10px',
                  }}>
                    {log.qrCode && (
                      <div style={{ fontFamily: 'monospace', fontSize: 11, color: s.color, marginBottom: 4 }}>
                        📌 {log.qrCode}
                      </div>
                    )}
                    {log.note && (
                      <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 4 }}>{log.note}</div>
                    )}
                    <div style={{ fontSize: 11, color: 'var(--color-muted)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <span>👷 {log.scannedByName ?? 'N/A'}</span>
                      <span>⏰ {fmtTime(log.scannedAt)}</span>
                      {log.location && <span>📍 {log.location}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* ─ Modal Qu\u00e9t QR ────────────────────────────────────────────────────── */}
      {showScan && (
        <ScanModal
          projectId={selProject ? parseInt(selProject) : null}
          bomLines={bomLines.filter(b => !selProject || b.projectId === parseInt(selProject))}
          onClose={() => setShowScan(false)}
          onSuccess={() => { setShowScan(false); reload(); }}
        />
      )}
    </div>
  );
}

// ─ Modal Qu\u00e9t c\u00f4ng \u0111o\u1ea1n ─────────────────────────────────────────────────────────
function ScanModal({ projectId, bomLines, onClose, onSuccess }: {
  projectId: number | null; bomLines: BomRef[];
  onClose: () => void; onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    stage: 'CNC' as Stage, qrCode: '', note: '', bomLineId: '',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          stage: form.stage,
          qrCode: form.qrCode || null,
          note: form.note || null,
          bomLineId: form.bomLineId ? parseInt(form.bomLineId) : null,
        }),
      });
      if (!res.ok) { const d = await res.json(); setErr(d.error ?? 'L\u1ed7i'); return; }
      onSuccess();
    } catch { setErr('L\u1ed7i k\u1ebft n\u1ed1i'); }
    finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 460 }}>
        <div className="modal-header">
          <h2 className="modal-title">📷 Ghi nh\u1eadn c\u00f4ng \u0111o\u1ea1n</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {err && <div style={{ color: 'var(--color-danger)', fontSize: 13 }}>⚠️ {err}</div>}

          {/* Stage selector */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">C\u00f4ng \u0111o\u1ea1n *</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {STAGES.map(s => (
                <button key={s.id} type="button"
                  onClick={() => set('stage', s.id)}
                  style={{
                    padding: '10px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13,
                    border: `2px solid ${form.stage === s.id ? s.color : 'var(--color-border)'}`,
                    background: form.stage === s.id ? s.bg : 'transparent',
                    color: form.stage === s.id ? s.color : 'var(--color-text)',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                  {s.icon} {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* QR Code */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">M\u00e3 QR / M\u00e3 c\u1ea5u ki\u1ec7n</label>
            <input className="form-input" value={form.qrCode}
              onChange={e => set('qrCode', e.target.value)}
              placeholder="Qu\u00e9t m\u00e3 QR ho\u1eb7c nh\u1eadp tay..." />
          </div>

          {/* BOM Line select */}
          {bomLines.length > 0 && (
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Li\u00ean k\u1ebft BOM</label>
              <select className="form-select" value={form.bomLineId} onChange={e => set('bomLineId', e.target.value)}>
                <option value="">-- Ch\u1ecdn s\u1ea3n ph\u1ea9m (t\u00f9y ch\u1ecdn) --</option>
                {bomLines.map(b => (
                  <option key={b.id} value={b.id}>[{b.zoneId}] {b.productName}</option>
                ))}
              </select>
            </div>
          )}

          {/* Note */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Ghi ch\u00fa</label>
            <input className="form-input" value={form.note}
              onChange={e => set('note', e.target.value)} placeholder="VD: B\u1ed9 t\u1ee7 ph\u00f2ng h\u1ecd p - b\u1ea3n l\u1ec1 Blum..." />
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8,
          padding: '1rem 1.5rem', borderTop: '1px solid var(--color-border)' }}>
          <button className="btn btn-ghost" onClick={onClose}>H\u1ee7y</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Đang ghi...' : '✅ Xác nhận'}
          </button>
        </div>
      </div>
    </div>
  );
}
