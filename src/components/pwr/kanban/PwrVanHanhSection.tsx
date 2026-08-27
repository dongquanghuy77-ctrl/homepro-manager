'use client';
import { useState } from 'react';
import type { PwrTask, PwrStatus, PwrPriority } from '@/db/schema';
import {
  ChevronDown, ChevronRight, Wrench, Users, Package, FileText,
  MoreHorizontal, CheckCircle2, Clock, AlertCircle, PlayCircle,
  Loader2, ArrowRight, Lock, Shield, RefreshCw, Cpu, Plus, Activity,
} from 'lucide-react';
import { PWR_STATUS, PWR_PRIORITY } from '@/lib/pwr/constants';
import Link from 'next/link';

interface Props {
  tasks: PwrTask[];
  blockedIds: Set<number>;
  checklistMap: Record<number, { total: number; done: number }>;
  onCreateTask: () => void;
}

// ── Mảng config ────────────────────────────────────────────────────────────────
const MANG = [
  { key: 'EQUIPMENT', label: '⚙️ Máy móc & Thiết bị', icon: Wrench,  color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
  { key: 'PERSONNEL', label: '👷 Nhân sự & Ca làm',   icon: Users,   color: '#ec4899', bg: 'rgba(236,72,153,0.1)' },
  { key: 'MATERIAL',  label: '📦 Kho & Vật tư',       icon: Package, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  { key: 'ADMIN',     label: '📋 Hành chính & An toàn', icon: FileText, color: '#64748b', bg: 'rgba(100,116,139,0.1)' },
  { key: 'OTHER',     label: '🔧 Khác',               icon: MoreHorizontal, color: '#94a3b8', bg: 'rgba(148,163,184,0.08)' },
];

// ── Health score: 🟢 GOOD · 🟡 WARN · 🔴 CRITICAL ────────────────────────────
function calcHealth(tasks: PwrTask[], today: string) {
  if (!tasks.length) return { score: 'EMPTY', color: '#475569', label: 'Trống' };
  const active  = tasks.filter(t => !['DONE','CANCELLED'].includes(t.status));
  const overdue = active.filter(t => t.dueDate && t.dueDate < today);
  const done    = tasks.filter(t => t.status === 'DONE').length;
  const pct     = Math.round((done / tasks.length) * 100);

  if (overdue.length >= 3 || pct < 30)     return { score: 'CRITICAL', color: '#ef4444', label: '🔴 Cần xử lý ngay' };
  if (overdue.length >= 1 || pct < 60)     return { score: 'WARN',     color: '#f59e0b', label: '🟡 Cần chú ý' };
  return                                          { score: 'GOOD',     color: '#10b981', label: '🟢 Ổn định' };
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'DONE':        return <CheckCircle2 size={12} color="#10b981" />;
    case 'IN_PROGRESS': return <Loader2 size={12} color="#3b82f6" style={{ animation: 'spin 1s linear infinite' }} />;
    case 'WAITING':     return <Clock size={12} color="#f59e0b" />;
    case 'TODO':        return <PlayCircle size={12} color="#8b5cf6" />;
    case 'INBOX':       return <AlertCircle size={12} color="#ef4444" />;
    default:            return <CheckCircle2 size={12} color="#64748b" />;
  }
}

export default function PwrVanHanhSection({ tasks, blockedIds, checklistMap, onCreateTask }: Props) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    EQUIPMENT: true, PERSONNEL: true, MATERIAL: true, ADMIN: true, OTHER: false,
  });
  const [showKpi, setShowKpi] = useState(true);

  const today = new Date().toISOString().slice(0, 10);
  const FONT  = '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif';

  // Group tasks by category
  const grouped: Record<string, PwrTask[]> = {};
  tasks.forEach(t => {
    const c = t.category || 'OTHER';
    // Map categories to operational mảng
    const k = ['EQUIPMENT','PERSONNEL','MATERIAL','ADMIN'].includes(c) ? c : 'OTHER';
    if (!grouped[k]) grouped[k] = [];
    grouped[k].push(t);
  });

  // Overall health
  const overallActive  = tasks.filter(t => !['DONE','CANCELLED'].includes(t.status));
  const overallOverdue = overallActive.filter(t => t.dueDate && t.dueDate < today).length;
  const overallDone    = tasks.filter(t => t.status === 'DONE').length;
  const overallPct     = tasks.length ? Math.round((overallDone / tasks.length) * 100) : 0;

  if (!tasks.length && Object.keys(grouped).length === 0) {
    return (
      <div style={{
        marginTop: 28, border: '1px dashed rgba(249,115,22,0.25)', borderRadius: 14,
        padding: '32px 24px', textAlign: 'center', color: '#64748b', fontFamily: FONT,
      }}>
        <Cpu size={36} style={{ margin: '0 auto 12px', color: '#f97316', opacity: 0.5 }} />
        <div style={{ fontSize: 15, fontWeight: 700, color: '#94a3b8' }}>Chưa có việc vận hành nội bộ</div>
        <div style={{ fontSize: 13, marginTop: 6, marginBottom: 20 }}>Tạo việc đầu tiên — bảo dưỡng máy, lịch ca, kiểm kê kho...</div>
        <button
          onClick={onCreateTask}
          style={{
            padding: '10px 24px', borderRadius: 9, cursor: 'pointer',
            background: 'rgba(249,115,22,0.15)', border: '1px solid rgba(249,115,22,0.35)',
            color: '#f97316', fontSize: 13, fontWeight: 700,
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}
        >
          <Plus size={14} /> + Tạo việc vận hành đầu tiên
        </button>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 32, fontFamily: FONT }}>

      {/* ── Section Header ─────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16,
        paddingBottom: 12, borderBottom: '1px solid rgba(249,115,22,0.15)',
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Cpu size={18} color="#f97316" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#f97316', letterSpacing: 0.5, textTransform: 'uppercase' }}>
            ⚙️ VẬN HÀNH NỘI BỘ
          </div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
            {tasks.length} việc · {overallDone} hoàn thành · {overallOverdue > 0 ? `⚠ ${overallOverdue} quá hạn` : '✓ Không quá hạn'}
          </div>
        </div>

        {/* Overall health badge */}
        <div style={{
          padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700,
          background: overallOverdue >= 3 ? 'rgba(239,68,68,0.12)' : overallOverdue >= 1 ? 'rgba(245,158,11,0.12)' : 'rgba(16,185,129,0.12)',
          color: overallOverdue >= 3 ? '#ef4444' : overallOverdue >= 1 ? '#f59e0b' : '#10b981',
          border: `1px solid ${overallOverdue >= 3 ? 'rgba(239,68,68,0.3)' : overallOverdue >= 1 ? 'rgba(245,158,11,0.3)' : 'rgba(16,185,129,0.3)'}`,
        }}>
          {overallOverdue >= 3 ? '🔴 Cần xử lý' : overallOverdue >= 1 ? '🟡 Chú ý' : '🟢 Ổn định'}
        </div>

        {/* KPI toggle */}
        <button onClick={() => setShowKpi(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569', padding: 4 }}>
          <Activity size={16} />
        </button>

        {/* Create button */}
        <button
          onClick={onCreateTask}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
            borderRadius: 8, border: '1px solid rgba(249,115,22,0.4)',
            background: 'rgba(249,115,22,0.1)', color: '#f97316',
            cursor: 'pointer', fontSize: 12, fontWeight: 700, transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background='rgba(249,115,22,0.2)'; }}
          onMouseLeave={e => { e.currentTarget.style.background='rgba(249,115,22,0.1)'; }}
        >
          <Plus size={13} /> Tạo việc
        </button>
      </div>

      {/* ── KPI Dashboard ──────────────────────────────────────────────────── */}
      {showKpi && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 10, marginBottom: 20 }}>
          {MANG.filter(m => m.key !== 'OTHER').map(m => {
            const mTasks    = grouped[m.key] || [];
            const mDone     = mTasks.filter(t => t.status === 'DONE').length;
            const mOverdue  = mTasks.filter(t => t.dueDate && t.dueDate < today && !['DONE','CANCELLED'].includes(t.status)).length;
            const mPct      = mTasks.length ? Math.round((mDone / mTasks.length) * 100) : 0;
            const health    = calcHealth(mTasks, today);
            const Icon      = m.icon;

            return (
              <div key={m.key} style={{
                background: m.bg, border: `1px solid ${m.color}20`,
                borderRadius: 12, padding: '14px 16px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Icon size={14} color={m.color} />
                  <span style={{ fontSize: 10, fontWeight: 700, color: health.color }}>{health.label}</span>
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: m.color, marginBottom: 6, letterSpacing: 0.3 }}>
                  {m.label.replace(/^[^\s]+\s/, '')}
                </div>
                {/* Mini progress bar */}
                <div style={{ height: 3, background: 'rgba(255,255,255,0.07)', borderRadius: 99, marginBottom: 6, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${mPct}%`, background: m.color, borderRadius: 99, transition: 'width 0.5s' }} />
                </div>
                <div style={{ fontSize: 11, color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{mDone}/{mTasks.length} xong</span>
                  {mOverdue > 0 && <span style={{ color: '#ef4444', fontWeight: 700 }}>⚠ {mOverdue}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Task List by Mảng ──────────────────────────────────────────────── */}
      <div style={{
        border: '1px solid rgba(249,115,22,0.15)', borderRadius: 14,
        overflow: 'hidden', background: 'rgba(15,23,42,0.5)',
        backdropFilter: 'blur(10px)',
      }}>
        {MANG.map((m, mi) => {
          const mTasks = grouped[m.key] || [];
          if (!mTasks.length) return null;
          const Icon   = m.icon;
          const isExp  = expanded[m.key] ?? true;
          const mDone  = mTasks.filter(t => t.status === 'DONE').length;

          return (
            <div key={m.key}>
              {/* Category header */}
              <div
                onClick={() => setExpanded(p => ({ ...p, [m.key]: !isExp }))}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '12px 18px',
                  cursor: 'pointer', borderTop: mi > 0 ? '1px solid rgba(249,115,22,0.08)' : 'none',
                  background: isExp ? m.bg : 'transparent', transition: 'background 0.2s',
                }}
              >
                {isExp ? <ChevronDown size={14} color={m.color} /> : <ChevronRight size={14} color={m.color} />}
                <Icon size={14} color={m.color} />
                <span style={{ fontSize: 12, fontWeight: 700, color: m.color, flex: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {m.label}
                </span>
                <span style={{ fontSize: 11, color: `${m.color}80`, fontWeight: 600 }}>
                  {mDone}/{mTasks.length}
                </span>
              </div>

              {/* Task rows */}
              {isExp && (
                <div style={{ padding: '6px 12px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {mTasks.sort((a, b) => {
                    // Sort: overdue first, then by priority, then by id
                    const aOverdue = a.dueDate && a.dueDate < today && a.status !== 'DONE';
                    const bOverdue = b.dueDate && b.dueDate < today && b.status !== 'DONE';
                    if (aOverdue && !bOverdue) return -1;
                    if (!aOverdue && bOverdue) return 1;
                    const priOrder: Record<string,number> = { CRITICAL:0, HIGH:1, MEDIUM:2, LOW:3 };
                    return (priOrder[a.priority] ?? 2) - (priOrder[b.priority] ?? 2);
                  }).map(task => {
                    const statusDef = PWR_STATUS[task.status as PwrStatus];
                    const prioDef   = PWR_PRIORITY[task.priority as PwrPriority];
                    const isBlocked = blockedIds.has(task.id);
                    const isDone    = task.status === 'DONE';
                    const cl        = checklistMap[task.id];
                    const isOverdue = task.dueDate && task.dueDate < today && !isDone;
                    const isGate    = task.description?.includes('[GATE:') ?? false;
                    const isRecurring = task.description?.includes('[RECURRING:') ?? false;

                    return (
                      <Link key={task.id} href={`/pwr/tasks/${task.id}`} style={{ textDecoration: 'none' }}>
                        <div
                          style={{
                            display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                            background: isOverdue
                              ? 'rgba(239,68,68,0.05)'
                              : isDone
                                ? 'rgba(16,185,129,0.03)'
                                : 'rgba(255,255,255,0.02)',
                            border: `1px solid ${isOverdue ? 'rgba(239,68,68,0.2)' : isDone ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.04)'}`,
                            borderRadius: 8, opacity: isDone ? 0.6 : 1,
                            transition: 'all 0.15s',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background='rgba(249,115,22,0.07)'; e.currentTarget.style.borderColor='rgba(249,115,22,0.2)'; e.currentTarget.style.transform='translateX(2px)'; }}
                          onMouseLeave={e => { e.currentTarget.style.background=isOverdue?'rgba(239,68,68,0.05)':isDone?'rgba(16,185,129,0.03)':'rgba(255,255,255,0.02)'; e.currentTarget.style.borderColor=isOverdue?'rgba(239,68,68,0.2)':isDone?'rgba(16,185,129,0.1)':'rgba(255,255,255,0.04)'; e.currentTarget.style.transform='translateX(0)'; }}
                        >
                          <StatusIcon status={task.status} />
                          <span style={{ fontSize: 10, color: '#334155', width: 30, flexShrink: 0, fontWeight: 700 }}>#{task.id}</span>

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              fontSize: 13, fontWeight: isDone ? 400 : 500,
                              color: isDone ? '#94a3b8' : '#f1f5f9',
                              textDecoration: isDone ? 'line-through' : 'none',
                              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                            }}>
                              {isBlocked && <Lock size={9} style={{ marginRight: 4, color: '#ef4444', verticalAlign: 'middle' }} />}
                              {isGate && <Shield size={9} style={{ marginRight: 4, color: '#ef4444', verticalAlign: 'middle' }} />}
                              {isRecurring && <RefreshCw size={9} style={{ marginRight: 4, color: '#a5b4fc', verticalAlign: 'middle' }} />}
                              {task.title}
                            </div>
                            {cl && cl.total > 0 && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
                                <div style={{ width: 48, height: 2, background: 'rgba(255,255,255,0.07)', borderRadius: 99, overflow: 'hidden' }}>
                                  <div style={{ height: '100%', width: `${Math.round(cl.done/cl.total*100)}%`, background: cl.done===cl.total?'#10b981':'#f97316', borderRadius: 99 }} />
                                </div>
                                <span style={{ fontSize: 10, color: '#475569' }}>{cl.done}/{cl.total}</span>
                              </div>
                            )}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                            {task.dueDate && (
                              <span style={{ fontSize: 10, color: isOverdue ? '#ef4444' : '#475569', fontWeight: isOverdue ? 700 : 400 }}>
                                {isOverdue ? '⚠ ' : ''}{task.dueDate}
                              </span>
                            )}
                            <div style={{
                              fontSize: 10, fontWeight: 600,
                              color: statusDef?.color, background: `${statusDef?.color}15`,
                              padding: '2px 7px', borderRadius: 20,
                              border: `1px solid ${statusDef?.color}25`,
                            }}>
                              {statusDef?.label}
                            </div>
                            {task.priority !== 'MEDIUM' && prioDef && (
                              <div style={{ fontSize: 9, fontWeight: 700, color: prioDef.color, background: `${prioDef.color}15`, padding: '2px 6px', borderRadius: 6 }}>
                                {prioDef.label}
                              </div>
                            )}
                            <ArrowRight size={11} color="#334155" />
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
    </div>
  );
}
