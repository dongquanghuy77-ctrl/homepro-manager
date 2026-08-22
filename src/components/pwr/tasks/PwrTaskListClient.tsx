'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus } from 'lucide-react';
import type { PwrTask, PwrStatus } from '@/db/schema';
import { PWR_STATUS, PWR_CATEGORY, PWR_PRIORITY } from '@/lib/pwr/constants';
import { isReopen as checkReopen } from '@/lib/pwr/task-transitions';
import PwrTaskCard from './PwrTaskCard';
import PwrTaskForm from './PwrTaskForm';
import PwrQuickAddTask from './PwrQuickAddTask';

interface PwrTaskListClientProps {
  initialTasks: PwrTask[];
}

export default function PwrTaskListClient({ initialTasks }: PwrTaskListClientProps) {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const [tasks,          setTasks]          = useState<PwrTask[]>(initialTasks);
  const [showForm,       setShowForm]       = useState(false);
  const [editTask,       setEditTask]       = useState<PwrTask | null>(null);
  const [filterStatus,   setFilterStatus]   = useState(searchParams.get('status')   || '');
  const [filterCategory, setFilterCategory] = useState(searchParams.get('category') || '');
  const [filterPriority, setFilterPriority] = useState(searchParams.get('priority') || '');
  const [search,         setSearch]         = useState(searchParams.get('q')        || '');

  // Sync filter state → URL (debounced via useEffect)
  useEffect(() => {
    const params = new URLSearchParams();
    if (filterStatus)   params.set('status',   filterStatus);
    if (filterCategory) params.set('category', filterCategory);
    if (filterPriority) params.set('priority', filterPriority);
    if (search)         params.set('q',        search);
    const qs = params.toString();
    router.replace(qs ? `/pwr/tasks?${qs}` : '/pwr/tasks', { scroll: false });
  }, [filterStatus, filterCategory, filterPriority, search]);

  const filtered = tasks.filter(t => {
    if (filterStatus   && t.status   !== filterStatus)   return false;
    if (filterCategory && t.category !== filterCategory) return false;
    if (filterPriority && t.priority !== filterPriority) return false;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  async function refresh() {
    try {
      const res = await fetch('/api/pwr/tasks');
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks ?? []);
      }
    } catch { /* silent */ }
  }

  function openEdit(task: PwrTask) {
    setEditTask(task);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditTask(null);
  }

  async function handleDelete(id: number) {
    if (!confirm('Xóa công việc này?')) return;
    const res = await fetch(`/api/pwr/tasks/${id}`, { method: 'DELETE' });
    if (res.ok) setTasks(prev => prev.filter(t => t.id !== id));
  }

  async function handleStatusChange(task: PwrTask, newStatus: string) {
    // Transitions that require extra fields must go through form
    if (newStatus === 'WAITING' || newStatus === 'DEFERRED') { openEdit(task); return; }
    // REOPEN requires reason — open form
    if (checkReopen(task.status as PwrStatus, newStatus as PwrStatus)) { openEdit(task); return; }

    try {
      const res = await fetch(`/api/pwr/tasks/${task.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const updated = await res.json();
        setTasks(prev => prev.map(t => t.id === task.id ? updated : t));
      }
    } catch { /* silent */ }
  }

  // Summary counts (unfiltered)
  const inProgress = tasks.filter(t => t.status === 'IN_PROGRESS').length;
  const waiting    = tasks.filter(t => t.status === 'WAITING').length;
  const hasActiveFilter = filterStatus || filterCategory || filterPriority || search;

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Công việc cá nhân</h1>
          <p className="page-subtitle">Quản lý và theo dõi công việc hàng ngày</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => { setEditTask(null); setShowForm(true); }}
        >
          <Plus size={16} />
          Tạo công việc
        </button>
      </div>

      {/* Quick add */}
      <div style={{ marginBottom: 12 }}>
        <PwrQuickAddTask onCreated={refresh} />
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          className="form-input"
          placeholder="Tìm kiếm..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ minWidth: 180 }}
        />
        <select
          className="filter-bar-select"
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
        >
          <option value="">Tất cả trạng thái</option>
          {Object.entries(PWR_STATUS).map(([k, v]) => (
            <option key={k} value={k}>{v.icon} {v.label}</option>
          ))}
        </select>
        <select
          className="filter-bar-select"
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
        >
          <option value="">Tất cả danh mục</option>
          {Object.entries(PWR_CATEGORY).map(([k, v]) => (
            <option key={k} value={k}>{v.icon} {v.label}</option>
          ))}
        </select>
        <select
          className="filter-bar-select"
          value={filterPriority}
          onChange={e => setFilterPriority(e.target.value)}
        >
          <option value="">Tất cả ưu tiên</option>
          {Object.entries(PWR_PRIORITY).map(([k, v]) => (
            <option key={k} value={k}>{v.icon} {v.label}</option>
          ))}
        </select>
        {hasActiveFilter && (
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => { setFilterStatus(''); setFilterCategory(''); setFilterPriority(''); setSearch(''); }}
          >
            Xóa lọc
          </button>
        )}
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 16, fontSize: 13, color: 'var(--color-text-muted)' }}>
        <span>
          Kết quả: <strong style={{ color: 'var(--color-text)' }}>{filtered.length}</strong>
        </span>
        {!filterStatus && (
          <>
            <span>Đang làm: <strong style={{ color: '#F59E0B' }}>{inProgress}</strong></span>
            <span>Đang chờ: <strong style={{ color: '#8B5CF6' }}>{waiting}</strong></span>
          </>
        )}
      </div>

      {/* Task list */}
      {filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)' }}>
          {tasks.length === 0
            ? 'Chưa có công việc nào. Tạo công việc đầu tiên!'
            : 'Không tìm thấy công việc phù hợp.'
          }
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(task => (
            <PwrTaskCard
              key={task.id}
              task={task}
              onEdit={() => openEdit(task)}
              onDelete={() => handleDelete(task.id)}
              onStatusChange={newStatus => handleStatusChange(task, newStatus)}
            />
          ))}
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <PwrTaskForm
          task={editTask}
          onClose={closeForm}
          onSaved={refresh}
        />
      )}
    </div>
  );
}
