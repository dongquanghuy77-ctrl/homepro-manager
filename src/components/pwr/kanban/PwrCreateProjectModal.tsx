'use client';

import { useState } from 'react';
import { X, FolderPlus, Building2, Calendar, StickyNote, CheckSquare, Loader2, Palette } from 'lucide-react';

interface Props {
  onClose: () => void;
  onCreated: (projectName: string, taskCount: number) => void;
}

const COLOR_OPTIONS = [
  { value: 'BLUE',   label: 'Xanh dương', hex: '#3b82f6' },
  { value: 'ORANGE', label: 'Cam',        hex: '#f97316' },
  { value: 'GREEN',  label: 'Xanh lá',    hex: '#10b981' },
  { value: 'PURPLE', label: 'Tím',        hex: '#8b5cf6' },
  { value: 'RED',    label: 'Đỏ',         hex: '#ef4444' },
  { value: 'YELLOW', label: 'Vàng',       hex: '#f59e0b' },
];

export default function PwrCreateProjectModal({ onClose, onCreated }: Props) {
  const [name,            setName]            = useState('');
  const [customer,        setCustomer]        = useState('');
  const [deadline,        setDeadline]        = useState('');
  const [notes,           setNotes]           = useState('');
  const [color,           setColor]           = useState('BLUE');
  const [applyTemplate,   setApplyTemplate]   = useState(true);
  const [saving,          setSaving]          = useState(false);
  const [error,           setError]           = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError('Tên dự án không được để trống'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/pwr/projects', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), customer: customer.trim(), deadline, notes: notes.trim(), color, applyTemplate }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Lỗi tạo dự án'); return; }
      onCreated(name.trim(), data.createdTasks ?? 0);
    } catch { setError('Không thể kết nối server'); }
    finally { setSaving(false); }
  }

  const selectedColor = COLOR_OPTIONS.find(c => c.value === color)?.hex ?? '#3b82f6';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: '#0f172a', border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 16, padding: '28px 32px', width: '100%', maxWidth: 520,
        boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: `${selectedColor}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FolderPlus size={18} color={selectedColor} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 17, color: '#f1f5f9' }}>Tạo dự án mới</div>
            <div style={{ fontSize: 12, color: '#64748b' }}>Điền thông tin và chọn template</div>
          </div>
          <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#475569', cursor: 'pointer', padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Tên dự án */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Tên dự án *</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="VD: TAKASHIMAYA Q1 2026"
              autoFocus
              style={inputStyle}
            />
          </div>

          {/* Khách hàng */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}><Building2 size={13} /> Khách hàng</label>
            <input
              value={customer}
              onChange={e => setCustomer(e.target.value)}
              placeholder="Tên công ty hoặc cá nhân"
              style={inputStyle}
            />
          </div>

          {/* Deadline + Màu */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}><Calendar size={13} /> Deadline bàn giao</label>
              <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}><Palette size={13} /> Màu folder</label>
              <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                {COLOR_OPTIONS.map(c => (
                  <button key={c.value} type="button" title={c.label}
                    onClick={() => setColor(c.value)}
                    style={{
                      width: 26, height: 26, borderRadius: '50%', background: c.hex,
                      border: color === c.value ? `3px solid #fff` : '2px solid transparent',
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Ghi chú */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}><StickyNote size={13} /> Ghi chú</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Yêu cầu đặc biệt, lưu ý..."
              rows={2}
              style={{ ...inputStyle, resize: 'none', lineHeight: 1.5 }}
            />
          </div>

          {/* Template checkbox */}
          <div style={{
            background: applyTemplate ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${applyTemplate ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.08)'}`,
            borderRadius: 10, padding: '14px 16px', marginBottom: 20,
            cursor: 'pointer', transition: 'all 0.2s',
          }} onClick={() => setApplyTemplate(p => !p)}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{
                width: 20, height: 20, borderRadius: 5, marginTop: 1, flexShrink: 0,
                background: applyTemplate ? '#6366f1' : 'transparent',
                border: `2px solid ${applyTemplate ? '#6366f1' : '#475569'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {applyTemplate && <CheckSquare size={14} color="#fff" />}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13.5, color: applyTemplate ? '#a5b4fc' : '#94a3b8' }}>
                  Tự động tạo 41 task chuẩn cho dự án nội thất
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 3, lineHeight: 1.5 }}>
                  6 giai đoạn: Tiếp nhận → Thiết kế → Chuẩn bị SX → Sản xuất → Bàn giao → Kết sổ
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div style={{ color: '#ef4444', fontSize: 13, marginBottom: 12, background: 'rgba(239,68,68,0.1)', padding: '8px 12px', borderRadius: 8 }}>
              ⚠ {error}
            </div>
          )}

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={{
              padding: '9px 20px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
              background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: 14,
            }}>
              Huỷ
            </button>
            <button type="submit" disabled={saving || !name.trim()} style={{
              padding: '9px 20px', borderRadius: 8, border: 'none', cursor: saving || !name.trim() ? 'default' : 'pointer',
              background: saving || !name.trim() ? '#334155' : '#6366f1',
              color: saving || !name.trim() ? '#64748b' : '#fff',
              fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8,
              transition: 'all 0.2s',
            }}>
              {saving ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <FolderPlus size={15} />}
              {saving ? 'Đang tạo...' : `Tạo dự án${applyTemplate ? ' + 41 task' : ''}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Style helpers ────────────────────────────────────────────────────────────
const labelStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 5,
  fontSize: 12, color: '#94a3b8', fontWeight: 600,
  marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5,
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: 8,
  border: '1px solid rgba(99,102,241,0.25)',
  background: 'rgba(255,255,255,0.04)', color: '#e2e8f0',
  fontSize: 13.5, outline: 'none', boxSizing: 'border-box',
};
