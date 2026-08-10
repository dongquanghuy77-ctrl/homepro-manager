'use client';

import { useMemo, useState } from 'react';
import { FileDown, Loader2 } from 'lucide-react';
import type { Task } from '@/db/schema';
import { TASK_STATUS } from '@/lib/constants';
import type { TaskStatus } from '@/db/schema';
import { formatDate } from '@/lib/utils';
import { exportGanttPdf } from '@/lib/gantt-pdf';

// ============================================================
// GANTT CHART COMPONENT
// ============================================================

interface GanttChartProps {
  tasks:              Task[];
  projectStartDate?:  string | null;
  projectDeadline?:   string | null;
  projectName?:       string;   // Dùng cho tiêu đề PDF
  projectCode?:       string;   // Mã dự án
  exportedBy?:        string;   // Người xuất
}

export default function GanttChart({
  tasks,
  projectStartDate,
  projectDeadline,
  projectName  = 'Dự án',
  projectCode,
  exportedBy,
}: GanttChartProps) {
  const [exporting, setExporting] = useState(false);

  function handleExportPdf() {
    setExporting(true);
    // setTimeout để UI cập nhật trước khi lò chạy generate
    setTimeout(() => {
      try {
        exportGanttPdf(tasks, {
          projectName,
          projectCode,
          projectStartDate,
          projectDeadline,
          exportedBy,
        });
      } finally {
        setExporting(false);
      }
    }, 50);
  }

  // Find date range across all tasks
  const { minDate, maxDate, totalDays, weeks } = useMemo(() => {
    const dates = tasks
      .flatMap((t) => [t.startDate, t.endDate])
      .filter(Boolean) as string[];

    if (projectStartDate) dates.push(projectStartDate);
    if (projectDeadline) dates.push(projectDeadline);

    if (dates.length === 0) {
      const today = new Date();
      const end = new Date(today);
      end.setDate(end.getDate() + 90);
      return {
        minDate: today,
        maxDate: end,
        totalDays: 90,
        weeks: [] as Date[],
      };
    }

    const sorted = dates.map((d) => new Date(d)).sort((a, b) => a.getTime() - b.getTime());
    const min = new Date(sorted[0]);
    min.setDate(min.getDate() - 3); // Pad left
    const max = new Date(sorted[sorted.length - 1]);
    max.setDate(max.getDate() + 7); // Pad right

    const totalDays = Math.ceil((max.getTime() - min.getTime()) / (1000 * 60 * 60 * 24));

    // Build week markers
    const weeks: Date[] = [];
    const cur = new Date(min);
    while (cur <= max) {
      weeks.push(new Date(cur));
      cur.setDate(cur.getDate() + 7);
    }

    return { minDate: min, maxDate: max, totalDays, weeks };
  }, [tasks, projectStartDate, projectDeadline]);

  function getLeftPercent(dateStr: string | null | undefined) {
    if (!dateStr) return 0;
    const d = new Date(dateStr);
    const diff = d.getTime() - minDate.getTime();
    return Math.max(0, (diff / (totalDays * 86400000)) * 100);
  }

  function getWidthPercent(startStr: string | null | undefined, endStr: string | null | undefined) {
    const start = startStr ? new Date(startStr) : minDate;
    const end = endStr ? new Date(endStr) : maxDate;
    const days = Math.max(1, (end.getTime() - start.getTime()) / 86400000);
    return (days / totalDays) * 100;
  }

  const today = new Date();
  const todayLeft = getLeftPercent(today.toISOString().split('T')[0]);

  // Group tasks by category
  const byCategory = tasks.reduce((acc, t) => {
    const cat = t.category || 'Khác';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(t);
    return acc;
  }, {} as Record<string, Task[]>);

  const STATUS_COLORS: Record<TaskStatus, string> = {
    NOT_STARTED: '#4B5563',
    IN_PROGRESS: '#F59E0B',
    COMPLETED: '#10B981',
    PAUSED: '#8B5CF6',
    OVERDUE: '#EF4444',
  };

  return (
    <div className="gantt-container">
      {/* Header: Week labels */}
      <div className="gantt-layout">
        {/* Left panel */}
        <div className="gantt-left-panel">
          <div className="gantt-header-cell">Hạng mục / Công việc</div>
        </div>

        {/* Right panel - timeline */}
        <div className="gantt-right-panel">
          <div className="gantt-header-timeline">
            {weeks.map((w, i) => (
              <div
                key={i}
                className="gantt-week-label"
                style={{ left: `${getLeftPercent(w.toISOString().split('T')[0])}%` }}
              >
                {w.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tasks grouped by category */}
      {Object.entries(byCategory).map(([category, catTasks]) => (
        <div key={category}>
          {/* Category group header */}
          <div className="gantt-layout gantt-group-header">
            <div className="gantt-left-panel">
              <span className="gantt-group-label">{category}</span>
            </div>
            <div className="gantt-right-panel" style={{ position: 'relative', height: 28 }}>
              {/* Grid lines */}
              {weeks.map((w, i) => (
                <div
                  key={i}
                  className="gantt-gridline"
                  style={{ left: `${getLeftPercent(w.toISOString().split('T')[0])}%` }}
                />
              ))}
            </div>
          </div>

          {/* Task rows */}
          {catTasks.map((task) => {
            const status = (task.status as TaskStatus) || 'NOT_STARTED';
            const barColor = STATUS_COLORS[status];
            const left = getLeftPercent(task.startDate || task.endDate);
            const width = getWidthPercent(task.startDate, task.endDate);
            const isCompleted = status === 'COMPLETED';

            return (
              <div key={task.id} className="gantt-layout gantt-row">
                {/* Label */}
                <div className="gantt-left-panel">
                  <div className="gantt-task-label">
                    <span
                      className="gantt-status-dot"
                      style={{ background: barColor }}
                    />
                    <span className="gantt-task-name" title={task.title}>
                      {task.title}
                    </span>
                    {task.assignee && (
                      <span className="gantt-task-assignee">{task.assignee}</span>
                    )}
                  </div>
                </div>

                {/* Timeline bar */}
                <div className="gantt-right-panel" style={{ position: 'relative' }}>
                  {/* Grid lines */}
                  {weeks.map((w, i) => (
                    <div
                      key={i}
                      className="gantt-gridline"
                      style={{ left: `${getLeftPercent(w.toISOString().split('T')[0])}%` }}
                    />
                  ))}

                  {/* Today line */}
                  {todayLeft > 0 && todayLeft < 100 && (
                    <div className="gantt-today-line" style={{ left: `${todayLeft}%` }} />
                  )}

                  {/* Task bar */}
                  {(task.startDate || task.endDate) && (
                    <div
                      className="gantt-bar-wrap"
                      style={{ left: `${left}%`, width: `${Math.max(width, 1.5)}%` }}
                    >
                      <div
                        className="gantt-bar"
                        style={{
                          background: isCompleted
                            ? 'linear-gradient(90deg, #059669, #10B981)'
                            : `linear-gradient(90deg, ${barColor}CC, ${barColor})`,
                          boxShadow: `0 2px 8px ${barColor}40`,
                        }}
                        title={`${task.title} | ${formatDate(task.startDate)} → ${formatDate(task.endDate)}`}
                      >
                        {/* Progress overlay */}
                        <div
                          className="gantt-bar-progress"
                          style={{ width: `${task.progress}%` }}
                        />
                        <span className="gantt-bar-label">{task.title}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}

      {/* Legend + Export PDF */}
      <div className="gantt-legend">
        <div className="flex items-center gap-4" style={{ fontSize: 11, color: 'var(--color-text-muted)', flex: 1 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 2, height: 12, background: '#F59E0B', display: 'inline-block', borderRadius: 2 }} />
            Hôm nay
          </span>
          {Object.entries(STATUS_COLORS).map(([k, c]) => (
            <span key={k} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 10, height: 10, background: c, display: 'inline-block', borderRadius: 2 }} />
              {TASK_STATUS[k as TaskStatus]?.label}
            </span>
          ))}
        </div>

        {/* Nút xuất PDF */}
        <button
          id="gantt-export-pdf-btn"
          onClick={handleExportPdf}
          disabled={exporting || tasks.length === 0}
          title="Xuất sơ đồ Gantt ra file PDF báo cáo"
          style={{
            display:        'flex',
            alignItems:     'center',
            gap:            6,
            padding:        '6px 14px',
            background:     exporting ? 'var(--color-surface-raised)' : 'linear-gradient(135deg,#2563EB,#7C3AED)',
            border:         'none',
            borderRadius:   7,
            color:          '#fff',
            fontWeight:     700,
            fontSize:       12,
            cursor:         exporting ? 'wait' : 'pointer',
            boxShadow:      '0 2px 10px #2563EB44',
            transition:     'all 0.2s',
            whiteSpace:     'nowrap',
            flexShrink:     0,
          }}
          onMouseEnter={(e) => {
            if (!exporting) (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
          }}
        >
          {exporting
            ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
            : <FileDown size={14} />}
          {exporting ? 'Đang tạo...' : 'Xuất PDF'}
        </button>
      </div>
    </div>
  );
}
