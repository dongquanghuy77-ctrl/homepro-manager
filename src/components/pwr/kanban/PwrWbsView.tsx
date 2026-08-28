'use client';

import { useState, useEffect } from 'react';
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
  ADMIN:      { label: 'Hành chính', color: '#64748b', bg: 'rgba(100,116,139,0.12)', Icon: FileText },
  INCIDENT:   { label: 'Phát sinh',  color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   Icon: AlertTriangle },
  OTHER:      { label: 'Khác',       color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', Icon: MoreHorizontal },
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

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div style={{ padding: '8px 24px 60px', color: '#f8fafc', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif' }}>

      {/* ── Sprint B: Checklist Warning Modal ── */}
      {warnTask && (() => {
        const cl = checklistMap[warnTask.id];
        return (
          <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: '#1e293b', border: '1px solid rgba(251,146,60,0.4)', borderRadius: 14, padding: '28px 32px', maxWidth: 420, width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <span style={{ fontSize: 28 }}>⚠️</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16, color: '#f1f5f9' }}>Checklist chưa hoàn thành</div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 3 }}>Còn {cl ? cl.total - cl.done : '?'} việc con chưa xong</div>
                </div>
              </div>
              <div style={{ fontSize: 14, color: '#94a3b8', marginBottom: 20, lineHeight: 1.6 }}>
                Task <strong style={{ color: '#f1f5f9' }}>"{warnTask.title.substring(0, 50)}"</strong> có{' '}
                <strong style={{ color: '#fb923c' }}>{cl ? cl.done : 0}/{cl ? cl.total : 0}</strong> checklist hoàn thành.<br />
                Bạn có chắc muốn đánh dấu task này là <strong style={{ color: '#10b981' }}>Hoàn thành</strong>?
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setWarnTask(null)}
                  style={{ padding: '9px 18px', borderRadius: 8, background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: '#94a3b8', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
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

      {/* ─── Header toolbar ─── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ fontSize: 13, color: '#64748b' }}>
          {Object.keys(projectsMap).length} dự án · {projTasks.length} task dự án
          {opTasks.length > 0 && <span style={{ color: '#f97316', marginLeft: 8 }}>· {opTasks.length} việc vận hành</span>}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {/* Tạo việc vận hành */}
          <button
            onClick={() => setShowOpModal(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '8px 14px', borderRadius: 8,
              border: '1px solid rgba(249,115,22,0.4)',
              background: 'rgba(249,115,22,0.1)', color: '#fb923c',
              cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background='rgba(249,115,22,0.22)'; }}
            onMouseLeave={e => { e.currentTarget.style.background='rgba(249,115,22,0.1)'; }}
          >
            ⚙️ + Vận Hành
          </button>
          {/* Tạo dự án */}
          <button
            onClick={() => setShowModal(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '8px 16px', borderRadius: 8,
              border: '1px solid rgba(99,102,241,0.4)',
              background: 'rgba(99,102,241,0.12)', color: '#a5b4fc',
              cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background='rgba(99,102,241,0.25)'; e.currentTarget.style.color='#c7d2fe'; }}
            onMouseLeave={e => { e.currentTarget.style.background='rgba(99,102,241,0.12)'; e.currentTarget.style.color='#a5b4fc'; }}
          >
            <FolderPlus size={15} /> + Tạo dự án mới
          </button>
        </div>
      </div>

      {/* ─── Toast — type-aware colors ─── */}
      {toast && (() => {
        const cfg = {
          success: { bg: '#10b981', shadow: 'rgba(16,185,129,0.4)',  icon: '✅' },
          error:   { bg: '#ef4444', shadow: 'rgba(239,68,68,0.4)',   icon: '❌' },
          warning: { bg: '#f59e0b', shadow: 'rgba(245,158,11,0.4)',  icon: '⚠️' },
        }[toast.type];
        return (
          <div style={{
            position: 'fixed', top: 24, right: 24, zIndex: 10000,
            background: cfg.bg, color: '#fff', padding: '12px 20px',
            borderRadius: 10, fontWeight: 600, fontSize: 14,
            boxShadow: `0 8px 24px ${cfg.shadow}`,
            animation: 'slideIn 0.3s ease',
            display: 'flex', alignItems: 'center', gap: 8, maxWidth: 380,
          }}>
            <span style={{ flexShrink: 0 }}>{cfg.icon}</span>
            <span>{toast.message}</span>
          </div>
        );
      })()}

      {/* ─── Modals ─── */}
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

      {/* ─── Empty State ─── */}
      {!tasks.length && (
        <div style={{ textAlign: 'center', padding: '80px 0', color: '#475569' }}>
          <Briefcase size={40} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
          <div style={{ fontSize: 16, fontWeight: 600 }}>Chưa có công việc nào</div>
          <div style={{ fontSize: 13, marginTop: 6 }}>Tạo việc đầu tiên để bắt đầu</div>
        </div>
      )}

      {Object.keys(projectsMap).sort().map(projName => {
        const pTasks     = projectsMap[projName];
        const isProjExp  = expandedProjects[projName] ?? true;
        const folderClr  = '#60a5fa';
        const folderBdr  = 'rgba(96,165,250,0.18)';
        const folderBg   = 'rgba(96,165,250,0.05)';

        // Progress (only PROJECT_TASK tasks count toward %)
        const doneCount  = pTasks.filter(t => t.status === 'DONE').length;
        const totalCount = pTasks.length;
        const pct        = totalCount ? Math.round((doneCount / totalCount) * 100) : 0;
        const pctColor   = pct === 100 ? '#10b981' : pct >= 50 ? '#3b82f6' : '#f59e0b';

        // Gate health (smart: blocked + overdue analysis)
        const gateHealth = getGateHealth(pTasks);
        const gateColor  = gateHealth.status === 'GREEN' ? '#10b981' : gateHealth.status === 'YELLOW' ? '#f59e0b' : '#ef4444';

        const catMap: Record<string, PwrTask[]> = {};
        pTasks.forEach(t => {
          const c = t.category || 'OTHER';
          if (!catMap[c]) catMap[c] = [];
          catMap[c].push(t);
        });

        return (
          <div key={projName} style={{
            marginBottom: 20,
            border: `1px solid ${folderBdr}`,
            borderRadius: 14,
            overflow: 'hidden',
            background: 'rgba(15,23,42,0.6)',
            backdropFilter: 'blur(10px)',
          }}>

            {/* ── Level 1: Project Header ── */}
            <div
              onClick={() => toggleProject(projName)}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 20px', cursor: 'pointer',
                background: isProjExp ? folderBg : 'transparent',
                borderBottom: isProjExp ? `1px solid ${folderBdr}` : 'none',
                transition: 'background 0.2s',
              }}
            >
              {/* Chevron */}
              <div style={{ color: '#475569', flexShrink: 0 }}>
                {isProjExp ? <ChevronDown size={17} /> : <ChevronRight size={17} />}
              </div>

              {/* Folder Icon */}
              <div style={{ color: folderClr, flexShrink: 0 }}>
                {isProjExp ? <FolderOpen size={22} /> : <FolderClosed size={22} />}
              </div>

              {/* Project Name + Progress */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 15, fontWeight: 800, letterSpacing: 0.3,
                  color: folderClr, textTransform: 'uppercase',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {projName}
                </div>
                {/* Mini Progress Bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5 }}>
                  <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.07)', borderRadius: 99, overflow: 'hidden', maxWidth: 160 }}>
                    <div style={{
                      height: '100%', width: `${pct}%`,
                      background: pctColor,
                      borderRadius: 99, transition: 'width 0.5s ease',
                    }} />
                  </div>
                  <span style={{ fontSize: 11, color: pctColor, fontWeight: 700 }}>
                    {doneCount}/{totalCount} việc · {pct}%
                  </span>
                </div>
              </div>

              {/* Gate Health Badge — smart risk indicator */}
              <div
                title={gateHealth.detail}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '3px 9px', borderRadius: 20, fontSize: 10, fontWeight: 700,
                  color: gateColor, background: `${gateColor}15`,
                  border: `1px solid ${gateColor}30`, flexShrink: 0,
                }}
              >
                {gateHealth.status === 'GREEN' && <><Check size={10} /> OK</>}
                {gateHealth.status === 'YELLOW' && <><AlertCircle size={10} /> Chú ý</>}
                {gateHealth.status === 'RED'    && <><AlertOctagon size={10} /> Rủi ro</>}
              </div>

              {/* Task Count Badge */}
              <div style={{
                background: 'rgba(96,165,250,0.15)',
                color: folderClr, padding: '3px 10px', borderRadius: 99,
                fontSize: 12, fontWeight: 700, flexShrink: 0,
                border: `1px solid ${folderBdr}`,
              }}>
                {totalCount} việc
              </div>

              {/* Archive & Delete buttons — stop propagation so expand doesn't trigger */}
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                <button
                  title="Archive dự án (ẩn khỏi active view, giữ dữ liệu)"
                  onClick={async () => {
                    if (!confirm(`Archive dự án "${projName}"? Dự án sẽ bị ẩn nhưng dữ liệu vẫn được giữ.`)) return;
                    // Find project id from tasks
                    const projId = (pTasks[0] as any)?.projectId;
                    if (projId) {
                      await fetch(`/api/pwr/projects/${projId}?action=archive`, { method: 'DELETE' });
                    } else {
                      // Fallback: cancel all tasks of this project by projectRef
                      await fetch('/api/pwr/tasks?action=cancel', {
                        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ ids: pTasks.map(t => t.id) }),
                      });
                    }
                    setToast({ message: `Đã archive dự án "${projName}"`, type: 'success' });
                    setTimeout(() => setToast(null), 3000);
                    onRefresh?.();
                  }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569', padding: '4px 6px', borderRadius: 6, display: 'flex', alignItems: 'center' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(245,158,11,0.1)'; (e.currentTarget as HTMLElement).style.color = '#f59e0b'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none'; (e.currentTarget as HTMLElement).style.color = '#475569'; }}>
                  <Archive size={14} />
                </button>
                <button
                  title="Xóa dự án + toàn bộ task (soft delete)"
                  onClick={async () => {
                    if (!confirm(`XÓA dự án "${projName}" và ${totalCount} task?\n\nDữ liệu sẽ bị ẩn hoàn toàn. Có thể phục hồi trong 30 ngày.`)) return;
                    const projId = (pTasks[0] as any)?.projectId;
                    if (projId) {
                      await fetch(`/api/pwr/projects/${projId}?action=delete&deleteTasks=true`, { method: 'DELETE' });
                    } else {
                      await fetch('/api/pwr/tasks?action=delete', {
                        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ ids: pTasks.map(t => t.id) }),
                      });
                    }
                    setToast({ message: `Đã xóa dự án "${projName}" (${totalCount} task)`, type: 'success' });
                    setTimeout(() => setToast(null), 3000);
                    onRefresh?.();
                  }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569', padding: '4px 6px', borderRadius: 6, display: 'flex', alignItems: 'center' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.1)'; (e.currentTarget as HTMLElement).style.color = '#ef4444'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none'; (e.currentTarget as HTMLElement).style.color = '#475569'; }}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {/* ── Level 2 & 3 ── */}
            {isProjExp && (
              <div style={{ padding: '12px 16px 16px' }}>
                {Object.keys(catMap).sort().map(catKey => {

                  const catTasks = catMap[catKey];
                  const catStyle = CAT_STYLE[catKey] || CAT_STYLE.OTHER;
                  const CatIcon  = catStyle.Icon;
                  const cKey     = `${projName}||${catKey}`;
                  const isCatExp = expandedCategories[cKey] ?? true;
                  const catDone  = catTasks.filter(t => t.status === 'DONE').length;

                  return (
                    <div key={catKey} style={{ marginBottom: 8 }}>

                      {/* ── Category Pill Header ── */}
                      <div
                        onClick={() => toggleCategory(projName, catKey)}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          padding: '5px 12px 5px 8px',
                          background: catStyle.bg,
                          border: `1px solid ${catStyle.color}30`,
                          borderRadius: 99, cursor: 'pointer',
                          marginBottom: 8, marginLeft: 4,
                          transition: 'opacity 0.2s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.opacity = '0.75'}
                        onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                      >
                        {isCatExp ? <ChevronDown size={13} color={catStyle.color} /> : <ChevronRight size={13} color={catStyle.color} />}
                        <CatIcon size={13} color={catStyle.color} />
                        <span style={{ fontSize: 12, fontWeight: 700, color: catStyle.color, letterSpacing: 0.3 }}>
                          {catStyle.label}
                        </span>
                        <span style={{ fontSize: 11, color: `${catStyle.color}90`, fontWeight: 500 }}>
                          {catDone}/{catTasks.length}
                        </span>
                      </div>

                      {/* ── Level 3: Task Rows ── */}
                      {isCatExp && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, paddingLeft: 16 }}>
                          {catTasks.sort((a, b) => a.id - b.id).map(task => {
                            const statusDef = PWR_STATUS[task.status as PwrStatus];
                            const prioDef   = PWR_PRIORITY[task.priority as PwrPriority];
                            const isBlocked = blockedMap[task.id] && blockedMap[task.id].length > 0;
                            const isDone    = task.status === 'DONE';
                            const cl        = checklistMap[task.id];
                            const hasChecklist = cl && cl.total > 0;
                            const clPct     = cl?.total ? Math.round((cl.done / cl.total) * 100) : 0;
                            const isOverdue = task.dueDate && task.dueDate < today && !isDone;

                            return (
                              <Link key={task.id} href={`/pwr/tasks/${task.id}?from=wbs&project=${encodeURIComponent(projName)}`} style={{ textDecoration: 'none' }}>
                                <div
                                  style={{
                                    display: 'flex', alignItems: 'center', gap: 12,
                                    padding: '9px 14px',
                                    background: isBlocked
                                      ? 'rgba(239,68,68,0.04)'
                                      : isDone
                                        ? 'rgba(16,185,129,0.03)'
                                        : 'rgba(255,255,255,0.025)',
                                    border: `1px solid ${
                                      isBlocked ? 'rgba(239,68,68,0.15)' :
                                      isDone ? 'rgba(16,185,129,0.12)' :
                                      'rgba(255,255,255,0.05)'
                                    }`,
                                    borderRadius: 9,
                                    opacity: isDone ? 0.6 : 1,
                                    transition: 'all 0.15s',
                                  }}
                                  onMouseEnter={e => {
                                    e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
                                    e.currentTarget.style.transform = 'translateX(2px)';
                                  }}
                                  onMouseLeave={e => {
                                    e.currentTarget.style.background = isBlocked ? 'rgba(239,68,68,0.04)' : isDone ? 'rgba(16,185,129,0.03)' : 'rgba(255,255,255,0.025)';
                                    e.currentTarget.style.borderColor = isBlocked ? 'rgba(239,68,68,0.15)' : isDone ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.05)';
                                    e.currentTarget.style.transform = 'translateX(0)';
                                  }}
                                >
                                  {/* Status Icon — Sprint A: clickable quick-toggle */}
                                  <button
                                    onClick={e => handleToggleDone(e, task)}
                                    disabled={pendingIds.has(task.id)}
                                    title={isDone ? 'Bấm để mở lại task' : (isBlocked ? 'Task đang bị chặn bởi task khác' : 'Bấm để đánh dấu hoàn thành')}
                                    style={{
                                      background: 'none', border: 'none', cursor: isBlocked ? 'not-allowed' : 'pointer',
                                      padding: 2, borderRadius: 99, flexShrink: 0,
                                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                                      opacity: pendingIds.has(task.id) ? 0.4 : 1,
                                      transform: pendingIds.has(task.id) ? 'scale(0.85)' : 'scale(1)',
                                      transition: 'all 0.15s',
                                    }}
                                    onMouseEnter={e => {
                                      if (!isBlocked && !pendingIds.has(task.id)) {
                                        (e.currentTarget as HTMLElement).style.transform = 'scale(1.25)';
                                        (e.currentTarget as HTMLElement).style.filter = isDone ? 'drop-shadow(0 0 3px #10b981)' : 'drop-shadow(0 0 3px #6366f1)';
                                      }
                                    }}
                                    onMouseLeave={e => {
                                      (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
                                      (e.currentTarget as HTMLElement).style.filter = 'none';
                                    }}
                                  >
                                    <StatusIcon status={task.status} />
                                  </button>

                                  {/* ID */}
                                  <span style={{ fontSize: 11, fontWeight: 700, color: '#475569', width: 36, flexShrink: 0 }}>
                                    #{task.id}
                                  </span>

                                  {/* Title + Blocker label */}
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{
                                      fontSize: 13.5, fontWeight: isDone ? 400 : 500,
                                      color: isBlocked ? '#64748b' : isDone ? '#94a3b8' : '#f1f5f9',
                                      textDecoration: isDone ? 'line-through' : 'none',
                                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                    }}>
                                      {isBlocked && <Lock size={10} style={{ marginRight: 5, verticalAlign: 'middle', color: '#ef4444' }} />}
                                      {task.title}
                                    </div>

                                    {/* Checklist mini bar */}
                                    {hasChecklist && (
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                                        <div style={{ width: 60, height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' }}>
                                          <div style={{
                                            height: '100%', width: `${clPct}%`,
                                            background: clPct === 100 ? '#10b981' : '#6366f1',
                                            borderRadius: 99, transition: 'width 0.3s',
                                          }} />
                                        </div>
                                        <span style={{ fontSize: 10, color: clPct === 100 ? '#10b981' : '#64748b', fontWeight: 600 }}>
                                          ✓ {cl.done}/{cl.total}
                                        </span>
                                      </div>
                                    )}
                                  </div>

                                  {/* Right side badges */}
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                                    {/* Due date */}
                                    {task.dueDate && (
                                      <span style={{
                                        fontSize: 11, color: isOverdue ? '#ef4444' : '#475569',
                                        fontWeight: isOverdue ? 700 : 400,
                                      }}>
                                        {isOverdue ? '⚠ ' : ''}{task.dueDate}
                                      </span>
                                    )}

                                    {/* Status badge */}
                                    <div style={{
                                      display: 'flex', alignItems: 'center', gap: 4,
                                      fontSize: 11, fontWeight: 600,
                                      color: statusDef?.color,
                                      background: `${statusDef?.color}15`,
                                      padding: '3px 8px', borderRadius: 20,
                                      border: `1px solid ${statusDef?.color}25`,
                                    }}>
                                      {statusDef?.label}
                                    </div>

                                    {/* Priority badge */}
                                    {prioDef && task.priority !== 'MEDIUM' && (
                                      <div style={{
                                        fontSize: 10, fontWeight: 700,
                                        color: prioDef.color,
                                        background: `${prioDef.color}15`,
                                        padding: '3px 7px', borderRadius: 6,
                                      }}>
                                        {prioDef.label}
                                      </div>
                                    )}

                                    <ArrowRight size={13} color="#334155" />
                                  </div>
                                </div>
                              </Link>
                            );
                          })}
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

      {/* ─── ZONE B: Vận Hành Nội Bộ ─── */}
      <PwrVanHanhSection
        tasks={opTasks}
        blockedIds={blockedIds}
        checklistMap={checklistMap}
        onCreateTask={() => setShowOpModal(true)}
      />
    </div>
  );
}

