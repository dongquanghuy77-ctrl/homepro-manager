'use client';

import { useState, useEffect } from 'react';
import { Plus, Zap } from 'lucide-react';
import { PWR_CATEGORY } from '@/lib/pwr/constants';

interface Props {
  onCreated: () => void;
}

interface Suggestion {
  title: string;
  category: string;
  count: number;
}

export default function PwrQuickAddTask({ onCreated }: Props) {
  const [title,       setTitle]       = useState('');
  const [category,    setCategory]    = useState('PRODUCTION');
  const [loading,     setLoading]     = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  useEffect(() => {
    fetch('/api/pwr/tasks/suggestions')
      .then(res => res.json())
      .then(data => {
        if (data.suggestions) setSuggestions(data.suggestions);
      })
      .catch(() => {});
  }, []);

  async function handleSubmit(e?: React.FormEvent, overrideTitle?: string, overrideCat?: string) {
    if (e) e.preventDefault();
    const t = overrideTitle || title;
    const c = overrideCat || category;
    if (!t.trim()) return;
    
    setLoading(true);
    try {
      await fetch('/api/pwr/tasks', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ title: t.trim(), category: c, status: 'INBOX', priority: 'MEDIUM', projectRef: '[VẬN HÀNH] HỘP THƯ ĐẾN' }),
      });
      setTitle('');
      onCreated();
    } catch {
      // silent fail
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8 }}>
        <input
          className="form-input"
          style={{ flex: 1 }}
          placeholder="Thêm nhanh vào Hộp thư đến..."
          value={title}
          onChange={e => setTitle(e.target.value)}
          disabled={loading}
        />
        <select
          className="filter-bar-select"
          value={category}
          onChange={e => setCategory(e.target.value)}
          style={{ minWidth: 120 }}
          disabled={loading}
        >
          {Object.entries(PWR_CATEGORY).map(([k, v]) => (
            <option key={k} value={k}>{v.icon} {v.label}</option>
          ))}
        </select>
        <button type="submit" className="btn btn-primary" disabled={loading || !title.trim()}>
          <Plus size={16} />
        </button>
      </form>

      {suggestions.length > 0 && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', fontSize: 12 }}>
          <span style={{ color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Zap size={14} color="#F59E0B" /> Thường làm:
          </span>
          {suggestions.map((s, idx) => {
            const cat = PWR_CATEGORY[s.category as keyof typeof PWR_CATEGORY];
            return (
              <button
                key={idx}
                onClick={() => handleSubmit(undefined, s.title, s.category)}
                disabled={loading}
                style={{
                  background: 'var(--color-surface-2)', border: '1px solid var(--color-surface-3)',
                  padding: '4px 10px', borderRadius: 99, color: 'var(--color-text)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6, transition: 'background 0.2s'
                }}
                onMouseOver={e => e.currentTarget.style.background = 'var(--color-surface-3)'}
                onMouseOut={e => e.currentTarget.style.background = 'var(--color-surface-2)'}
              >
                <span style={{ fontSize: 10 }}>{cat?.icon}</span>
                {s.title}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
