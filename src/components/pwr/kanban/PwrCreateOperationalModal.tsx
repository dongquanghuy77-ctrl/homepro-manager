'use client';
import { useState, useEffect } from 'react';
import { X, Wrench, Users, FileText, Package, Plus, RefreshCw, Shield, Cpu } from 'lucide-react';

interface Props {
  onClose: () => void;
  onCreated: (title: string) => void;
}

// Smart auto-detect category from title keywords
function detectCategory(title: string): string {
  const t = title.toLowerCase();
  if (/máy|cnc|cưa|bào|chà|sơn|bảo dưỡng|hiệu chỉnh|sửa|thiết bị|dầu|lưỡi/.test(t)) return 'EQUIPMENT';
  if (/ca làm|nhân viên|thợ|chấm công|lương|đào tạo|nghỉ|phạt|tuyển|ký hợp đồng/.test(t)) return 'PERSONNEL';
  if (/kho|vật tư|tồn|nhập|xuất|kiểm kê|đặt mua|mdf|gỗ|keo|sơn vật tư/.test(t)) return 'MATERIAL';
  if (/vệ sinh|pccc|an toàn|họp|hành chính|giấy phép|điện|nước|văn phòng/.test(t)) return 'ADMIN';
  return 'OTHER';
}

const CAT_OPTIONS = [
  { value: 'EQUIPMENT', label: '⚙️ Máy móc & Thiết bị', color: '#8b5cf6' },
  { value: 'PERSONNEL', label: '👷 Nhân sự & Ca làm',   color: '#ec4899' },
  { value: 'MATERIAL',  label: '📦 Kho & Vật tư',       color: '#f59e0b' },
  { value: 'ADMIN',     label: '📋 Hành chính & An toàn', color: '#64748b' },
  { value: 'OTHER',     label: '🔧 Khác',               color: '#94a3b8' },
];

const PRIORITY_OPTIONS = [
  { value: 'CRITICAL', label: '🔴 Khẩn cấp',   color: '#ef4444' },
  { value: 'HIGH',     label: '🟠 Cao',         color: '#f97316' },
  { value: 'MEDIUM',   label: '🟡 Trung bình',  color: '#f59e0b' },
  { value: 'LOW',      label: '⚪ Thấp',         color: '#64748b' },
];

const FREQ_OPTIONS = [
  { value: 'DAILY',   label: 'Hàng ngày'  },
  { value: 'WEEKLY',  label: 'Hàng tuần'  },
  { value: 'MONTHLY', label: 'Hàng tháng' },
];

