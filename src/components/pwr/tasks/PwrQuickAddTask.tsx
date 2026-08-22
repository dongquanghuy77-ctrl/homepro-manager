'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { PWR_CATEGORY } from '@/lib/pwr/constants';

interface Props {
  onCreated: () => void;
}

export default function PwrQuickAddTask({ onCreated }: Props) {
  const [title,    setTitle]    = useState('');
  const [category, setCategory] = useState('PRODUCTION');
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    try {
      await fetch('/api/pwr/tasks', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ title: title.trim(), category, status: 'INBOX', priority: 'MEDIUM' }),
      });
      setTitle('');
      onCreated();
    } catch {
      // silent fail — user can retry
    } finally {
      setLoading(false);
    }
  }

  return (
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
      >
        {Object.entries(PWR_CATEGORY).map(([k, v]) => (
          <option key={k} value={k}>{v.icon} {v.label}</option>
        ))}
      </select>
      <button type="submit" className="btn btn-primary" disabled={loading || !title.trim()}>
        <Plus size={16} />
      </button>
    </form>
  );
}
