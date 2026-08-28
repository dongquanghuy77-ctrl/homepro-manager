"use client";
import Link from "next/link";
import { useState } from "react";
import type { FocusReport } from "@/lib/pwr/reporting";
import type { PwrTask } from "@/db/schema";

const PRIO_COLOR: Record<string, string> = {
  URGENT: "#ef4444", HIGH: "#f97316", MEDIUM: "#f59e0b", LOW: "#64748b",
};
const PRIO_LABEL: Record<string, string> = {
  URGENT: "KHẨN", HIGH: "CAO", MEDIUM: "TB", LOW: "THẤP",
};
const STATUS_LABEL: Record<string, string> = {
  TODO: "Cần làm", IN_PROGRESS: "Đang làm", WAITING: "Đang chờ",
  INBOX: "Hộp thư", DONE: "Xong", CANCELLED: "Huỷ",
};

function TaskRow({ task, highlight }: { task: PwrTask; highlight?: string }) {
  const pc = PRIO_COLOR[task.priority ?? ""] ?? "#64748b";
  return (
    <Link href={`/pwr/tasks/${task.id}`} style={{ textDecoration: "none" }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "10px 14px", marginBottom: 4,
        background: highlight === "red" ? "rgba(239,68,68,0.06)" : "rgba(255,255,255,0.03)",
        border: `1px solid ${highlight === "red" ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.07)"}`,
        borderRadius: 9, transition: "all 0.15s", cursor: "pointer",
      }}
        onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.07)"; e.currentTarget.style.transform = "translateX(3px)"; }}
        onMouseLeave={e => { e.currentTarget.style.background = highlight === "red" ? "rgba(239,68,68,0.06)" : "rgba(255,255,255,0.03)"; e.currentTarget.style.transform = "translateX(0)"; }}
      >
        <span style={{ fontSize: 10, fontWeight: 700, color: pc, background: `${pc}18`, padding: "2px 7px", borderRadius: 20, flexShrink: 0 }}>
          {PRIO_LABEL[task.priority ?? ""] ?? task.priority}
        </span>
        <span style={{ flex: 1, fontSize: 13, color: "#f1f5f9", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {task.title}
        </span>
        {task.projectRef && (
          <span style={{ fontSize: 10, color: "#60a5fa", background: "rgba(96,165,250,0.1)", padding: "2px 7px", borderRadius: 20, flexShrink: 0 }}>
            {task.projectRef.length > 16 ? task.projectRef.slice(0, 16) + "…" : task.projectRef}
          </span>
        )}
        {task.dueDate && (
          <span style={{ fontSize: 10, color: highlight === "red" ? "#ef4444" : "#475569", fontWeight: highlight === "red" ? 700 : 400, flexShrink: 0 }}>
            {highlight === "red" ? "⚠ " : "📅 "}{task.dueDate}
          </span>
        )}
        <span style={{ fontSize: 10, color: "#475569", flexShrink: 0 }}>
          {STATUS_LABEL[task.status] ?? task.status}
        </span>
        <span style={{ color: "#334155", fontSize: 12 }}>→</span>
      </div>
    </Link>
  );
}

function Section({ title, color, count, tasks, highlight, emptyText }: {
  title: string; color: string; count: number; tasks: PwrTask[];
  highlight?: string; emptyText: string;
}) {
  const [expanded, setExpanded] = useState(true);
  return (
    <div style={{ marginBottom: 20 }}>
      <div
        onClick={() => setExpanded(p => !p)}
        style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", cursor: "pointer",
          background: `${color}10`, border: `1px solid ${color}25`, borderRadius: 10, marginBottom: 8 }}
      >
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: color, flexShrink: 0, boxShadow: `0 0 6px ${color}` }} />
        <span style={{ fontSize: 13, fontWeight: 700, color, flex: 1 }}>{title}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color, background: `${color}20`, padding: "2px 9px", borderRadius: 20 }}>{count}</span>
        <span style={{ color: "#475569", fontSize: 12 }}>{expanded ? "▲" : "▼"}</span>
      </div>
      {expanded && (
        tasks.length === 0
          ? <p style={{ fontSize: 12, color: "#475569", paddingLeft: 16 }}>{emptyText}</p>
          : tasks.map(t => <TaskRow key={t.id} task={t} highlight={highlight} />)
      )}
    </div>
  );
}

