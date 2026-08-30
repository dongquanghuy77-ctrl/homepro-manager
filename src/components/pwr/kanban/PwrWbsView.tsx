'use client';

import { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';
import type { PwrTask, PwrStatus, PwrPriority } from '@/db/schema';
import {
  ChevronRight, ChevronDown, FolderOpen, FolderClosed,
  CheckCircle2, Clock, AlertCircle, PlayCircle, Loader2,
  Lock, ArrowRight, Zap, Package, Wrench, Users, ShoppingCart,
  Briefcase, FileText, AlertTriangle, MoreHorizontal, FolderPlus,
  Shield, Check, AlertOctagon, Archive, Trash2,
} from 'lucide-react';
import { PWR_PRIORITY, PWR_STATUS } from '@/lib/pwr/constants';
import Link from 'next/link';
import PwrCreateProjectModal     from './PwrCreateProjectModal';
import PwrVanHanhSection         from './PwrVanHanhSection';
import PwrCreateOperationalModal from './PwrCreateOperationalModal';

interface Props { tasks: PwrTask[]; onRefresh?: () => void }

// ─── Category Design System (Linear / Jira inspired) ─────────────────────────
const CAT_STYLE: Record<string, { label: string; color: string; bg: string; Icon: React.ElementType }> = {
  PRODUCTION: { label: 'Sản xuất',   color: '#3b82f6', bg: 'rgba(59,130,246,0.12)',  Icon: Zap },
  MATERIAL:   { label: 'Vật tư',     color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  Icon: Package },
  EQUIPMENT:  { label: 'Máy móc',    color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)',  Icon: Wrench },
  PERSONNEL:  { label: 'Nhân sự',    color: '#ec4899', bg: 'rgba(236,72,153,0.12)',  Icon: Users },
  ORDER:      { label: 'Đơn hàng',   color: '#10b981', bg: 'rgba(16,185,129,0.12)',  Icon: ShoppingCart },
  PROJECT:    { label: 'Dự án',      color: '#6366f1', bg: 'rgba(99,102,241,0.12)',  Icon: Briefcase },
  ADMIN:      { label: 'Hành chính', color: 'var(--color-text-muted)', bg: 'rgba(100,116,139,0.12)', Icon: FileText },
  INCIDENT:   { label: 'Phát sinh',  color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   Icon: AlertTriangle },
  OTHER:      { label: 'Khác',       color: 'var(--color-text-secondary)', bg: 'rgba(148,163,184,0.12)', Icon: MoreHorizontal },
};

// ─── Status icon map ──────────────────────────────────────────────────────────
function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'DONE':        return <CheckCircle2 size={13} color="#10b981" />;
    case 'IN_PROGRESS': return <Loader2     size={13} color="#3b82f6" style={{ animation: 'spin 1s linear infinite' }} />;
    case 'WAITING':     return <Clock       size={13} color="#f59e0b" />;
    case 'TODO':        return <PlayCircle  size={13} color="#8b5cf6" />;
    case 'INBOX':       return <AlertCircle size={13} color="#ef4444" />;
    default:            return <CheckCircle2 size={13} color="#64748b" />;
  }
}

