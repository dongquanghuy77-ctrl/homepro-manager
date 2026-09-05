const fs = require('fs');

const code = `"use client";
import React, { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Activity, Loader2, Star, Trophy, CheckCircle2 } from "lucide-react";

interface ChartPoint { name: string; sp: number; date: string; }
interface RecentTask { id: number; title: string; completedAt: string | null; stationTeam: string | null; }

export function ReportsTabUI() {
  const [isMounted, setIsMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [recentTasks, setRecentTasks] = useState<RecentTask[]>([]);
  const [stats, setStats] = useState({ totalPoints: 0, level: 1, tasksCompleted: 0 });

  useEffect(() => {
    setIsMounted(true);
    fetch("/api/pwr/station/reports")
      .then(r => r.json())
      .then(data => {
        if (data.chartData) setChartData(data.chartData);
        if (data.recentTasks) setRecentTasks(data.recentTasks);
        setStats({
          totalPoints: data.totalPoints ?? 0,
          level: data.level ?? 1,
          tasksCompleted: data.tasksCompleted ?? 0,
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const stationName: Record<string, string> = {
    CNC: "Máy CNC", DAN_CANH: "Dán Cạnh", KHOAN_CAM: "Khoan Cam", DONG_GOI: "Đóng Gói",
  };

  return (
    <div style={{ padding: "20px 20px 100px 20px" }}>
      <style>{"@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}"}</style>

      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{ width: 64, height: 64, margin: "0 auto 16px", borderRadius: 20, background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Activity size={32} color="#10b981" />
        </div>
        <h2 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 8px 0" }}>Báo cáo Năng suất</h2>
        <p style={{ color: "#9ca3af", fontSize: 14, margin: 0 }}>Dữ liệu thực tế 7 ngày gần nhất</p>
      </div>

      {/* Stats cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Tổng XP", value: stats.totalPoints.toLocaleString(), color: "#fbbf24", icon: Star },
          { label: "Level", value: "Lv." + stats.level, color: "#c084fc", icon: Trophy },
          { label: "Task Done", value: stats.tasksCompleted, color: "#10b981", icon: CheckCircle2 },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="glass-card" style={{ padding: 16, textAlign: "center" }}>
            <Icon size={20} color={color} style={{ margin: "0 auto 8px", display: "block" }} />
            <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
            <div style={{ fontSize: 11, color: "#9ca3af" }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="glass-card" style={{ padding: "24px 16px", marginBottom: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 24 }}>Sản lượng hoàn thành (task/ngày)</h3>
        {loading ? (
          <div style={{ textAlign: "center", height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af" }}>
            <Loader2 size={32} style={{ animation: "spin 1s linear infinite" }} />
          </div>
        ) : (
          <div style={{ width: "100%", height: 200 }}>
            {isMounted && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    cursor={false} 
                    contentStyle={{ background: "#1f2937", border: "none", borderRadius: 8, color: "#fff" }}
                    formatter={(v: any) => [v + " task", "Hoàn thành"]}
                  />
                  <Bar dataKey="sp" fill="#34d399" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        )}
      </div>

      {/* Recent tasks */}
      <div className="glass-card" style={{ padding: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Lịch sử gần đây</h3>
        {loading ? (
          <div style={{ textAlign: "center", padding: 24, color: "#9ca3af" }}>
            <Loader2 size={24} style={{ animation: "spin 1s linear infinite", display: "block", margin: "0 auto 8px" }} />
            Đang tải...
          </div>
        ) : recentTasks.length === 0 ? (
          <div style={{ textAlign: "center", padding: 24, color: "#9ca3af" }}>
            <CheckCircle2 size={32} style={{ margin: "0 auto 8px", display: "block" }} color="#10b981" />
            Chưa có task nào được hoàn thành. Bắt đầu làm việc để có dữ liệu!
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {recentTasks.map((task, i) => {
              const completedDate = task.completedAt ? new Date(task.completedAt) : null;
              const timeStr = completedDate
                ? completedDate.toLocaleString("vi-VN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })
                : "—";
              return (
                <div key={task.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 12, borderBottom: i < recentTasks.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{task.title}</div>
                    <div style={{ fontSize: 12, color: "#9ca3af" }}>
                      {timeStr} • {stationName[task.stationTeam || ""] || task.stationTeam || "—"}
                    </div>
                  </div>
                  <div style={{ color: "#34d399", fontWeight: 600, flexShrink: 0 }}>+15 XP</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
`;

fs.writeFileSync('src/components/pwr/station/ReportsTabUI.tsx', code, 'utf8');
console.log("ReportsTabUI updated");
