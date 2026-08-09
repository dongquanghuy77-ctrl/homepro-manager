'use client';

import { useState } from 'react';
import { Pencil, Trash2, Plus, Search } from 'lucide-react';
import type { Task, TaskStatus, TaskPriority } from '@/db/schema';
import TaskForm from './TaskForm';
import { TASK_STATUS, TASK_PRIORITY, TASK_CATEGORIES, DEFAULT_ASSIGNEES } from '@/lib/constants';
import { toDateInputValue } from '@/lib/utils';
import ViewToggle, { type ViewMode } from '@/components/ui/ViewToggle';
import KanbanBoard from '@/components/kanban/KanbanBoard';
import GanttChart from '@/components/gantt/GanttChart';

interface TaskTableProps {
  projectId: number;
  initialTasks: Task[];
  projectStartDate?: string | null;
  projectDeadline?: string | null;
}

export default function TaskTable({ projectId, initialTasks, projectStartDate, projectDeadline }: TaskTableProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [showForm, setShowForm] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  const categories = TASK_CATEGORIES;

  const filtered = tasks.filter((t) => {
    if (filterStatus && t.status !== filterStatus) return false;
    if (filterPriority && t.priority !== filterPriority) return false;
    if (filterCategory && t.category !== filterCategory) return false;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  async function refresh() {
    try {
      const res = await fetch(`/api/tasks?project_id=${projectId}`);
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
    } catch {}
  }

  async function updateTaskField(taskId: number, field: string, value: any) {
    try {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;

      const updatedPayload: any = { ...task, [field]: value };

      if (field === 'status') {
        if (value === 'COMPLETED') updatedPayload.progress = 100;
        else if (value === 'NOT_STARTED') updatedPayload.progress = 0;
      } else if (field === 'progress') {
        const p = parseInt(value);
        updatedPayload.progress = p;
        if (p === 100) updatedPayload.status = 'COMPLETED';
        else if (p > 0 && (task.status === 'NOT_STARTED' || task.status === 'COMPLETED')) {
          updatedPayload.status = 'IN_PROGRESS';
        } else if (p === 0 && task.status === 'COMPLETED') {
          updatedPayload.status = 'NOT_STARTED';
        }
      }

      setTasks((prev) => prev.map((t) => (t.id === taskId ? updatedPayload : t)));

      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedPayload),
      });

      if (res.ok) {
        const serverData = await res.json();
        setTasks((prev) => prev.map((t) => (t.id === taskId ? serverData : t)));
      } else {
        refresh();
      }
    } catch {
      refresh();
    }
  }

  async function handleKanbanMove(taskId: number, newStatus: TaskStatus) {
    await updateTaskField(taskId, 'status', newStatus);
  }

  async function handleDelete(taskId: number) {
    if (!confirm('Xóa công việc này?')) return;
    try {
      await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch {}
  }

  function openCreate() { setEditTask(null); setShowForm(true); }
  function openEdit(task: Task) { setEditTask(task); setShowForm(true); }
  function closeForm() { setShowForm(false); setEditTask(null); }

  return (
    <div>
      {/* Top Bar: Filters + View Toggle */}
      <div className="filter-bar mb-6" style={{ flexWrap: 'wrap', gap: 8 }}>
        {/* Search */}
        <div style={{ flex: 1, position: 'relative', minWidth: 180 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
          <input
            id="task-search"
            className="filter-bar-select"
            style={{ paddingLeft: 30, width: '100%' }}
            placeholder="Tìm công việc..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Filters — only show in list mode */}
        {viewMode === 'list' && (
          <>
            <select
              id="filter-status"
              className="filter-bar-select"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">Tất cả trạng thái</option>
              {Object.entries(TASK_STATUS).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
            <select
              id="filter-priority"
              className="filter-bar-select"
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
            >
              <option value="">Tất cả ưu tiên</option>
              {Object.entries(TASK_PRIORITY).map(([k, v]) => (
                <option key={k} value={k}>{v.icon} {v.label}</option>
              ))}
            </select>
            <select
              id="filter-category"
              className="filter-bar-select"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option value="">Tất cả hạng mục</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </>
        )}

        {/* View Toggle */}
        <ViewToggle view={viewMode} onChange={setViewMode} />

        <button
          id="add-task-btn"
          className="btn btn-primary btn-sm"
          onClick={openCreate}
        >
          <Plus size={14} />
          Thêm công việc
        </button>
      </div>

      {/* ===== LIST VIEW ===== */}
      {viewMode === 'list' && (
        <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ minWidth: 200 }}>Công việc (Sửa)</th>
                  <th style={{ minWidth: 120 }}>Hạng mục (Chọn)</th>
                  <th style={{ minWidth: 110 }}>Phụ trách (Chọn)</th>
                  <th style={{ minWidth: 130 }}>Deadline (Chọn)</th>
                  <th style={{ minWidth: 120 }}>Ưu tiên (Chọn)</th>
                  <th style={{ minWidth: 140 }}>Trạng thái (Chọn)</th>
                  <th style={{ minWidth: 160 }}>Tiến độ % (Kéo)</th>
                  <th style={{ width: 80 }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      <div className="empty-state">
                        <div className="empty-state-icon">📋</div>
                        <div className="empty-state-text">Không có công việc nào</div>
                        <div className="empty-state-sub">Nhấn &quot;Thêm công việc&quot; để bắt đầu</div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((task) => {
                    const statusConfig = TASK_STATUS[task.status as TaskStatus] || TASK_STATUS.NOT_STARTED;
                    const priorityConfig = TASK_PRIORITY[task.priority as TaskPriority] || TASK_PRIORITY.MEDIUM;

                    return (
                      <tr key={task.id} id={`task-row-${task.id}`}>
                        {/* Tên công việc */}
                        <td>
                          <input
                            className="form-input"
                            style={{ padding: '4px 8px', fontSize: 13, fontWeight: 600, background: 'rgba(31,41,55,0.5)', border: '1px solid transparent' }}
                            value={task.title}
                            onChange={(e) => updateTaskField(task.id, 'title', e.target.value)}
                            onBlur={(e) => updateTaskField(task.id, 'title', e.target.value)}
                          />
                        </td>

                        {/* Hạng mục */}
                        <td>
                          <select
                            className="filter-bar-select"
                            style={{ padding: '4px 8px', fontSize: 12 }}
                            value={task.category || ''}
                            onChange={(e) => updateTaskField(task.id, 'category', e.target.value)}
                          >
                            <option value="">— Chọn —</option>
                            {categories.map((c) => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </td>

                        {/* Phụ trách */}
                        <td>
                          <select
                            className="filter-bar-select"
                            style={{ padding: '4px 8px', fontSize: 12 }}
                            value={task.assignee || ''}
                            onChange={(e) => updateTaskField(task.id, 'assignee', e.target.value)}
                          >
                            <option value="">— Chọn —</option>
                            {DEFAULT_ASSIGNEES.map((a) => (
                              <option key={a} value={a}>{a}</option>
                            ))}
                          </select>
                        </td>

                        {/* Deadline */}
                        <td>
                          <input
                            type="date"
                            className="filter-bar-select"
                            style={{ padding: '3px 6px', fontSize: 12, width: 125 }}
                            value={toDateInputValue(task.endDate)}
                            onChange={(e) => updateTaskField(task.id, 'endDate', e.target.value)}
                          />
                        </td>

                        {/* Ưu tiên */}
                        <td>
                          <select
                            className="filter-bar-select"
                            style={{ padding: '4px 8px', fontSize: 12, color: priorityConfig.color, fontWeight: 600 }}
                            value={task.priority}
                            onChange={(e) => updateTaskField(task.id, 'priority', e.target.value)}
                          >
                            {Object.entries(TASK_PRIORITY).map(([k, v]) => (
                              <option key={k} value={k} style={{ color: v.color, background: '#1F2937' }}>
                                {v.icon} {v.label}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Trạng thái */}
                        <td>
                          <select
                            className="filter-bar-select"
                            style={{
                              padding: '5px 10px',
                              fontSize: 12,
                              fontWeight: 600,
                              color: statusConfig.color,
                              background: statusConfig.bg,
                              border: `1px solid ${statusConfig.color}44`,
                              borderRadius: 8,
                              cursor: 'pointer',
                            }}
                            value={task.status}
                            onChange={(e) => updateTaskField(task.id, 'status', e.target.value)}
                          >
                            {Object.entries(TASK_STATUS).map(([k, v]) => (
                              <option key={k} value={k} style={{ background: '#1F2937', color: v.color }}>
                                {v.label}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Tiến độ % */}
                        <td>
                          <div className="flex items-center gap-2" style={{ width: '100%' }}>
                            <input
                              type="range"
                              className="form-range"
                              style={{ flex: 1, height: 6 }}
                              min={0} max={100} step={5}
                              value={task.progress}
                              onChange={(e) => updateTaskField(task.id, 'progress', parseInt(e.target.value))}
                            />
                            <span style={{
                              fontSize: 12,
                              fontWeight: 700,
                              color: task.progress === 100 ? '#10B981' : task.progress > 0 ? '#3B82F6' : '#94A3B8',
                              minWidth: 36,
                              textAlign: 'right',
                            }}>
                              {task.progress}%
                            </span>
                          </div>
                        </td>

                        {/* Thao tác */}
                        <td>
                          <div className="flex gap-2">
                            <button
                              className="btn btn-ghost btn-icon btn-sm"
                              onClick={() => openEdit(task)}
                              title="Chỉnh sửa chi tiết"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              className="btn btn-danger btn-icon btn-sm"
                              onClick={() => handleDelete(task.id)}
                              title="Xóa"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Stats row */}
          {tasks.length > 0 && (
            <div className="flex gap-4 mt-4" style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
              <span>Tổng: <strong style={{ color: 'var(--color-text)' }}>{tasks.length}</strong></span>
              <span>Hiển thị: <strong style={{ color: 'var(--color-text)' }}>{filtered.length}</strong></span>
            </div>
          )}
        </>
      )}

      {/* ===== KANBAN VIEW ===== */}
      {viewMode === 'kanban' && (
        <KanbanBoard
          tasks={filtered}
          onTaskUpdate={handleKanbanMove}
          onTaskEdit={openEdit}
        />
      )}

      {/* ===== GANTT VIEW ===== */}
      {viewMode === 'gantt' && (
        <GanttChart
          tasks={filtered}
          projectStartDate={projectStartDate}
          projectDeadline={projectDeadline}
        />
      )}

      {/* Task Form Modal */}
      {showForm && (
        <TaskForm
          projectId={projectId}
          task={editTask}
          onClose={closeForm}
          onSaved={refresh}
        />
      )}
    </div>
  );
}