export default function PwrCreateOperationalModal({ onClose, onCreated }: Props) {
  const [title,     setTitle]     = useState('');
  const [category,  setCategory]  = useState('EQUIPMENT');
  const [priority,  setPriority]  = useState('MEDIUM');
  const [dueDate,   setDueDate]   = useState('');
  const [desc,      setDesc]      = useState('');
  const [isGate,    setIsGate]    = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState('WEEKLY');
  const [loading,   setLoading]   = useState(false);
  const [autoDetect, setAutoDetect] = useState(false);

  // Smart auto-detection when user types title
  useEffect(() => {
    if (title.length > 4) {
      const detected = detectCategory(title);
      if (detected !== 'OTHER') {
        setCategory(detected);
        setAutoDetect(true);
        const t = setTimeout(() => setAutoDetect(false), 2000);
        return () => clearTimeout(t);
      }
    }
  }, [title]);

  async function handleSubmit() {
    if (!title.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/pwr/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title:    title.trim(),
          category,
          priority,
          status:   'TODO',
          dueDate:  dueDate || null,
          description: [
            desc || '',
            isGate      ? '[GATE: Task này là điều kiện tiên quyết cho dự án]' : '',
            isRecurring ? `[RECURRING: ${frequency}]` : '',
          ].filter(Boolean).join('\n') || null,
          taskType: 'OPERATIONAL_TASK',
          sourceType: 'MANUAL',
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      onCreated(title.trim());
    } catch (e: any) {
      alert('Lỗi: ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  const FONT = '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif';
  const selCat = CAT_OPTIONS.find(c => c.value === category);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9000,
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: 'linear-gradient(145deg,#1a2233,#111827)',
        border: '1px solid rgba(249,115,22,0.3)',
        borderRadius: 18, padding: '28px 32px', width: 520, maxWidth: '95vw',
        fontFamily: FONT, color: '#f1f5f9',
        boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(249,115,22,0.1)',
        position: 'relative',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: 'rgba(249,115,22,0.15)', border: '1px solid rgba(249,115,22,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Cpu size={20} color="#f97316" />
          </div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: '#f97316' }}>Tạo việc Vận Hành Nội Bộ</div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Sẽ xuất hiện trong mảng Vận Hành, không thuộc dự án</div>
          </div>
          <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#475569' }}>
            <X size={20} />
          </button>
        </div>

        {/* Title */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>
            TÊN CÔNG VIỆC *
          </label>
          <input
            autoFocus
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder="VD: Bảo dưỡng máy CNC định kỳ thứ 6..."
            style={{
              width: '100%', padding: '11px 14px',
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 9, color: '#f1f5f9', fontSize: 14,
              outline: 'none', boxSizing: 'border-box',
            }}
          />
          {autoDetect && (
            <div style={{ marginTop: 6, fontSize: 11, color: '#f97316', display: 'flex', alignItems: 'center', gap: 4 }}>
              <RefreshCw size={10} /> Tự phát hiện danh mục: <strong>{selCat?.label}</strong>
            </div>
          )}
        </div>

        {/* Category + Priority row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>MẢNG VẬN HÀNH</label>
            <select
              value={category} onChange={e => setCategory(e.target.value)}
              style={{
                width: '100%', padding: '10px 12px',
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 9, color: '#f1f5f9', fontSize: 13, outline: 'none',
              }}
            >
              {CAT_OPTIONS.map(c => (
                <option key={c.value} value={c.value} style={{ background: '#1a2233' }}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>ĐỘ ƯU TIÊN</label>
            <select
              value={priority} onChange={e => setPriority(e.target.value)}
              style={{
                width: '100%', padding: '10px 12px',
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 9, color: '#f1f5f9', fontSize: 13, outline: 'none',
              }}
            >
              {PRIORITY_OPTIONS.map(p => (
                <option key={p.value} value={p.value} style={{ background: '#1a2233' }}>{p.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Due date */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>
            HẠN THỰC HIỆN
          </label>
          <input
            type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
            style={{
              width: '100%', padding: '10px 12px',
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 9, color: '#f1f5f9', fontSize: 13, outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Description */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>
            GHI CHÚ / SOP
          </label>
          <textarea
            value={desc} onChange={e => setDesc(e.target.value)} rows={2}
            placeholder="Quy trình thực hiện, vật dụng cần chuẩn bị..."
            style={{
              width: '100%', padding: '10px 12px', resize: 'vertical',
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 9, color: '#f1f5f9', fontSize: 13, outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Smart options */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
          {/* Gate toggle */}
          <button
            onClick={() => setIsGate(v => !v)}
            style={{
              flex: 1, padding: '10px', borderRadius: 9, cursor: 'pointer',
              border: `1px solid ${isGate ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.1)'}`,
              background: isGate ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.03)',
              color: isGate ? '#ef4444' : '#64748b',
              display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600,
              transition: 'all 0.2s',
            }}
          >
            <Shield size={13} /> {isGate ? '🔒 Là Gate (chặn dự án)' : 'Là Gate?'}
          </button>

          {/* Recurring toggle */}
          <button
            onClick={() => setIsRecurring(v => !v)}
            style={{
              flex: 1, padding: '10px', borderRadius: 9, cursor: 'pointer',
              border: `1px solid ${isRecurring ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.1)'}`,
              background: isRecurring ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.03)',
              color: isRecurring ? '#a5b4fc' : '#64748b',
              display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600,
              transition: 'all 0.2s',
            }}
          >
            <RefreshCw size={13} /> {isRecurring ? 'Lặp lại: ' + FREQ_OPTIONS.find(f => f.value === frequency)?.label : 'Lặp lại?'}
          </button>
        </div>

        {/* Frequency selector (if recurring) */}
        {isRecurring && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {FREQ_OPTIONS.map(f => (
              <button
                key={f.value}
                onClick={() => setFrequency(f.value)}
                style={{
                  flex: 1, padding: '8px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                  border: `1px solid ${frequency === f.value ? 'rgba(99,102,241,0.6)' : 'rgba(255,255,255,0.08)'}`,
                  background: frequency === f.value ? 'rgba(99,102,241,0.15)' : 'transparent',
                  color: frequency === f.value ? '#a5b4fc' : '#64748b',
                  transition: 'all 0.15s',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}

        {/* Gate info */}
        {isGate && (
          <div style={{
            marginBottom: 16, padding: '10px 14px', borderRadius: 8,
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
            fontSize: 12, color: '#fca5a5',
          }}>
            🔒 <strong>Gate task</strong> — Khi task này DONE, nó sẽ mở khoá các task dự án phụ thuộc vào nó.
            Sau khi tạo, vào detail task để thiết lập liên kết với task dự án cụ thể.
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: '12px', borderRadius: 9, cursor: 'pointer',
              border: '1px solid rgba(255,255,255,0.1)', background: 'transparent',
              color: '#64748b', fontSize: 14, fontWeight: 600,
            }}
          >
            Hủy
          </button>
          <button
            onClick={handleSubmit} disabled={!title.trim() || loading}
            style={{
              flex: 2, padding: '12px', borderRadius: 9, cursor: 'pointer',
              background: title.trim() && !loading
                ? 'linear-gradient(135deg,#f97316,#ea580c)'
                : 'rgba(249,115,22,0.3)',
              border: 'none', color: '#fff', fontSize: 14, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'all 0.2s',
            }}
          >
            <Plus size={15} />
            {loading ? 'Đang tạo...' : `Tạo việc Vận Hành ${isGate ? '(Gate)' : ''} ${isRecurring ? '↻' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}
