'use client';

import { useState } from 'react';
import { ArrowLeft, Pencil, FileDown } from 'lucide-react';
import Link from 'next/link';
import type { PwrTask, PwrWorkLog, PwrTaskAuditLog, PwrStatus, PwrPriority } from '@/db/schema';
import { PWR_STATUS, PWR_CATEGORY, PWR_PRIORITY, VALID_TRANSITIONS, getTodayVN } from '@/lib/pwr/constants';
import { isReopen as checkReopen } from '@/lib/pwr/task-transitions';
import PwrStatusBadge from './PwrStatusBadge';
import PwrPriorityBadge from './PwrPriorityBadge';
import PwrTaskForm from './PwrTaskForm';
import PwrWorkLogTimeline from '@/components/pwr/work-log/PwrWorkLogTimeline';

interface Props {
  task:     PwrTask;
  workLogs: PwrWorkLog[];
  auditLog: PwrTaskAuditLog[];
}

export default function PwrTaskDetailClient({ task: initialTask, workLogs: initialLogs, auditLog: initialAudit }: Props) {
  const [task,     setTask]     = useState(initialTask);
  const [workLogs, setWorkLogs] = useState(initialLogs);
  const [showEdit, setShowEdit] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  async function handleExportPDF() {
    setIsExporting(true);
    try {
      const { jsPDF } = await import('jspdf');
      const html2canvas = (await import('html2canvas')).default;
      
      const pdfEl = document.getElementById('task-pdf-template');
      if (!pdfEl) return;
      
      pdfEl.style.display = 'block';
      const canvas = await html2canvas(pdfEl, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Phieu_Giao_Viec_${task.id}.pdf`);
      
      pdfEl.style.display = 'none';
    } catch (err) {
      console.error(err);
      alert('Có lỗi khi xuất PDF');
    } finally {
      setIsExporting(false);
    }
  }

  const category = PWR_CATEGORY[task.category as keyof typeof PWR_CATEGORY];
  const todayVN  = getTodayVN();
  const isOverdue = task.dueDate && task.dueDate < todayVN && task.status !== 'DONE' && task.status !== 'CANCELLED';
  const nextStatuses = VALID_TRANSITIONS[task.status as PwrStatus] || [];

  async function refresh() {
    try {
      const res = await fetch(`/api/pwr/tasks/${task.id}`);
      if (res.ok) {
        const d = await res.json();
        setTask(d.task);
        setWorkLogs(d.workLogs);
      }
    } catch {}
  }

  async function handleStatusChange(newStatus: string) {
    if (newStatus === 'WAITING' || newStatus === 'DEFERRED') { setShowEdit(true); return; }
    if (checkReopen(task.status as PwrStatus, newStatus as PwrStatus)) { setShowEdit(true); return; }
    try {
      const res = await fetch(`/api/pwr/tasks/${task.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ status: newStatus }),
      });
      if (res.ok) { const updated = await res.json(); setTask(updated); await refresh(); }
    } catch {}
  }

  return (
    <div className="page-container">
      {/* Back */}
      <div style={{ marginBottom: 16 }}>
        <Link href="/pwr/tasks" className="btn btn-ghost btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <ArrowLeft size={14} /> Danh sách
        </Link>
      </div>

      {/* Task Header Card */}
      <div className="card" style={{ padding: 20, marginBottom: 16, borderLeft: `4px solid ${PWR_STATUS[task.status as PwrStatus]?.color || '#374151'}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text)' }}>{task.title}</h1>
              {isOverdue && <span style={{ fontSize: 12, color: '#EF4444', fontWeight: 600 }}>⚠️ Quá hạn</span>}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
              <PwrStatusBadge status={task.status as PwrStatus} />
              <PwrPriorityBadge priority={task.priority as PwrPriority} />
              {category && <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{category.icon} {category.label}</span>}
            </div>
            {task.description && (
              <p style={{ fontSize: 14, color: 'var(--color-text-muted)', lineHeight: 1.5 }}>{task.description}</p>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost btn-icon" onClick={handleExportPDF} title="Xuất PDF phiếu giao việc" disabled={isExporting}>
              <FileDown size={16} />
            </button>
            <button className="btn btn-ghost btn-icon" onClick={() => setShowEdit(true)} title="Chỉnh sửa">
              <Pencil size={16} />
            </button>
          </div>
        </div>

        {/* Metadata grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginTop: 16, fontSize: 13 }}>
          {task.dueDate && (
            <div>
              <span style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>Deadline</span>
              <div style={{ color: isOverdue ? '#EF4444' : 'var(--color-text)', fontWeight: 600 }}>📅 {task.dueDate}</div>
            </div>
          )}
          {task.assignedTo && (
            <div>
              <span style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>Người liên quan</span>
              <div style={{ fontWeight: 600 }}>👤 {task.assignedTo}</div>
            </div>
          )}
          {task.waitingFor && task.status === 'WAITING' && (
            <div>
              <span style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>Đang chờ</span>
              <div style={{ color: '#8B5CF6', fontWeight: 600 }}>⏳ {task.waitingFor}</div>
            </div>
          )}
          {task.deferredTo && task.status === 'DEFERRED' && (
            <div>
              <span style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>Dời đến</span>
              <div style={{ fontWeight: 600 }}>📅 {task.deferredTo}</div>
            </div>
          )}
          {task.projectRef && (
            <div>
              <span style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>Dự án/Đơn hàng</span>
              <div style={{ fontWeight: 600 }}>🏗️ {task.projectRef}</div>
            </div>
          )}
          {task.result && (
            <div style={{ gridColumn: '1 / -1' }}>
              <span style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>Kết quả</span>
              <div style={{ color: '#10B981', fontWeight: 600 }}>✅ {task.result}</div>
            </div>
          )}
          {task.tags && task.tags.length > 0 && (
            <div style={{ gridColumn: '1 / -1' }}>
              <span style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>Tags</span>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 2 }}>
                {task.tags.map(tag => (
                  <span key={tag} style={{
                    fontSize: 10, fontWeight: 600, padding: '2px 8px',
                    borderRadius: 99, background: 'var(--color-surface-3)',
                    color: 'var(--color-text-muted)',
                  }}>
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Status transitions */}
        {nextStatuses.length > 0 && (
          <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: 'var(--color-text-muted)', alignSelf: 'center' }}>Chuyển trạng thái:</span>
            {(nextStatuses as PwrStatus[]).map(s => (
              <button
                key={s}
                className="btn btn-ghost btn-sm"
                onClick={() => handleStatusChange(s)}
                style={{ fontSize: 12, color: PWR_STATUS[s]?.color, borderColor: PWR_STATUS[s]?.color }}
              >
                {PWR_STATUS[s]?.icon} {PWR_STATUS[s]?.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Work Log Timeline */}
      <PwrWorkLogTimeline taskId={task.id} logs={workLogs} onRefresh={refresh} />

      {/* Edit modal */}
      {showEdit && (
        <PwrTaskForm
          task={task}
          onClose={() => setShowEdit(false)}
          onSaved={refresh}
        />
      )}

      {/* Hidden PDF Template */}
      <div id="task-pdf-template" style={{ display: 'none', width: '800px', padding: '40px', background: '#fff', color: '#111827', fontFamily: 'Arial, Helvetica, sans-serif' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px solid #1f2937', paddingBottom: 16, marginBottom: 24 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: '#111827', letterSpacing: '-0.5px' }}>PHIẾU GIAO VIỆC</h2>
            <p style={{ margin: '6px 0 0', fontSize: 14, color: '#4b5563' }}>Mã CV: <strong>#{task.id}</strong></p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ margin: 0, fontSize: 14, color: '#4b5563' }}>Ngày tạo: {task.createdAt ? new Date(task.createdAt).toLocaleDateString('vi-VN') : ''}</p>
          </div>
        </div>
        
        {/* Task Title */}
        <div style={{ marginBottom: 24, padding: '16px 20px', background: '#f8fafc', borderLeft: `6px solid ${PWR_STATUS[task.status as PwrStatus]?.color || '#3b82f6'}`, borderRadius: '4px 8px 8px 4px' }}>
          <h3 style={{ margin: 0, fontSize: 22, color: '#1e293b', lineHeight: 1.4 }}>{task.title}</h3>
        </div>
        
        {/* Metadata Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 28, fontSize: 14, color: '#111827' }}>
          <tbody>
            <tr>
              <td style={{ padding: '12px 16px', border: '1px solid #e2e8f0', background: '#f1f5f9', fontWeight: 600, width: '25%', color: '#334155' }}>Trạng thái</td>
              <td style={{ padding: '12px 16px', border: '1px solid #e2e8f0', color: '#0f172a' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: (PWR_STATUS[task.status as PwrStatus]?.color || '#94a3b8') + '20', color: PWR_STATUS[task.status as PwrStatus]?.color || '#475569', padding: '4px 10px', borderRadius: '99px', fontWeight: 700, fontSize: 13 }}>
                  {PWR_STATUS[task.status as PwrStatus]?.label}
                </span>
              </td>
            </tr>
            <tr>
              <td style={{ padding: '12px 16px', border: '1px solid #e2e8f0', background: '#f1f5f9', fontWeight: 600, color: '#334155' }}>Độ ưu tiên</td>
              <td style={{ padding: '12px 16px', border: '1px solid #e2e8f0', color: '#0f172a' }}>
                 <span style={{ display: 'inline-flex', alignItems: 'center', background: (PWR_PRIORITY[task.priority as PwrPriority]?.color || '#94a3b8') + '20', color: PWR_PRIORITY[task.priority as PwrPriority]?.color || '#475569', padding: '4px 10px', borderRadius: '99px', fontWeight: 700, fontSize: 13 }}>
                  {PWR_PRIORITY[task.priority as PwrPriority]?.label}
                </span>
              </td>
            </tr>
            <tr>
              <td style={{ padding: '12px 16px', border: '1px solid #e2e8f0', background: '#f1f5f9', fontWeight: 600, color: '#334155' }}>Hạn chót (Deadline)</td>
              <td style={{ padding: '12px 16px', border: '1px solid #e2e8f0', color: isOverdue ? '#ef4444' : '#0f172a', fontWeight: isOverdue ? 700 : 500 }}>
                {task.dueDate || 'Không thời hạn'} {isOverdue && '(Đã quá hạn)'}
              </td>
            </tr>
            <tr>
              <td style={{ padding: '12px 16px', border: '1px solid #e2e8f0', background: '#f1f5f9', fontWeight: 600, color: '#334155' }}>Người liên quan</td>
              <td style={{ padding: '12px 16px', border: '1px solid #e2e8f0', color: '#0f172a', fontWeight: 500 }}>{task.assignedTo || '-'}</td>
            </tr>
            <tr>
              <td style={{ padding: '12px 16px', border: '1px solid #e2e8f0', background: '#f1f5f9', fontWeight: 600, color: '#334155' }}>Dự án / Đơn hàng</td>
              <td style={{ padding: '12px 16px', border: '1px solid #e2e8f0', color: '#0f172a', fontWeight: 500 }}>{task.projectRef || '-'}</td>
            </tr>
            {task.tags && task.tags.length > 0 && (
              <tr>
                <td style={{ padding: '12px 16px', border: '1px solid #e2e8f0', background: '#f1f5f9', fontWeight: 600, color: '#334155' }}>Gắn thẻ (Tags)</td>
                <td style={{ padding: '12px 16px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {task.tags.map(tag => (
                      <span key={tag} style={{ background: '#e2e8f0', color: '#334155', padding: '2px 8px', borderRadius: '4px', fontSize: 12, fontWeight: 600 }}>#{tag}</span>
                    ))}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Description */}
        <div style={{ marginBottom: 24 }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: 16, color: '#0f172a', borderBottom: '2px solid #e2e8f0', paddingBottom: 6 }}>Nội dung chi tiết</h4>
          <div style={{ padding: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, minHeight: 100, whiteSpace: 'pre-wrap', fontSize: 14, color: '#1e293b', lineHeight: 1.6 }}>
            {task.description || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Không có nội dung mô tả chi tiết.</span>}
          </div>
        </div>

        {/* Result if any */}
        {task.result && (
          <div style={{ marginBottom: 24 }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: 16, color: '#166534', borderBottom: '2px solid #bbf7d0', paddingBottom: 6 }}>Kết quả thực hiện</h4>
            <div style={{ padding: '16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, minHeight: 60, whiteSpace: 'pre-wrap', fontSize: 14, color: '#166534', lineHeight: 1.6 }}>
              {task.result}
            </div>
          </div>
        )}

        {/* Signatures */}
        <div style={{ marginTop: 60, display: 'flex', justifyContent: 'space-around', fontSize: 15, color: '#0f172a' }}>
          <div style={{ textAlign: 'center' }}>
            <strong style={{ display: 'block' }}>Người giao việc</strong>
            <span style={{ fontSize: 13, color: '#64748b' }}>(Ký và ghi rõ họ tên)</span>
            <div style={{ marginTop: 80, borderBottom: '1px dashed #cbd5e1', width: 180, margin: '80px auto 0' }}></div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <strong style={{ display: 'block' }}>Người nhận việc</strong>
            <span style={{ fontSize: 13, color: '#64748b' }}>(Ký và ghi rõ họ tên)</span>
            <div style={{ marginTop: 80, borderBottom: '1px dashed #cbd5e1', width: 180, margin: '80px auto 0' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
}
