"use client";
import React, { useState, useEffect } from "react";
import { Factory, Users, CheckCircle2, AlertTriangle, RefreshCw, Loader2, Trophy, TrendingUp } from "lucide-react";

export default function ManagerDashboardClient() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState("");

  const fetchData = async () => {
    try {
      const res = await fetch("/api/pwr/manager");
      if (!res.ok) return;
      const json = await res.json();
      setData(json);
      setLastUpdated(new Date().toLocaleTimeString("vi-VN"));
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const c = {
    bg: "#0a0a0f", card: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.08)",
    accent: "#c084fc", muted: "#9ca3af", success: "#10b981", danger: "#ef4444",
    blue: "#3b82f6", yellow: "#fbbf24",
  };

  const STATION_COLORS: Record<string, string> = {
    INBOX: "#9ca3af", CNC: "#3b82f6", DAN_CANH: "#f59e0b",
    KHOAN_CAM: "#10b981", DONG_GOI: "#8b5cf6",
  };
  const STATION_NAMES: Record<string, string> = {
    INBOX: "Hàng Ð?i", CNC: "Máy CNC", DAN_CANH: "Dán C?nh",
    KHOAN_CAM: "Khoan Cam", DONG_GOI: "Ðóng Gói",
  };

  return (
    <div style={{ minHeight: "100vh", background: c.bg, color: "#fff", padding: 32 }}>
      <style>{"@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}"}</style>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 800, margin: "0 0 8px 0", color: c.accent }}>
            ?? B?ng Ði?u Hành Xu?ng
          </h1>
          <p style={{ color: c.muted, margin: 0 }}>
            T?ng quan real-time · C?p nh?t lúc: {lastUpdated || "dang t?i..."}
          </p>
        </div>
        <button onClick={fetchData} style={{ background: "rgba(192,132,252,0.1)", color: c.accent, border: "1px solid rgba(192,132,252,0.3)", borderRadius: 10, padding: "10px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
          <RefreshCw size={16} /> Làm m?i
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 80, color: c.muted }}>
          <Loader2 size={48} style={{ animation: "spin 1s linear infinite", margin: "0 auto 16px", display: "block" }} />
          <p>Ðang t?i d? li?u xu?ng...</p>
        </div>
      ) : !data ? (
        <div style={{ textAlign: "center", padding: 60, color: c.danger }}>
          L?i t?i d? li?u. Vui lòng th? l?i.
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 32 }}>
            {[
              { label: "Worker dang ho?t d?ng", value: data.activeWorkerCount, icon: Users, color: c.blue, sub: "hôm nay" },
              { label: "Task hoàn thành", value: data.doneToday, icon: CheckCircle2, color: c.success, sub: "hôm nay" },
              { label: "Task dang ch?/làm", value: data.totalPending, icon: Factory, color: c.yellow, sub: "toàn xu?ng" },
              { label: "Báo l?i v?t tu", value: data.defectsToday, icon: AlertTriangle, color: c.danger, sub: "hôm nay" },
            ].map(({ label, value, icon: Icon, color, sub }) => (
              <div key={label} style={{ background: c.card, border: "1px solid " + c.border, borderRadius: 16, padding: 20, borderTop: "4px solid " + color }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                  <Icon size={24} color={color} />
                  <div style={{ fontSize: 11, color: c.muted, textTransform: "uppercase" }}>{label}</div>
                </div>
                <div style={{ fontSize: 36, fontWeight: 800 }}>{value ?? 0}</div>
                <div style={{ fontSize: 12, color: c.muted }}>{sub}</div>
              </div>
            ))}
          </div>

          {/* Progress Bar */}
          <div style={{ background: c.card, border: "1px solid " + c.border, borderRadius: 16, padding: 20, marginBottom: 32 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <span style={{ fontWeight: 600 }}>T? l? hoàn thành hôm nay</span>
              <span style={{ color: c.success, fontWeight: 800, fontSize: 20 }}>{data.completionRate}%</span>
            </div>
            <div style={{ height: 12, background: "rgba(255,255,255,0.08)", borderRadius: 6, overflow: "hidden" }}>
              <div style={{ width: data.completionRate + "%", height: "100%", background: "linear-gradient(90deg,#10b981,#34d399)", borderRadius: 6, transition: "width 1s ease" }} />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 32 }}>
            {/* Task by Station */}
            <div style={{ background: c.card, border: "1px solid " + c.border, borderRadius: 16, padding: 24 }}>
              <h3 style={{ margin: "0 0 20px 0", fontSize: 18, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
                <Factory size={20} color={c.accent} /> Task theo Tr?m
              </h3>
              {(data.stationStats?.length === 0) ? (
                <p style={{ color: c.muted, textAlign: "center", padding: 20 }}>Chua có task nào</p>
              ) : (data.stationStats || []).map((s: any) => (
                <div key={s.station} style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ color: STATION_COLORS[s.station] || "#9ca3af", fontWeight: 600 }}>
                      {STATION_NAMES[s.station] || s.station}
                    </span>
                    <span style={{ color: c.muted, fontSize: 13 }}>
                      ? {s.done} · ? {s.active} · ?? {s.in_progress}
                    </span>
                  </div>
                  <div style={{ height: 6, background: "rgba(255,255,255,0.08)", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ width: Math.min(100, parseInt(s.done || 0) * 10) + "%", height: "100%", background: STATION_COLORS[s.station] || "#9ca3af", borderRadius: 3 }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Active Workers */}
            <div style={{ background: c.card, border: "1px solid " + c.border, borderRadius: 16, padding: 24 }}>
              <h3 style={{ margin: "0 0 20px 0", fontSize: 18, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
                <Users size={20} color={c.blue} /> Worker Ho?t Ð?ng Hôm Nay
              </h3>
              {(data.activeWorkers?.length === 0) ? (
                <p style={{ color: c.muted, textAlign: "center", padding: 20 }}>Chua có th? nào hoàn thành task hôm nay</p>
              ) : (data.activeWorkers || []).slice(0, 6).map((w: any) => (
                <div key={w.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, padding: "10px 14px", background: "rgba(255,255,255,0.03)", borderRadius: 10 }}>
                  <div style={{ fontWeight: 600 }}>{w.name}</div>
                  <div style={{ color: c.success, fontWeight: 700 }}>? {w.tasks_done_today} task</div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Workers Leaderboard */}
          <div style={{ background: c.card, border: "1px solid " + c.border, borderRadius: 16, padding: 24 }}>
            <h3 style={{ margin: "0 0 20px 0", fontSize: 18, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
              <Trophy size={20} color={c.yellow} /> Top 5 Th? Xu?t S?c
            </h3>
            {(data.topWorkers || []).map((w: any, i: number) => (
              <div key={w.userId} style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 12, padding: "12px 16px", background: i === 0 ? "rgba(251,191,36,0.05)" : "rgba(255,255,255,0.02)", borderRadius: 12, border: i === 0 ? "1px solid rgba(251,191,36,0.2)" : "1px solid transparent" }}>
                <div style={{ fontSize: 20, fontWeight: 800, width: 32, textAlign: "center", color: i === 0 ? c.yellow : i === 1 ? "#94a3b8" : i === 2 ? "#b45309" : c.muted }}>
                  {i === 0 ? "??" : i === 1 ? "??" : i === 2 ? "??" : `#${i + 1}`}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700 }}>{w.name}</div>
                  <div style={{ fontSize: 12, color: c.muted }}>Lv.{w.currentLevel} · {w.tasksCompleted} tasks done</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 800, color: c.yellow }}>{w.totalPoints.toLocaleString()} XP</div>
                </div>
              </div>
            ))}
            {(!data.topWorkers || data.topWorkers.length === 0) && (
              <p style={{ color: c.muted, textAlign: "center", padding: 20 }}>Chua có d? li?u di?m</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
