'use client';

import { useState } from 'react';
import { Send } from 'lucide-react';
import { PWR_LOG_TYPE } from '@/lib/pwr/constants';

interface Props {
  taskId: number;
  onCreated: () => void;
}

export default function PwrWorkLogForm({ taskId, onCreated }: Props) {
  const [content,         setContent]         = useState('');
  const [logType,         setLogType]         = useState('NOTE');
  const [result,          setResult]          = useState('');
  const [issue,           setIssue]           = useState('');
  const [nextAction,      setNextAction]      = useState('');
  const [durationMinutes, setDurationMinutes] = useState('');
  const [showExtra,       setShowExtra]       = useState(false);
  const [loading,         setLoading]         = useState(false);
  const [error,           setError]           = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/pwr/tasks/' + taskId + '/logs', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          logType,
          content: content.trim(),
          result:  result      || null,
          issue:   issue       || null,
          nextAction: nextAction || null,
          durationMinutes: durationMinutes ? parseInt(durationMinutes) : null,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || 'Lỗi');
        return;
      }
      setContent('');
      setResult('');
      setIssue('');
      setNextAction('');
      setDurationMinutes('');
      setShowExtra(false);
      onCreated();
    } catch {
      setError('Không thể ghi log. Thử lại.');
    } finally {
      setLoading(false);
    }
  }

  const PRESETS = [
    { label: '15m', value: '15' },
    { label: '30m', value: '30' },
    { label: '1h',  value: '60' },
    { label: '2h',  value: '120' },
    { label: '3h',  value: '180' },
  ];

  function parseCustomInput(val: string): string {
    const h = val.match(/^(\d+(?:\.\d+)?)\s*h(?:ours?)?(?:\s*(\d+)\s*m?)?$/i);
    if (h) return String(Math.round(parseFloat(h[1]) * 60 + parseInt(h[2] || '0')));
    const m = val.match(/^(\d+)\s*m(?:in)?/i);
    if (m) return m[1];
    if (/^\d+$/.test(val)) return val;
    return val;
  }

  function displayDuration(): string {
    const mins = parseInt(durationMinutes);
    if (!mins || isNaN(mins)) return '';
    if (mins < 60) return mins + ' phút';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h + 'h' + (m > 0 ? m + 'm' : '');
  }

  const isPreset = PRESETS.some(p => p.value === durationMinutes);

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 8, fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif' }}>
      {error && (
        <div style={{ color: '#EF4444', fontSize: 12, padding: '4px 8px', background: 'rgba(239,68,68,0.1)', borderRadius: 4 }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <select
          className="filter-bar-select"
          value={logType}
          onChange={e => setLogType(e.target.value)}
          style={{ minWidth: 160 }}
        >
          {Object.entries(PWR_LOG_TYPE)
            .filter(([k]) => k !== 'SYSTEM')
            .map(([k, v]) => (
              <option key={k} value={k}>{(v as any).label}</option>
            ))}
        </select>

        {/* Smart time picker */}
        <div style={{ display:'flex', alignItems:'center', gap:4, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, padding:'4px 8px' }}>
          <span style={{ fontSize:11, color:'#64748b', marginRight:2, whiteSpace:'nowrap' }}>
            ⏱ Thời gian:
          </span>
          {PRESETS.map(p => (
            <button
              key={p.value}
              type="button"
              onClick={() => setDurationMinutes(durationMinutes === p.value ? '' : p.value)}
              style={{
                padding:'3px 9px', borderRadius:5, fontSize:12, fontWeight:600, cursor:'pointer', border:'none',
                background: durationMinutes === p.value ? 'rgba(59,130,246,0.8)' : 'rgba(255,255,255,0.07)',
                color:      durationMinutes === p.value ? '#fff'                  : '#94a3b8',
                transition: 'all 0.15s',
              }}
            >
              {p.label}
            </button>
          ))}
          <input
            type="text"
            placeholder="khác..."
            value={isPreset ? '' : durationMinutes}
            onChange={e => setDurationMinutes(e.target.value)}
            onBlur={e  => setDurationMinutes(parseCustomInput(e.target.value))}
            style={{ width:60, background:'transparent', border:'none', outline:'none', color:'#e2e8f0', fontSize:12, padding:'2px 4px' }}
          />
          {durationMinutes && (
            <span style={{ fontSize:11, color:'#3b82f6', fontWeight:700, whiteSpace:'nowrap', borderLeft:'1px solid rgba(255,255,255,0.1)', paddingLeft:8, marginLeft:2 }}>
              = {displayDuration()}
            </span>
          )}
          {durationMinutes && (
            <button type="button" onClick={() => setDurationMinutes('')}
              style={{ background:'none', border:'none', color:'#475569', cursor:'pointer', padding:'0 3px', fontSize:13, lineHeight:1 }}>
              ✕
            </button>
          )}
        </div>

        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => setShowExtra(v => !v)}
          style={{ whiteSpace: 'nowrap' }}
        >
          {showExtra ? '▲ Thu gọn' : '▼ Chi tiết'}
        </button>
      </div>

      <textarea
        className="form-input"
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder="Ghi chú công việc..."
        style={{ minHeight: 72, resize: 'vertical' }}
        required
      />

      {showExtra && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input className="form-input" value={result} onChange={e => setResult(e.target.value)} placeholder="Kết quả đạt được..." />
          <input className="form-input" value={issue} onChange={e => setIssue(e.target.value)} placeholder="Vấn đề gặp phải..." />
          <input className="form-input" value={nextAction} onChange={e => setNextAction(e.target.value)} placeholder="Việc cần làm tiếp theo..." />
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          <Send size={14} />
          {loading ? 'Đang lưu...' : 'Ghi lại'}
        </button>
      </div>
    </form>
  );
}
