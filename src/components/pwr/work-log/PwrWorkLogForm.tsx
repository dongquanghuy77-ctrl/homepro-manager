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
      const res = await fetch(`/api/pwr/tasks/${taskId}/logs`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
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

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {error && (
        <div style={{ color: '#EF4444', fontSize: 12, padding: '4px 8px', background: 'rgba(239,68,68,0.1)', borderRadius: 4 }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <select
          className="filter-bar-select"
          value={logType}
          onChange={e => setLogType(e.target.value)}
          style={{ minWidth: 160 }}
        >
          {Object.entries(PWR_LOG_TYPE)
            .filter(([k]) => k !== 'SYSTEM')
            .map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
        </select>
        <input
          type="number"
          className="form-input"
          placeholder="Thời gian (phút)"
          value={durationMinutes}
          onChange={e => setDurationMinutes(e.target.value)}
          style={{ width: 140 }}
          min={1}
        />
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
        <button type="submit" className="btn btn-primary" disabled={loading || !content.trim()}>
          <Send size={14} />
          {loading ? 'Đang lưu...' : 'Ghi lại'}
        </button>
      </div>
    </form>
  );
}
