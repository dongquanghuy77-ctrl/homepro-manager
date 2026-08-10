// src/lib/gantt-pdf.ts
// ══════════════════════════════════════════════════════════════════════════════
// Gantt PDF Export — Tạo HTML print-ready và mở cửa sổ in
//
// Chiến lược: Generate HTML thuần → window.open() → window.print()
//   ✅ Hỗ trợ Vietnamese hoàn toàn (browser tự render font)
//   ✅ Vector quality (không bị vỡ ảnh như canvas-capture)
//   ✅ Không cần thư viện ngoài (no jsPDF, html2canvas)
//   ✅ A4 Landscape, header chuyên nghiệp, footer ngày xuất
//   ✅ Hoạt động trên Vercel (client-side only)
// ══════════════════════════════════════════════════════════════════════════════

import type { Task, TaskStatus } from '@/db/schema';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
export interface GanttPdfOptions {
  projectName:      string;
  projectCode?:     string;
  projectStartDate?: string | null;
  projectDeadline?:  string | null;
  exportedBy?:      string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Status config
// ─────────────────────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; bg: string }> = {
  NOT_STARTED: { label: 'Chưa bắt đầu', color: '#6B7280', bg: '#6B728022' },
  IN_PROGRESS:  { label: 'Đang thực hiện', color: '#F59E0B', bg: '#F59E0B22' },
  COMPLETED:    { label: 'Hoàn thành',    color: '#10B981', bg: '#10B98122' },
  PAUSED:       { label: 'Tạm dừng',      color: '#8B5CF6', bg: '#8B5CF622' },
  OVERDUE:      { label: 'Trễ hạn',       color: '#EF4444', bg: '#EF444422' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Date helpers
// ─────────────────────────────────────────────────────────────────────────────
function parseDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function fmtDate(s: string | null | undefined): string {
  if (!s) return '—';
  const d = parseDate(s);
  if (!d) return '—';
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtDateShort(d: Date): string {
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function daysBetween(a: Date, b: Date): number {
  return Math.ceil((b.getTime() - a.getTime()) / 86400000);
}

// ─────────────────────────────────────────────────────────────────────────────
// Build date range and week markers
// ─────────────────────────────────────────────────────────────────────────────
interface DateRange {
  minDate:   Date;
  maxDate:   Date;
  totalDays: number;
  weeks:     Date[];
}

function buildDateRange(tasks: Task[], opts: GanttPdfOptions): DateRange {
  const dates: Date[] = [];
  tasks.forEach((t) => {
    if (t.startDate) dates.push(new Date(t.startDate));
    if (t.endDate)   dates.push(new Date(t.endDate));
  });
  if (opts.projectStartDate) dates.push(new Date(opts.projectStartDate));
  if (opts.projectDeadline)  dates.push(new Date(opts.projectDeadline));

  let minDate: Date;
  let maxDate: Date;

  if (dates.length === 0) {
    minDate = new Date();
    maxDate = addDays(minDate, 90);
  } else {
    const sorted = dates.sort((a, b) => a.getTime() - b.getTime());
    minDate = addDays(sorted[0], -3);
    maxDate = addDays(sorted[sorted.length - 1], 7);
  }

  const totalDays = Math.max(1, daysBetween(minDate, maxDate));
  const weeks: Date[] = [];
  const cur = new Date(minDate);
  while (cur <= maxDate) {
    weeks.push(new Date(cur));
    cur.setDate(cur.getDate() + 7);
  }

  return { minDate, maxDate, totalDays, weeks };
}

function leftPct(dateStr: string | null | undefined, range: DateRange): number {
  if (!dateStr) return 0;
  const d = parseDate(dateStr);
  if (!d) return 0;
  return Math.max(0, Math.min(100, (daysBetween(range.minDate, d) / range.totalDays) * 100));
}

function widthPct(startStr: string | null | undefined, endStr: string | null | undefined, range: DateRange): number {
  const start = parseDate(startStr) ?? range.minDate;
  const end   = parseDate(endStr)   ?? range.maxDate;
  const days  = Math.max(1, daysBetween(start, end));
  return Math.min(100, (days / range.totalDays) * 100);
}

// ─────────────────────────────────────────────────────────────────────────────
// Generate the full HTML document
// ─────────────────────────────────────────────────────────────────────────────
export function generateGanttPdfHtml(tasks: Task[], opts: GanttPdfOptions): string {
  const range     = buildDateRange(tasks, opts);
  const today     = new Date();
  const todayLeft = leftPct(today.toISOString().split('T')[0], range);
  const now       = today.toLocaleString('vi-VN');

  // Group by category
  const byCategory = tasks.reduce((acc, t) => {
    const cat = t.category || 'Khác';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(t);
    return acc;
  }, {} as Record<string, Task[]>);

  const categories = Object.keys(byCategory);

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = {
    total:      tasks.length,
    completed:  tasks.filter((t) => t.status === 'COMPLETED').length,
    inProgress: tasks.filter((t) => t.status === 'IN_PROGRESS').length,
    overdue:    tasks.filter((t) => t.status === 'OVERDUE').length,
    notStarted: tasks.filter((t) => t.status === 'NOT_STARTED').length,
  };
  const pctDone = stats.total ? Math.round((stats.completed / stats.total) * 100) : 0;

  // ── Week header cells ──────────────────────────────────────────────────────
  const weekHeaderCells = range.weeks.map((w) => {
    const pct = leftPct(w.toISOString().split('T')[0], range);
    return `<div class="week-label" style="left:${pct.toFixed(2)}%">${fmtDateShort(w)}</div>`;
  }).join('');

  // ── Gantt rows ─────────────────────────────────────────────────────────────
  let ganttRows = '';
  categories.forEach((cat) => {
    const catTasks = byCategory[cat];

    // Category header row
    ganttRows += `
      <div class="gantt-row group-header">
        <div class="gantt-left">
          <span class="cat-label">📁 ${cat}</span>
        </div>
        <div class="gantt-right">
          ${range.weeks.map((w) => `<div class="gridline" style="left:${leftPct(w.toISOString().split('T')[0], range).toFixed(2)}%"></div>`).join('')}
        </div>
      </div>`;

    // Task rows
    catTasks.forEach((task, idx) => {
      const status    = (task.status as TaskStatus) || 'NOT_STARTED';
      const cfg       = STATUS_CONFIG[status];
      const left      = leftPct(task.startDate || task.endDate, range);
      const width     = widthPct(task.startDate, task.endDate, range);
      const hasBar    = !!(task.startDate || task.endDate);
      const progress  = task.progress ?? 0;
      const isEven    = idx % 2 === 0;

      ganttRows += `
        <div class="gantt-row task-row ${isEven ? 'even' : 'odd'}">
          <div class="gantt-left">
            <div class="task-info">
              <span class="status-dot" style="background:${cfg.color}"></span>
              <span class="task-name" title="${task.title}">${task.title}</span>
              ${task.assignee ? `<span class="task-assignee">${task.assignee}</span>` : ''}
            </div>
            <div class="task-dates">
              ${fmtDate(task.startDate)} → ${fmtDate(task.endDate)}
            </div>
          </div>
          <div class="gantt-right" style="position:relative">
            ${range.weeks.map((w) => `<div class="gridline" style="left:${leftPct(w.toISOString().split('T')[0], range).toFixed(2)}%"></div>`).join('')}
            ${todayLeft > 0 && todayLeft < 100 ? `<div class="today-line" style="left:${todayLeft.toFixed(2)}%"></div>` : ''}
            ${hasBar ? `
              <div class="bar-wrap" style="left:${left.toFixed(2)}%;width:${Math.max(width, 1.5).toFixed(2)}%">
                <div class="bar" style="background:linear-gradient(90deg,${cfg.color}CC,${cfg.color});box-shadow:0 1px 4px ${cfg.color}50">
                  <div class="bar-progress" style="width:${progress}%"></div>
                  <span class="bar-label">${task.title}${progress > 0 ? ` (${progress}%)` : ''}</span>
                </div>
              </div>` : ''}
          </div>
        </div>`;
    });
  });

  // ── Legend ─────────────────────────────────────────────────────────────────
  const legendHtml = Object.entries(STATUS_CONFIG).map(([, cfg]) =>
    `<span class="legend-item"><span class="legend-dot" style="background:${cfg.color}"></span>${cfg.label}</span>`
  ).join('');

  // ── Stats table ────────────────────────────────────────────────────────────
  const statsHtml = `
    <div class="stats-row">
      <div class="stat-box">
        <div class="stat-val">${stats.total}</div>
        <div class="stat-lbl">Tổng công việc</div>
      </div>
      <div class="stat-box completed">
        <div class="stat-val">${stats.completed}</div>
        <div class="stat-lbl">Hoàn thành</div>
      </div>
      <div class="stat-box inprogress">
        <div class="stat-val">${stats.inProgress}</div>
        <div class="stat-lbl">Đang thực hiện</div>
      </div>
      <div class="stat-box overdue">
        <div class="stat-val">${stats.overdue}</div>
        <div class="stat-lbl">Trễ hạn</div>
      </div>
      <div class="stat-box notstarted">
        <div class="stat-val">${stats.notStarted}</div>
        <div class="stat-lbl">Chưa bắt đầu</div>
      </div>
      <div class="stat-box done-pct">
        <div class="stat-val">${pctDone}%</div>
        <div class="stat-lbl">Tiến độ chung</div>
      </div>
    </div>`;

  // ── Full HTML ──────────────────────────────────────────────────────────────
  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <title>Gantt Chart — ${opts.projectName}</title>
  <style>
    /* ── Reset ── */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    /* ── Page ── */
    @page { size: A4 landscape; margin: 12mm 10mm; }
    body {
      font-family: 'Segoe UI', 'Arial', sans-serif;
      font-size: 10px;
      color: #1e293b;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* ── Header ── */
    .report-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 10px;
      border-bottom: 3px solid #2563EB;
      margin-bottom: 12px;
    }
    .company-brand {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .brand-logo {
      width: 40px; height: 40px;
      background: linear-gradient(135deg, #2563EB, #7C3AED);
      border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      color: white; font-size: 16px; font-weight: 900;
    }
    .brand-name { font-size: 16px; font-weight: 800; color: #2563EB; }
    .brand-sub  { font-size: 9px; color: #64748b; }
    .report-title { text-align: center; }
    .report-title h1 { font-size: 15px; font-weight: 800; color: #1e293b; }
    .report-title h2 { font-size: 12px; font-weight: 600; color: #2563EB; margin-top: 2px; }
    .report-meta { text-align: right; font-size: 9px; color: #64748b; line-height: 1.7; }

    /* ── Stats ── */
    .stats-row {
      display: flex; gap: 8px; margin-bottom: 12px;
    }
    .stat-box {
      flex: 1; border-radius: 6px; padding: 6px 10px;
      border: 1px solid #e2e8f0; background: #f8fafc;
      text-align: center;
    }
    .stat-box.completed   { border-color: #10B98144; background: #10B98111; }
    .stat-box.inprogress  { border-color: #F59E0B44; background: #F59E0B11; }
    .stat-box.overdue     { border-color: #EF444444; background: #EF444411; }
    .stat-box.notstarted  { border-color: #6B728044; background: #6B728011; }
    .stat-box.done-pct    { border-color: #2563EB44; background: #2563EB11; }
    .stat-val { font-size: 18px; font-weight: 800; color: #1e293b; }
    .stat-lbl { font-size: 8px; color: #64748b; margin-top: 1px; }

    /* ── Gantt container ── */
    .gantt-wrap {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      overflow: hidden;
      margin-bottom: 12px;
    }

    /* ── Header timeline ── */
    .gantt-header {
      display: flex;
      background: #1e293b;
      color: #fff;
    }
    .gantt-header .gantt-left  { background: #0f172a; }
    .gantt-header .gantt-right { position: relative; }
    .week-label {
      position: absolute;
      top: 50%; transform: translateY(-50%);
      font-size: 8px; white-space: nowrap;
      color: #94a3b8; padding-left: 2px;
    }

    /* ── Shared columns ── */
    .gantt-left  { width: 220px; min-width: 220px; max-width: 220px; flex-shrink: 0; padding: 4px 8px; border-right: 1px solid #334155; }
    .gantt-right { flex: 1; height: 100%; position: relative; overflow: hidden; }

    /* ── Rows ── */
    .gantt-row { display: flex; align-items: center; border-bottom: 1px solid #e2e8f0; }
    .gantt-row:last-child { border-bottom: none; }
    .gantt-row .gantt-right { height: 34px; }

    .group-header { background: #1e293b !important; }
    .group-header .gantt-left { border-right-color: #334155; padding: 5px 8px; }
    .cat-label { font-size: 9px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; }

    .task-row.even { background: #f8fafc; }
    .task-row.odd  { background: #fff; }

    /* ── Task label ── */
    .task-info { display: flex; align-items: center; gap: 4px; margin-bottom: 1px; }
    .status-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
    .task-name  { font-size: 9px; font-weight: 600; color: #1e293b; max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .task-assignee { font-size: 8px; color: #94a3b8; background: #e2e8f0; border-radius: 3px; padding: 0 3px; flex-shrink: 0; }
    .task-dates { font-size: 7.5px; color: #94a3b8; }

    /* ── Grid ── */
    .gridline {
      position: absolute; top: 0; bottom: 0; width: 1px;
      background: #e2e8f040;
      pointer-events: none;
    }
    .today-line {
      position: absolute; top: 0; bottom: 0; width: 2px;
      background: #F59E0B;
      pointer-events: none;
      z-index: 2;
    }

    /* ── Bars ── */
    .bar-wrap {
      position: absolute; top: 50%; transform: translateY(-50%);
      height: 20px; min-width: 4px;
    }
    .bar {
      width: 100%; height: 100%;
      border-radius: 4px; position: relative;
      overflow: hidden;
    }
    .bar-progress {
      position: absolute; top: 0; left: 0; bottom: 0;
      background: rgba(255,255,255,0.25); border-radius: 4px 0 0 4px;
    }
    .bar-label {
      position: absolute; inset: 0;
      display: flex; align-items: center;
      padding: 0 5px;
      font-size: 7.5px; font-weight: 600; color: #fff;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }

    /* ── Legend ── */
    .legend-row {
      display: flex; align-items: center; gap: 14px;
      font-size: 8.5px; color: #64748b;
      margin-bottom: 8px; flex-wrap: wrap;
    }
    .legend-item { display: flex; align-items: center; gap: 4px; }
    .legend-dot  { width: 8px; height: 8px; border-radius: 2px; flex-shrink: 0; }
    .legend-today { display: flex; align-items: center; gap: 4px; }
    .legend-today-line { width: 2px; height: 12px; background: #F59E0B; border-radius: 2px; }

    /* ── Task list table ── */
    .task-table { width: 100%; border-collapse: collapse; font-size: 8.5px; margin-top: 8px; }
    .task-table th {
      background: #1e293b; color: #e2e8f0;
      padding: 5px 8px; text-align: left;
      font-weight: 700; letter-spacing: 0.3px;
    }
    .task-table td { padding: 4px 8px; border-bottom: 1px solid #e2e8f0; color: #334155; }
    .task-table tr:nth-child(even) td { background: #f8fafc; }
    .status-chip {
      display: inline-block; padding: 1px 5px; border-radius: 3px;
      font-size: 7.5px; font-weight: 700;
    }

    /* ── Footer ── */
    .report-footer {
      margin-top: 8px;
      border-top: 1px solid #e2e8f0;
      padding-top: 8px;
      display: flex; justify-content: space-between; align-items: center;
      font-size: 8px; color: #94a3b8;
    }

    /* ── Section title ── */
    .section-title {
      font-size: 10px; font-weight: 700; color: #2563EB;
      margin-bottom: 6px; padding-bottom: 3px;
      border-bottom: 1px solid #dbeafe;
    }

    /* ── Print only ── */
    @media screen {
      body { padding: 24px; max-width: 1200px; margin: 0 auto; background: #f1f5f9; }
      .page-wrap { background: #fff; padding: 20px 24px; border-radius: 12px; box-shadow: 0 4px 24px #0002; }
      .print-btn {
        position: fixed; top: 16px; right: 16px;
        background: #2563EB; color: white; border: none;
        padding: 10px 20px; border-radius: 8px; cursor: pointer;
        font-size: 14px; font-weight: 700;
        box-shadow: 0 4px 12px #2563EB44;
        display: flex; align-items: center; gap: 8px;
      }
      .print-btn:hover { background: #1d4ed8; }
    }
    @media print {
      body { background: white; padding: 0; }
      .page-wrap { padding: 0; }
      .print-btn { display: none !important; }
    }
  </style>
</head>
<body>
  <button class="print-btn" onclick="window.print()">🖨️ In / Lưu PDF</button>

  <div class="page-wrap">
    <!-- ── Header ── -->
    <div class="report-header">
      <div class="company-brand">
        <div class="brand-logo">H</div>
        <div>
          <div class="brand-name">HomePro Manager</div>
          <div class="brand-sub">Hệ thống quản lý sản xuất nội thất</div>
        </div>
      </div>
      <div class="report-title">
        <h1>BÁO CÁO TIẾN ĐỘ DỰ ÁN</h1>
        <h2>${opts.projectName}${opts.projectCode ? ` — ${opts.projectCode}` : ''}</h2>
      </div>
      <div class="report-meta">
        <div>Ngày xuất: <strong>${now}</strong></div>
        ${opts.exportedBy ? `<div>Người xuất: <strong>${opts.exportedBy}</strong></div>` : ''}
        ${opts.projectStartDate ? `<div>Ngày KĐ: <strong>${fmtDate(opts.projectStartDate)}</strong></div>` : ''}
        ${opts.projectDeadline  ? `<div>Bàn giao: <strong>${fmtDate(opts.projectDeadline)}</strong></div>` : ''}
      </div>
    </div>

    <!-- ── Stats ── -->
    ${statsHtml}

    <!-- ── Gantt ── -->
    <div class="section-title">📊 Sơ đồ Gantt tiến độ công việc</div>
    <div class="gantt-wrap">
      <!-- Header row -->
      <div class="gantt-header" style="height:28px">
        <div class="gantt-left" style="display:flex;align-items:center">
          <span style="font-size:8px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px">Hạng mục / Công việc</span>
        </div>
        <div class="gantt-right" style="position:relative;height:28px">
          ${weekHeaderCells}
        </div>
      </div>
      <!-- Task rows -->
      ${ganttRows}
    </div>

    <!-- ── Legend ── -->
    <div class="legend-row">
      <div class="legend-today"><div class="legend-today-line"></div>Hôm nay (${fmtDateShort(today)})</div>
      ${legendHtml}
    </div>

    <!-- ── Task detail table ── -->
    <div class="section-title">📋 Danh sách công việc chi tiết</div>
    <table class="task-table">
      <thead>
        <tr>
          <th style="width:30px">STT</th>
          <th style="width:180px">Tên công việc</th>
          <th style="width:100px">Hạng mục</th>
          <th style="width:70px">Phụ trách</th>
          <th style="width:75px">Ngày bắt đầu</th>
          <th style="width:75px">Ngày kết thúc</th>
          <th style="width:80px">Trạng thái</th>
          <th style="width:50px;text-align:right">Tiến độ</th>
        </tr>
      </thead>
      <tbody>
        ${tasks.map((t, i) => {
          const status = (t.status as TaskStatus) || 'NOT_STARTED';
          const cfg = STATUS_CONFIG[status];
          return `<tr>
            <td style="text-align:center;color:#94a3b8">${i + 1}</td>
            <td style="font-weight:600">${t.title}</td>
            <td style="color:#64748b">${t.category || '—'}</td>
            <td style="color:#64748b">${t.assignee || '—'}</td>
            <td>${fmtDate(t.startDate)}</td>
            <td>${fmtDate(t.endDate)}</td>
            <td>
              <span class="status-chip" style="color:${cfg.color};background:${cfg.bg};border:1px solid ${cfg.color}44">
                ${cfg.label}
              </span>
            </td>
            <td style="text-align:right;font-weight:700;color:${(t.progress ?? 0) === 100 ? '#10B981' : '#1e293b'}">${t.progress ?? 0}%</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>

    <!-- ── Footer ── -->
    <div class="report-footer">
      <span>HomePro Manager — Hệ thống Quản lý Sản xuất Nội thất</span>
      <span>${opts.projectName} · Xuất lúc ${now}</span>
      <span>Tổng ${tasks.length} công việc · Hoàn thành ${pctDone}%</span>
    </div>
  </div>

  <script>
    // Auto-trigger print dialog when opened
    window.addEventListener('load', function() {
      // Small delay for fonts to load
      setTimeout(function() {
        // Only auto-print in popup windows (not direct URL navigation)
        if (window.opener) window.print();
      }, 800);
    });
  </script>
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export function: open print window
// ─────────────────────────────────────────────────────────────────────────────
export function exportGanttPdf(tasks: Task[], opts: GanttPdfOptions): void {
  if (tasks.length === 0) {
    alert('Không có công việc nào để xuất PDF. Vui lòng thêm công việc trước.');
    return;
  }

  const html = generateGanttPdfHtml(tasks, opts);

  // Open in new window
  const win = window.open('', '_blank', 'width=1200,height=800,scrollbars=yes');
  if (!win) {
    alert('Trình duyệt đã chặn cửa sổ popup. Vui lòng cho phép popup và thử lại.');
    return;
  }

  win.document.open();
  win.document.write(html);
  win.document.close();
}