export default function PwrWbsView({ tasks, onRefresh }: Props) {
  const [localTasks,         setLocalTasks]         = useState<PwrTask[]>(tasks);
  const [expandedProjects,   setExpandedProjects]   = useState<Record<string, boolean>>({});
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [blockedMap, setBlockedMap] = useState<Record<number, string[]>>({});
  const [checklistMap, setChecklistMap] = useState<Record<number, { total: number; done: number }>>({});
  const [showModal,    setShowModal]    = useState(false);
  const [showOpModal,  setShowOpModal]  = useState(false);
  const [toast, setToast]              = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);
  const [pendingIds,   setPendingIds]   = useState<Set<number>>(new Set());

  const [theme, setTheme] = useState<'dark'|'light'>('dark');
  useEffect(() => {
    const t = localStorage.getItem('pwr-theme') || 'dark';
    setTheme(t as 'dark'|'light');
    document.documentElement.setAttribute('data-theme', t);
  }, []);
  const toggleTheme = () => {
    const n = theme === 'dark' ? 'light' : 'dark';
    setTheme(n);
    localStorage.setItem('pwr-theme', n);
    document.documentElement.setAttribute('data-theme', n);
  };


  // Sync localTasks when parent refreshes tasks
  useEffect(() => { setLocalTasks(tasks); }, [tasks]);

  const toggleProject  = (p: string) => setExpandedProjects(prev => ({ ...prev, [p]: !(prev[p] ?? true) }));
  const toggleCategory = (p: string, c: string) => {
    const k = `${p}||${c}`;
    setExpandedCategories(prev => ({ ...prev, [k]: !(prev[k] ?? true) }));
  };

  // ── Sprint B: Checklist warning modal state ─────────────────────────────────
  const [warnTask, setWarnTask] = useState<PwrTask | null>(null);

  // ── Sprint A+B: Quick toggle DONE / reopen ───────────────────────────────────
  async function executeToggleDone(task: PwrTask) {
    const newStatus = task.status === 'DONE' ? 'TODO' : 'DONE';

    // Optimistic update
    setPendingIds(prev => new Set([...prev, task.id]));
    setLocalTasks(prev => prev.map(t =>
      t.id === task.id ? { ...t, status: newStatus as any, completedAt: newStatus === 'DONE' ? new Date() : null } : t
    ));

    try {
      const res = await fetch(`/api/pwr/tasks/${task.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        setLocalTasks(prev => prev.map(t => t.id === task.id ? task : t));
        setToast({ message: 'Lỗi cập nhật trạng thái — thử lại sau', type: 'error' });
      } else {
        const updated = await res.json();
        setLocalTasks(prev => prev.map(t => t.id === task.id ? updated : t));
        setToast({ message: newStatus === 'DONE' ? `Hoàn thành: ${task.title.substring(0, 40)}` : `Mở lại: ${task.title.substring(0, 40)}`, type: 'success' });
      }
    } catch {
      setLocalTasks(prev => prev.map(t => t.id === task.id ? task : t));
      setToast({ message: 'Lỗi kết nối — kiểm tra mạng', type: 'error' });
    } finally {
      setTimeout(() => {
        setPendingIds(prev => { const s = new Set(prev); s.delete(task.id); return s; });
        setTimeout(() => setToast(null), 3000);
      }, 400);
    }
  }

  async function handleToggleDone(e: React.MouseEvent, task: PwrTask) {
    e.preventDefault();
    e.stopPropagation();
    if (pendingIds.has(task.id)) return; // debounce

    // Sprint B — Gate 1: blocked task cannot be marked DONE
    const blockers = blockedMap[task.id];
    if (task.status !== 'DONE' && blockers && blockers.length > 0) {
      setToast({ message: `Chưa thể hoàn thành. Bạn cần làm xong: ${blockers.join(', ')}`, type: 'warning' });
      setTimeout(() => setToast(null), 4000);
      return;
    }

    // Sprint B — Gate 2: checklist incomplete → show warning modal
    const cl = checklistMap[task.id];
    if (task.status !== 'DONE' && cl && cl.total > 0 && cl.done < cl.total) {
      setWarnTask(task);
      return;
    }

    await executeToggleDone(task);
  }

  // Batch fetch: blocker status + checklist counts
  useEffect(() => {
    if (!tasks.length) return;
    const nonDone = tasks.filter(t => !['DONE','CANCELLED'].includes(t.status));

    // 1. Blocked status (with names)
    Promise.all(
      nonDone.map(t =>
        fetch(`/api/pwr/tasks/${t.id}/dependencies`)
          .then(r => r.json())
          .then(d => {
            const blockers = (d.blockedBy || [])
              .filter((b: any) => !['DONE', 'CANCELLED'].includes(b.task.status))
              .map((b: any) => b.task.title);
            return { id: t.id, blockers };
          })
          .catch(() => ({ id: t.id, blockers: [] }))
      )
    ).then(res => {
      const bMap: Record<number, string[]> = {};
      res.forEach(r => {
        if (r.blockers.length > 0) bMap[r.id] = r.blockers;
      });
      setBlockedMap(bMap);
    });

    // 2. Checklist counts (all tasks, not just non-done)
    Promise.all(
      tasks.map(t =>
        fetch(`/api/pwr/tasks/${t.id}/checklists`)
          .then(r => r.json())
          .then((items: { isCompleted: boolean }[]) => ({
            id: t.id,
            total: items.length,
            done:  items.filter(i => i.isCompleted).length,
          }))
          .catch(() => ({ id: t.id, total: 0, done: 0 }))
      )
    ).then(res => {
      const map: Record<number, { total: number; done: number }> = {};
      res.forEach(r => { map[r.id] = { total: r.total, done: r.done }; });
      setChecklistMap(map);
    });
  }, [tasks]);

  // ── Split tasks: PROJECT_TASK vs OPERATIONAL_TASK ──────────────────────────
  const projTasks = localTasks.filter(t => (t as any).taskType !== 'OPERATIONAL_TASK' && t.projectRef);
  const opTasks   = localTasks.filter(t => (t as any).taskType === 'OPERATIONAL_TASK' || !t.projectRef);

  // Group project tasks: Project → Category
  const projectsMap: Record<string, PwrTask[]> = {};
  projTasks.forEach(t => {
    const p = t.projectRef?.trim() || '[NỘI BỘ]';
    if (!projectsMap[p]) projectsMap[p] = [];
    projectsMap[p].push(t);
  });

  // ── Gate Health per project ─────────────────────────────────────────────
  // Based on overdue % — meaningful even without dependency data
  function getGateHealth(pTasks: PwrTask[]): { status: 'GREEN'|'YELLOW'|'RED'; detail: string } {
    const active  = pTasks.filter(t => !['DONE','CANCELLED'].includes(t.status));
    const overdue = active.filter(t => t.dueDate && t.dueDate < today);
    const pct     = active.length > 0 ? Math.round((overdue.length / active.length) * 100) : 0;
    if (overdue.length >= 3 || pct >= 30) return { status: 'RED',    detail: `${overdue.length} task quá hạn (${pct}%)` };
    if (overdue.length >= 1)              return { status: 'YELLOW', detail: `${overdue.length} task quá hạn` };
    return { status: 'GREEN', detail: 'Đúng tiến độ' };
  }


  const handleDeleteProject = async (projectId: number, projectName: string) => {
    const confirmCode = window.prompt(`CẢNH BÁO: Bạn chuẩn bị XÓA TOÀN BỘ DỰ ÁN "${projectName}".\nViệc này sẽ xóa toàn bộ Task và hoàn trả số lượng vật tư đang giữ chỗ trong kho.\nNhập chữ "XOA" để xác nhận:`);
    if (confirmCode !== 'XOA') {
      if (confirmCode !== null) alert('Nhập sai từ khóa xác nhận. Hủy xóa.');
      return;
    }
    
    try {
      const res = await fetch(`/api/pwr/projects/${projectId}?action=hard_delete&name=${encodeURIComponent(projectName)}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setToast({ message: `Đã xóa dự án và hoàn trả vật tư thành công!`, type: 'success' });
      setTimeout(() => setToast(null), 3000);
      onRefresh?.();
    } catch (e: any) {
      alert("Lỗi khi xóa: " + e.message);
    }
  };

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div style={{ padding: '8px 24px 60px', color: 'var(--color-text)', fontFamily: 'var(--font-family, -apple-system, sans-serif)' }}>

      {/* --- Checklist Warning Modal --- */}
      {warnTask && (() => {
        const cl = checklistMap[warnTask.id];
        return (
          <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: 'var(--color-surface)', border: '1px solid rgba(251,146,60,0.4)', borderRadius: 14, padding: '28px 32px', maxWidth: 420, width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <span style={{ fontSize: 28 }}>⚠️</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--color-text)' }}>Checklist chưa hoàn thành</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 3 }}>Còn {cl ? cl.total - cl.done : '?'} việc con chưa xong</div>
                </div>
              </div>
              <div style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: 20, lineHeight: 1.6 }}>
                Task <strong style={{ color: 'var(--color-text)' }}>"{warnTask.title.substring(0, 50)}"</strong> có{' '}
                <strong style={{ color: '#fb923c' }}>{cl ? cl.done : 0}/{cl ? cl.total : 0}</strong> checklist hoàn thành.<br />
                Bạn có chắc muốn đánh dấu task này là <strong style={{ color: '#10b981' }}>Hoàn thành</strong>?
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setWarnTask(null)}
                  style={{ padding: '9px 18px', borderRadius: 8, background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                >
                  Hủy
                </button>
                <button
                  onClick={async () => { const t = warnTask; setWarnTask(null); await executeToggleDone(t); }}
                  style={{ padding: '9px 18px', borderRadius: 8, background: '#10b981', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}
                >
                  ✓ Vẫn đánh dấu xong
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* --- Modals --- */}
      {showModal && (
        <PwrCreateProjectModal
          onClose={() => setShowModal(false)}
          onCreated={(name, taskCount) => {
            setShowModal(false);
            const msg = taskCount > 0
              ? `Đã tạo dự án "${name}" với ${taskCount} task`
              : `Đã tạo dự án "${name}"`;
            setToast({ message: msg, type: 'success' });
            setTimeout(() => setToast(null), 4000);
            onRefresh?.();
          }}
        />
      )}
      {showOpModal && (
        <PwrCreateOperationalModal
          onClose={() => setShowOpModal(false)}
          onCreated={(title) => {
            setShowOpModal(false);
            setToast({ message: `Đã tạo việc vận hành: "${title}"`, type: 'success' });
            setTimeout(() => setToast(null), 4000);
            onRefresh?.();
          }}
        />
      )}

      {/* --- Theme Toggle & Global Toolbar --- */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
          {Object.keys(projectsMap).length} dự án · {projTasks.length} task
          {opTasks.length > 0 && <span style={{ color: '#f97316', marginLeft: 8 }}>· {opTasks.length} việc vận hành</span>}
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={toggleTheme} style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
            background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8,
            color: 'var(--color-text)', cursor: 'pointer', fontSize: 13, fontWeight: 600
          }}>
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
            {theme === 'dark' ? 'Giao diện Sáng' : 'Giao diện Tối'}
          </button>
          
          <button
            onClick={() => setShowModal(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 8,
              border: 'none', background: '#3b82f6', color: '#fff',
              cursor: 'pointer', fontSize: 13, fontWeight: 600
            }}
          >
            <FolderPlus size={16} /> + Tạo Dự Án Mới
          </button>
          <button
            onClick={() => setShowOpModal(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 8,
              border: '1px solid rgba(249,115,22,0.4)',
              background: 'rgba(249,115,22,0.1)', color: '#fb923c',
              cursor: 'pointer', fontSize: 13, fontWeight: 600
            }}
          >
            ⚡ + Vận Hành
          </button>
        </div>
      </div>

      {/* --- Empty State --- */}
      {!tasks.length && (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--color-text-muted)' }}>
          <Briefcase size={40} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text)' }}>Chưa có công việc nào</div>
          <div style={{ fontSize: 13, marginTop: 6, marginBottom: 24 }}>Tạo việc đầu tiên để bắt đầu</div>
          <button
            onClick={() => setShowModal(true)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '10px 20px', borderRadius: 8,
              border: 'none', background: '#3b82f6', color: '#fff',
              cursor: 'pointer', fontSize: 14, fontWeight: 600
            }}
          >
            <FolderPlus size={18} /> + Tạo Dự Án Mới
          </button>
        </div>
      )}

      {/* --- Projects Render --- */}
      {Object.keys(projectsMap).sort().map(projName => {
        const pTasks     = projectsMap[projName];
        const isProjExp  = expandedProjects[projName] ?? true;
        const folderClr  = '#3b82f6';

        // Progress
        const doneCount  = pTasks.filter(t => t.status === 'DONE').length;
        const totalCount = pTasks.length;
        const pct        = totalCount ? Math.round((doneCount / totalCount) * 100) : 0;
        const pctColor   = pct === 100 ? '#10b981' : pct >= 50 ? '#3b82f6' : '#f59e0b';

        const catMap: Record<string, PwrTask[]> = {};
        pTasks.forEach(t => {
          const c = t.category || 'OTHER';
          if (!catMap[c]) catMap[c] = [];
          catMap[c].push(t);
        });

        return (
          <div key={projName} style={{ marginBottom: 30, background: 'var(--color-surface)', borderRadius: 12, border: '1px solid var(--color-border)', overflow: 'hidden' }}>

            {/* Level 1: Project Header (Mockup accurate layout) */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={() => toggleProject(projName)}>
                  <div style={{ color: folderClr }}>
                    {isProjExp ? <FolderOpen size={28} /> : <FolderClosed size={28} />}
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-text)', textTransform: 'uppercase' }}>
                    {projName}
                  </div>
                </div>

                                  <div style={{ display: 'flex', gap: 8 }}>
                      <button 
                        onClick={() => handleDeleteProject(pTasks.find(t => t.projectId)?.projectId || 0, projName)}
                        style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '8px 16px', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                      >
                        <Trash2 size={16} /> Xóa Dự Án
                      </button>
                    <button onClick={() => setShowModal(true)} style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 8, fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                      + Tạo việc mới
                    </button>
                  </div>

              </div>

              {/* Progress Line */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)' }}>{totalCount} việc</div>
                <div style={{ flex: 1, maxWidth: 200, height: 6, background: 'var(--color-border)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: pctColor, borderRadius: 99 }} />
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: pctColor }}>Tiến độ: {pct}%</div>
              </div>
            </div>

            {isProjExp && (
              <div>
                {/* GLOBAL TABLE HEADER */}
                <div style={{
                  display: 'grid', gridTemplateColumns: 'minmax(250px, 4fr) 2fr 1fr 1fr 1fr 1fr', gap: 16,
                  padding: '12px 24px', borderBottom: '1px solid var(--color-border)',
                  background: 'var(--color-bg)',
                  fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 0.5
                }}>
                  <div>Tên công việc</div>
                  <div>Phụ trách</div>
                  <div>Hạn chót</div>
                  <div>Tiến độ</div>
                  <div style={{ textAlign: 'center' }}>Ưu tiên</div>
                  <div style={{ textAlign: 'right' }}>Trạng thái</div>
                </div>

                {/* Categories */}
                {Object.keys(catMap).sort().map(catKey => {
                  const catTasks = catMap[catKey];
                  const catStyle = CAT_STYLE[catKey] || CAT_STYLE.OTHER;
                  const cKey     = `${projName}||${catKey}`;
                  const isCatExp = expandedCategories[cKey] ?? true;
                  const catDone  = catTasks.filter(t => t.status === 'DONE').length;

                  return (
                    <div key={catKey}>
                      {/* CATEGORY FULL WIDTH ROW */}
                      <div
                        onClick={() => toggleCategory(projName, catKey)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '12px 24px',
                          background: 'var(--color-surface-2)',
                          borderBottom: '1px solid var(--color-border)',
                          cursor: 'pointer'
                        }}
                      >
                        {isCatExp ? <ChevronDown size={16} color="var(--color-text-muted)" /> : <ChevronRight size={16} color="var(--color-text-muted)" />}
                        <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-text)', textTransform: 'uppercase' }}>
                          {catStyle.label}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--color-text-muted)', background: 'var(--color-bg)', padding: '2px 8px', borderRadius: 12, fontWeight: 600, border: '1px solid var(--color-border)' }}>
                          {catDone}/{catTasks.length} việc
                        </span>
                      </div>

                      {/* TASK ROWS */}
                      {isCatExp && (
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          {(() => {
                            const batchGroups: Record<string, PwrTask[]> = {};
                            const noBatch: PwrTask[] = [];
                            catTasks.forEach(task => {
                              const batchTag = (task.tags || []).find((tag: string) => tag.startsWith('BATCH_'));
                              if (batchTag) {
                                if (!batchGroups[batchTag]) batchGroups[batchTag] = [];
                                batchGroups[batchTag].push(task);
                              } else {
                                noBatch.push(task);
                              }
                            });

                            const renderTaskRow = (task: PwrTask, isLastInBatch: boolean = false) => {
                              const statusDef = PWR_STATUS[task.status as PwrStatus];
                            const prioDef   = PWR_PRIORITY[task.priority as PwrPriority];
                            const isBlocked = blockedMap[task.id] && blockedMap[task.id].length > 0;
                            const isDone    = task.status === 'DONE';
                            const cl        = checklistMap[task.id];
                            const hasChecklist = cl && cl.total > 0;
                            const isOverdue = task.dueDate && task.dueDate < today && !isDone;
                            
                            // Avatar initials logic
                            const assignee = task.assignedTo || '';
                            const initials = assignee.trim() ? assignee.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase() : '?';

                            return (
                              <Link key={task.id} href={`/pwr/tasks/${task.id}?from=wbs&project=${encodeURIComponent(projName)}`} style={{ textDecoration: 'none', display: 'block', borderBottom: '1px solid var(--color-border)' }}>
                                <div
                                  style={{
                                    display: 'grid', gridTemplateColumns: 'minmax(250px, 4fr) 2fr 1fr 1fr 1fr 1fr', gap: 16, alignItems: 'center',
                                    padding: '12px 24px',
                                    background: isOverdue ? 'rgba(239, 68, 68, 0.05)' : isDone ? 'rgba(16,185,129,0.02)' : 'transparent',
                                    opacity: isDone ? 0.6 : 1,
                                    transition: 'background 0.15s',
                                  }}
                                  onMouseEnter={e => { e.currentTarget.style.background = isOverdue ? 'rgba(239, 68, 68, 0.1)' : 'var(--color-surface-2)'; }}
                                  onMouseLeave={e => { e.currentTarget.style.background = isOverdue ? 'rgba(239, 68, 68, 0.05)' : isDone ? 'rgba(16,185,129,0.02)' : 'transparent'; }}
                                >
                                  {/* Col 1: Title & Icon */}
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, overflow: 'hidden' }}>
                                    <button
                                      onClick={e => handleToggleDone(e, task)}
                                      disabled={pendingIds.has(task.id)}
                                      style={{
                                        background: 'none', border: 'none', cursor: isBlocked ? 'not-allowed' : 'pointer',
                                        padding: 0, flexShrink: 0,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        opacity: pendingIds.has(task.id) ? 0.4 : 1,
                                      }}
                                    >
                                      {isDone ? <CheckCircle2 size={18} color="#10b981" /> : <div style={{ width: 16, height: 16, borderRadius: '50%', border: '1.5px solid var(--color-border-light)' }} />}
                                    </button>
                                    
                                    <div style={{ fontSize: 14, fontWeight: isDone ? 400 : 500, color: isOverdue ? '#ef4444' : isDone ? 'var(--color-text-secondary)' : 'var(--color-text)', textDecoration: isDone ? 'line-through' : 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      <span style={{ color: 'var(--color-text-muted)', fontSize: 12, marginRight: 8 }}>#{task.id}</span>
                                      {isBlocked && <Lock size={12} style={{ marginRight: 6, verticalAlign: 'middle', color: '#ef4444' }} />}
                                      {task.title}
                                    </div>
                                  </div>

                                  {/* Col 2: Phụ Trách (Avatar) */}
                                  <div>
                                    {assignee ? (
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(59,130,246,0.15)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>{initials}</div>
                                        <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{assignee}</div>
                                      </div>
                                    ) : (
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-text-muted)', fontStyle: 'italic', fontSize: 13 }}>
                                        <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--color-surface-2)', border: '1px dashed var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>?</div>
                                        Chưa phân công
                                      </div>
                                    )}
                                  </div>

                                  {/* Col 3: Hạn chót */}
                                  <div>
                                    {task.dueDate ? (
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: isOverdue ? '#ef4444' : 'var(--color-text-secondary)', fontWeight: isOverdue ? 700 : 400 }}>
                                        {isOverdue && <AlertCircle size={14} />}
                                        {isOverdue ? 'Hôm qua' : task.dueDate}
                                      </div>
                                    ) : (
                                      <span style={{ color: 'var(--color-text-disabled)' }}>-</span>
                                    )}
                                  </div>

                                  {/* Col 4: Tiến độ */}
                                  <div>
                                    {hasChecklist ? (
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontWeight: 500 }}>{cl.done}/{cl.total}</span>
                                      </div>
                                    ) : (
                                      <span style={{ color: 'var(--color-text-disabled)' }}>-</span>
                                    )}
                                  </div>

                                  {/* Col 5: Ưu tiên */}
                                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                                    {prioDef && task.priority !== 'MEDIUM' ? (
                                      <span style={{ fontSize: 11, fontWeight: 700, color: prioDef.color }}>{prioDef.label}</span>
                                    ) : (
                                      <span style={{ color: 'var(--color-text-disabled)' }}>-</span>
                                    )}
                                  </div>

                                  {/* Col 6: Trạng thái */}
                                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                    <div style={{
                                      display: 'flex', alignItems: 'center', gap: 4,
                                      fontSize: 12, fontWeight: 600,
                                      color: statusDef?.color,
                                      background: `${statusDef?.color}15`,
                                      padding: '4px 10px', borderRadius: 6,
                                      border: `1px solid ${statusDef?.color}25`,
                                    }}>
                                      {statusDef?.label}
                                    </div>
                                  </div>

                                </div>
                              </Link>
                            );
                            };

                            return (
                              <>
                                {Object.entries(batchGroups).map(([batchId, bTasks]) => (
                                  <div key={batchId} style={{ borderBottom: '2px solid var(--color-border-light)', marginBottom: 12, paddingBottom: 12 }}>
                                    <div style={{ padding: '8px 24px', background: 'rgba(59, 130, 246, 0.08)', fontSize: 13, fontWeight: 700, color: '#2563eb', display: 'flex', alignItems: 'center', gap: 8, borderTop: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)' }}>
                                      📦 Lô: {batchId.replace('BATCH_', '')}
                                    </div>
                                    {bTasks.sort((a, b) => a.id - b.id).map((t, idx) => renderTaskRow(t, idx === bTasks.length - 1))}
                                  </div>
                                ))}
                                {noBatch.length > 0 && (
                                  <div style={{ marginBottom: 16 }}>
                                    {Object.keys(batchGroups).length > 0 && (
                                      <div style={{ padding: '8px 24px', background: 'var(--color-surface-2)', fontSize: 13, fontWeight: 700, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 8, borderTop: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)' }}>
                                        📋 Công việc chung
                                      </div>
                                    )}
                                    {noBatch.sort((a, b) => a.id - b.id).map(t => renderTaskRow(t, false))}
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      <PwrVanHanhSection
        tasks={opTasks}
        blockedIds={new Set(Object.keys(blockedMap).map(Number))}
        checklistMap={checklistMap}
        onCreateTask={() => setShowOpModal(true)}
      />
    </div>
  );
}
