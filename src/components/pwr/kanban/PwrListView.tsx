"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import type { PwrTask, PwrStatus, PwrPriority } from "@/db/schema";
import { PWR_STATUS, PWR_PRIORITY, getTodayVN, TERMINAL_STATUSES } from "@/lib/pwr/constants";
import { ExternalLink, Trash2, XCircle, CheckSquare, Square } from "lucide-react";
import PwrDeadlineCountdown from "../tasks/PwrDeadlineCountdown";

interface Props { tasks: PwrTask[]; onRefresh?: () => void; }

export default function PwrListView({ tasks, onRefresh }: Props) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [confirmMsg, setConfirmMsg] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<"cancel" | "delete" | null>(null);

  const pOrder: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  const sorted = [...tasks].sort((a, b) => (pOrder[a.priority] ?? 9) - (pOrder[b.priority] ?? 9));
  const allIds = sorted.map(t => t.id);
  const allSelected = allIds.length > 0 && allIds.every(id => selected.has(id));

  function toggleAll() { if (allSelected) setSelected(new Set()); else setSelected(new Set(allIds)); }
  function toggleOne(id: number) { const n = new Set(selected); n.has(id) ? n.delete(id) : n.add(id); setSelected(n); }

  function requestAction(action: "cancel" | "delete") {
    if (selected.size === 0) return;
    const lbl = action === "cancel" ? "HUY" : "XOA VINH VIEN";
    setConfirmMsg(`${lbl} ${selected.size} task? Thao tac nay khong the hoan tac.`);
    setPendingAction(action);
  }

  async function confirmAction() {
    if (!pendingAction || selected.size === 0) return;
    const ids = Array.from(selected);
    setConfirmMsg(null);
    startTransition(async () => {
      await fetch("/api/pwr/tasks?action=" + pendingAction, {
        method: "DELETE", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      setSelected(new Set()); setPendingAction(null); onRefresh?.();
    });
  }

  async function deleteOne(id: number) {
    if (!confirm("Xoa task nay? Co the khoi phuc trong 30 ngay.")) return;
    await fetch("/api/pwr/tasks?id=" + id + "&action=delete", { method: "DELETE" });
    onRefresh?.();
  }

  const isOverdue = (t: PwrTask) =>
    !TERMINAL_STATUSES.includes(t.status as PwrStatus) && !!t.dueDate && t.dueDate < getTodayVN();

  return (
    <div style={{ padding: "20px 24px", overflowX: "auto" }}>
      {selected.size > 0 && (
        <div style={{ marginBottom: 12, padding: "10px 16px", borderRadius: 10, background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.25)", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, color: "#a5b4fc", fontWeight: 600 }}>{selected.size} task dang chon</span>
          <button onClick={() => requestAction("cancel")} disabled={isPending}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 14px", borderRadius: 8, border: "1px solid rgba(245,158,11,0.35)", background: "rgba(245,158,11,0.08)", color: "#f59e0b", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            <XCircle size={14} /> Huy task
          </button>
          <button onClick={() => requestAction("delete")} disabled={isPending}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 14px", borderRadius: 8, border: "1px solid rgba(239,68,68,0.35)", background: "rgba(239,68,68,0.08)", color: "#ef4444", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            <Trash2 size={14} /> Xoa task
          </button>
          <button onClick={() => setSelected(new Set())} style={{ marginLeft: "auto", fontSize: 11, color: "#475569", background: "none", border: "none", cursor: "pointer" }}>Bo chon</button>
        </div>
      )}
      {confirmMsg && (
        <div style={{ marginBottom: 12, padding: "12px 16px", borderRadius: 10, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span style={{ flex: 1, fontSize: 13, color: "#fca5a5" }}>⚠️ {confirmMsg}</span>
          <button onClick={confirmAction} style={{ padding: "5px 16px", borderRadius: 8, background: "#ef4444", border: "none", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>Xac nhan</button>
          <button onClick={() => { setConfirmMsg(null); setPendingAction(null); }} style={{ padding: "5px 16px", borderRadius: 8, background: "none", border: "1px solid rgba(255,255,255,0.1)", color: "#94a3b8", fontSize: 12, cursor: "pointer" }}>Huy bo</button>
        </div>
      )}
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            <th style={{ padding: "10px 12px", width: 32 }}>
              <button onClick={toggleAll} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", display: "flex" }}>
                {allSelected ? <CheckSquare size={15} color="#6366f1" /> : <Square size={15} />}
              </button>
            </th>
            {["#", "Tieu de", "Du an", "Nguoi LH", "Deadline", "Uu tien", "Trang thai", ""].map(h => (
              <th key={h} style={{ padding: "10px 12px", textAlign: "left", color: "#64748b", fontWeight: 600, textTransform: "uppercase", fontSize: 11, letterSpacing: 0.5, whiteSpace: "nowrap" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map(task => {
            const st = PWR_STATUS[task.status as PwrStatus];
            const pr = PWR_PRIORITY[task.priority as PwrPriority];
            const ov = isOverdue(task);
            const sel = selected.has(task.id);
            return (
              <tr key={task.id}
                style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", background: sel ? "rgba(99,102,241,0.06)" : ov ? "rgba(239,68,68,0.03)" : "transparent", transition: "background 0.15s" }}
                onMouseEnter={e => { if (!sel) e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = sel ? "rgba(99,102,241,0.06)" : ov ? "rgba(239,68,68,0.03)" : "transparent"; }}>
                <td style={{ padding: "12px" }}>
                  <button onClick={() => toggleOne(task.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", display: "flex" }}>
                    {sel ? <CheckSquare size={15} color="#6366f1" /> : <Square size={15} />}
                  </button>
                </td>
                <td style={{ padding: "12px", color: "#475569", fontSize: 11 }}>#{task.id}</td>
                <td style={{ padding: "12px", color: ov ? "#fca5a5" : "#e2e8f0", fontWeight: 500, maxWidth: 280 }}>
                  <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {ov && <span style={{ fontSize: 10, color: "#ef4444", marginRight: 5 }}>⚠</span>}
                    {task.title}
                  </div>
                </td>
                <td style={{ padding: "12px", color: "#64748b", whiteSpace: "nowrap" }}>{task.projectRef || "—"}</td>
                <td style={{ padding: "12px", color: "#64748b", whiteSpace: "nowrap" }}>{task.assignedTo || "—"}</td>
                <td style={{ padding: "12px", whiteSpace: "nowrap" }}>
                  {task.dueDate ? <PwrDeadlineCountdown dueDate={task.dueDate} status={task.status} /> : "—"}
                </td>
                <td style={{ padding: "12px" }}>
                  <span style={{ background: (pr?.color || "#64748b") + "20", color: pr?.color || "#64748b", padding: "3px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600 }}>{pr?.label}</span>
                </td>
                <td style={{ padding: "12px" }}>
                  <span style={{ background: st?.bg, color: st?.color, padding: "3px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600 }}>{st?.label}</span>
                </td>
                <td style={{ padding: "12px" }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <Link href={"/pwr/tasks/" + task.id} style={{ color: "#3b82f6", display: "flex", alignItems: "center" }}><ExternalLink size={14} /></Link>
                    <button onClick={() => deleteOne(task.id)} title="Xoa task"
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#475569", display: "flex", alignItems: "center", padding: 0 }}
                      onMouseEnter={e => (e.currentTarget.style.color = "#ef4444")}
                      onMouseLeave={e => (e.currentTarget.style.color = "#475569")}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {sorted.length === 0 && (<div style={{ textAlign: "center", padding: 60, color: "#475569" }}>Khong co cong viec nao</div>)}
    </div>
  );
}