export default function PwrFocusClient({ report }: { report: FocusReport }) {
  const dayNames = ["Chủ nhật","Thứ 2","Thứ 3","Thứ 4","Thứ 5","Thứ 6","Thứ 7"];
  const d = new Date(report.today + "T00:00:00+07:00");
  const dayName = dayNames[d.getUTCDay()];
  const dateLabel = `${dayName}, ${report.today.split("-").reverse().join("/")}`;

  const urgentCount = report.overdue.length + report.dueToday.length;
  const healthColor = urgentCount === 0 ? "#10b981" : urgentCount <= 3 ? "#f59e0b" : "#ef4444";
  const healthLabel = urgentCount === 0 ? "Đúng tiến độ ✓" : `Cần xử lý ${urgentCount} việc gấp`;

  return (
    <div style={{ padding: "20px 24px 80px", color: "#f8fafc", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif", maxWidth: 780, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>🎯 Daily Focus</h1>
            <p style={{ fontSize: 13, color: "#64748b", margin: "4px 0 0" }}>{dateLabel}</p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Link href="/pwr/kanban" style={{ fontSize: 12, padding: "7px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", color: "#94a3b8", textDecoration: "none" }}>
              📋 Kanban
            </Link>
            <Link href="/pwr/reports/daily" style={{ fontSize: 12, padding: "7px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", color: "#94a3b8", textDecoration: "none" }}>
              📊 Báo cáo ngày
            </Link>
          </div>
        </div>

        {/* Health summary bar */}
        <div style={{
          marginTop: 16, padding: "12px 18px", borderRadius: 10,
          background: `${healthColor}12`, border: `1px solid ${healthColor}30`,
          display: "flex", alignItems: "center", gap: 14,
        }}>
          <div style={{ width: 12, height: 12, borderRadius: "50%", background: healthColor, boxShadow: `0 0 8px ${healthColor}`, flexShrink: 0 }} />
          <span style={{ fontSize: 14, fontWeight: 700, color: healthColor }}>{healthLabel}</span>
          <span style={{ fontSize: 12, color: "#475569", marginLeft: "auto" }}>
            Tổng việc đang chạy: {report.totalActive} · Đang làm: {report.active.length}
          </span>
        </div>
      </div>

      {/* OVERDUE */}
      <Section
        title="🔴 QUÁ HẠN — Xử lý ngay"
        color="#ef4444" count={report.overdue.length}
        tasks={report.overdue} highlight="red"
        emptyText="Không có task quá hạn — tốt lắm! 🎉"
      />

      {/* DUE TODAY */}
      <Section
        title="🟡 HÔM NAY — Phải xong trong ngày"
        color="#f59e0b" count={report.dueToday.length}
        tasks={report.dueToday}
        emptyText="Không có task nào đến hạn hôm nay"
      />

      {/* IN PROGRESS */}
      <Section
        title="⚙️ ĐANG LÀM — Việc đang chạy"
        color="#6366f1" count={report.active.length}
        tasks={report.active}
        emptyText="Chưa có việc nào được bắt đầu — hãy chuyển 1 task sang In Progress"
      />

      {/* DUE TOMORROW */}
      <Section
        title="📅 NGÀY MAI — Chuẩn bị trước"
        color="#3b82f6" count={report.dueTomorrow.length}
        tasks={report.dueTomorrow}
        emptyText="Không có deadline ngày mai"
      />

      {/* EQUIPMENT / CNC */}
      <Section
        title="🔧 MÁY MÓC & SẢN XUẤT — Bottleneck xưởng"
        color="#f97316" count={report.equipmentCnc.length}
        tasks={report.equipmentCnc.slice(0, 8)}
        emptyText="Không có task máy móc / sản xuất đang chờ"
      />

    </div>
  );
}
