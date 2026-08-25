'use client';

import { useState, useEffect } from 'react';
import type { PwrTask, PwrStatus, PwrPriority } from '@/db/schema';
import {
  ChevronRight, ChevronDown, FolderOpen, FolderClosed,
  CheckCircle2, Clock, AlertCircle, PlayCircle, Loader2,
  Lock, ArrowRight, Zap, Package, Wrench, Users, ShoppingCart,
  Briefcase, FileText, AlertTriangle, MoreHorizontal,
} from 'lucide-react';
import { PWR_PRIORITY, PWR_STATUS } from '@/lib/pwr/constants';
import Link from 'next/link';

interface Props { tasks: PwrTask[] }

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

export default function PwrWbsView({ tasks }: Props) {
  const [expandedProjects,   setExpandedProjects]   = useState<Record<string, boolean>>({});
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [blockedIds,  setBlockedIds]  = useState<Set<number>>(new Set());
  const [checklistMap, setChecklistMap] = useState<Record<number, { total: number; done: number }>>({});

  const toggleProject  = (p: string) => setExpandedProjects(prev => ({ ...prev, [p]: !(prev[p] ?? true) }));
  const toggleCategory = (p: string, c: string) => {
    const k = `${p}||${c}`;
    setExpandedCategories(prev => ({ ...prev, [k]: !(prev[k] ?? true) }));
  };

  // Batch fetch: blocker status + checklist counts
  useEffect(() => {
    if (!tasks.length) return;
    const nonDone = tasks.filter(t => !['DONE','CANCELLED'].includes(t.status));

    // 1. Blocked status
    Promise.all(
      nonDone.map(t =>
        fetch(`/api/pwr/tasks/${t.id}/dependencies`)
          .then(r => r.json())
          .then(d => ({ id: t.id, isBlocked: !!d.isBlocked }))
          .catch(() => ({ id: t.id, isBlocked: false }))
      )
    ).then(res => {
      setBlockedIds(new Set(res.filter(r => r.isBlocked).map(r => r.id)));
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

  // Group: Project → Category
  const projectsMap: Record<string, PwrTask[]> = {};
  tasks.forEach(t => {
    const p = t.projectRef?.trim() || '[VẬN HÀNH] NỘI BỘ / KHÁC';
    if (!projectsMap[p]) projectsMap[p] = [];
    projectsMap[p].push(t);
  });

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div style={{ padding: '8px 24px 60px', color: '#f8fafc', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif' }}>

      {/* ─── Empty State ─── */}
      {!tasks.length && (
        <div style={{ textAlign: 'center', padding: '80px 0', color: '#475569' }}>
          <Briefcase size={40} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
          <div style={{ fontSize: 16, fontWeight: 600 }}>Chưa có công việc nào</div>
          <div style={{ fontSize: 13, marginTop: 6 }}>Tạo việc đầu tiên để bắt đầu</div>
        </div>
      )}

      {Object.keys(projectsMap).sort().map(projName => {
        const projTasks  = projectsMap[projName];
        const isProjExp  = expandedProjects[projName] ?? true;
        const isOp       = projName.toUpperCase().includes('VẬN HÀNH');
        const folderClr  = isOp ? '#f97316' : '#60a5fa';
        const folderBdr  = isOp ? 'rgba(249,115,22,0.18)' : 'rgba(96,165,250,0.18)';
        const folderBg   = isOp ? 'rgba(249,115,22,0.05)' : 'rgba(96,165,250,0.05)';

        // Progress
        const doneCount  = projTasks.filter(t => t.status === 'DONE').length;
        const totalCount = projTasks.length;
        const pct        = totalCount ? Math.round((doneCount / totalCount) * 100) : 0;
        const pctColor   = pct === 100 ? '#10b981' : pct >= 50 ? '#3b82f6' : '#f59e0b';

        const catMap: Record<string, PwrTask[]> = {};
        projTasks.forEach(t => {
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

              {/* Project Name */}
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

              {/* Task Count Badge */}
              <div style={{
                background: isOp ? 'rgba(249,115,22,0.15)' : 'rgba(96,165,250,0.15)',
                color: folderClr, padding: '3px 10px', borderRadius: 99,
                fontSize: 12, fontWeight: 700, flexShrink: 0,
                border: `1px solid ${folderBdr}`,
              }}>
                {totalCount} việc
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
                            const isBlocked = blockedIds.has(task.id);
                            const isDone    = task.status === 'DONE';
                            const cl        = checklistMap[task.id];
                            const hasChecklist = cl && cl.total > 0;
                            const clPct     = cl?.total ? Math.round((cl.done / cl.total) * 100) : 0;
                            const isOverdue = task.dueDate && task.dueDate < today && !isDone;

                            return (
                              <Link key={task.id} href={`/pwr/tasks/${task.id}`} style={{ textDecoration: 'none' }}>
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
                                  {/* Status Icon */}
                                  <div style={{ flexShrink: 0 }}>
                                    <StatusIcon status={task.status} />
                                  </div>

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
    </div>
  );
}
