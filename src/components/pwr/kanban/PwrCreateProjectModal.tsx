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
  const [name,         setName]         = useState('');
  const [customer,     setCustomer]     = useState('');
  const [deadline,     setDeadline]     = useState('');
  const [notes,        setNotes]        = useState('');
  const [color,        setColor]        = useState('BLUE');
  const [templateType, setTemplateType] = useState<'NONE'|'LIGHT'|'STANDARD'|'FULL'>('STANDARD');
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError('Tên dự án không được để trống'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/pwr/projects', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(), customer: customer.trim(), deadline,
          notes: notes.trim(), color,
          templateType: templateType === 'NONE' ? null : templateType,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Lỗi tạo dự án'); return; }
      onCreated(name.trim(), data.createdTasks ?? 0);
    } catch { setError('Không thể kết nối server'); }
    finally { setSaving(false); }
  }

  const selectedColor = COLOR_OPTIONS.find(c => c.value === color)?.hex ?? '#3b82f6';

  const TEMPLATE_OPTIONS: { value: 'NONE'|'LIGHT'|'STANDARD'|'FULL'; label: string; tasks: string; desc: string; color: string }[] = [
    { value:'NONE',     label:'Không dùng template', tasks:'0 task',  desc:'Tự tạo task thủ công',                         color:'#475569' },
    { value:'LIGHT',    label:'Light — Dự án nhỏ',   tasks:'15 task', desc:'Phòng ngủ, bếp, WC · < 50 triệu',             color:'#10b981' },
    { value:'STANDARD', label:'Standard — Dự án vừa',tasks:'28 task', desc:'Căn hộ, văn phòng nhỏ · 50–200 triệu',        color:'#3b82f6' },
    { value:'FULL',     label:'Full — Dự án lớn',    tasks:'41 task', desc:'Showroom, TAKASHIMAYA, công trình · > 200 triệu', color:'#8b5cf6' },
  ];

  const taskCount = { NONE:0, LIGHT:15, STANDARD:28, FULL:41 }[templateType];

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: '#0f172a', border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 16, padding: '28px 32px', width: '100%', maxWidth: 540,
        boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: `${selectedColor}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FolderPlus size={18} color={selectedColor} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 17, color: '#f1f5f9' }}>Tạo dự án mới</div>
            <div style={{ fontSize: 12, color: '#64748b' }}>Điền thông tin và chọn template phù hợp</div>
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

          {/* Template selector — 4 options */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}><CheckSquare size={13} /> Template task tự động</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {TEMPLATE_OPTIONS.map(opt => {
                const isSelected = templateType === opt.value;
                return (
                  <div
                    key={opt.value}
                    onClick={() => setTemplateType(opt.value)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 14px', borderRadius: 9, cursor: 'pointer',
                      background: isSelected ? `${opt.color}12` : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${isSelected ? `${opt.color}40` : 'rgba(255,255,255,0.06)'}`,
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{
                      width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                      background: isSelected ? opt.color : 'transparent',
                      border: `2px solid ${isSelected ? opt.color : '#475569'}`,
                    }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: isSelected ? opt.color : '#94a3b8' }}>
                        {opt.label}
                        <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, color: isSelected ? opt.color : '#475569',
                          background: isSelected ? `${opt.color}18` : 'rgba(255,255,255,0.04)',
                          padding: '1px 7px', borderRadius: 20 }}>
                          {opt.tasks}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>{opt.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {error && (
            <div style={{ color: '#ef4444', fontSize: 13, marginBottom: 12, background: 'rgba(239,68,68,0.1)', padding: '8px 12px', borderRadius: 8 }}>
              âš  {error}
            </div>
          )}

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={{
              padding: '9px 20px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
              background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: 14,
            }}>
              Huá»·
            </button>
            <button type="submit" disabled={saving || !name.trim()} style={{
              padding: '9px 20px', borderRadius: 8, border: 'none', cursor: saving || !name.trim() ? 'default' : 'pointer',
              background: saving || !name.trim() ? '#334155' : '#6366f1',
              color: saving || !name.trim() ? '#64748b' : '#fff',
              fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8,
              transition: 'all 0.2s',
            }}>
              {saving ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <FolderPlus size={15} />}
              {saving ? 'Đang tạo...' : taskCount > 0 ? `Tạo dự án + ${taskCount} task` : 'Tạo dự án'}
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
  fontSize: 13.5, outline: 'none', boxSizing: 'border-box' as const,
};

