"use client";
import { useState } from "react";
import Link from "next/link";

type PhaseBreakdown = Record<number, { total: number; done: number; label: string }>;
interface ProjectSummary {
  id: number; name: string; customer: string | null; deadline: string | null;
  color: string; pct: number; totalTasks: number; doneTasks: number;
  activeTasks: number; overdueTasks: number; remaining: number;
  currentPhase: number; health: "GREEN" | "YELLOW" | "RED"; phaseBreakdown: PhaseBreakdown;
}

const COLOR_HEX: Record<string, string> = {
  BLUE:"#3b82f6", ORANGE:"#f97316", GREEN:"#10b981",
  PURPLE:"#8b5cf6", RED:"#ef4444", YELLOW:"#f59e0b",
};
const HEALTH_COLOR: Record<string, string> = { GREEN:"#10b981", YELLOW:"#f59e0b", RED:"#ef4444" };
const HEALTH_LABEL: Record<string, string> = { GREEN:"Đúng tiến độ", YELLOW:"Có rủi ro", RED:"Nguy hiểm" };
const HEALTH_ICON:  Record<string, string> = { GREEN:"🟢", YELLOW:"🟡", RED:"🔴" };

function PhaseBar({ breakdown }: { breakdown: PhaseBreakdown }) {
  return (
    <div style={{ display: "flex", gap: 2, marginTop: 10 }}>
      {[1,2,3,4,5,6].map(p => {
        const ph = breakdown[p];
        if (!ph || ph.total === 0) return (
          <div key={p} style={{ flex:1, height:6, background:"rgba(255,255,255,0.06)", borderRadius:3 }} title={`Giai đoạn ${p}: không có task`} />
        );
        const pct = Math.round((ph.done / ph.total) * 100);
        return (
          <div key={p} title={`${ph.label}: ${ph.done}/${ph.total} (${pct}%)`}
            style={{ flex:1, height:6, background:"rgba(255,255,255,0.1)", borderRadius:3, overflow:"hidden", position:"relative" }}>
            <div style={{ position:"absolute", left:0, top:0, height:"100%", width:`${pct}%`,
              background: pct===100 ? "#10b981" : pct>0 ? "#3b82f6" : "transparent",
              transition:"width 0.4s" }} />
          </div>
        );
      })}
    </div>
  );
}

function PhaseDetails({ breakdown, currentPhase }: { breakdown: PhaseBreakdown; currentPhase: number }) {
  return (
    <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginTop:10 }}>
      {[1,2,3,4,5,6].map(p => {
        const ph = breakdown[p];
        if (!ph || ph.total===0) return null;
        const pct = Math.round((ph.done/ph.total)*100);
        const isCurrent = p===currentPhase && pct<100;
        return (
          <div key={p} style={{
            fontSize:10, padding:"3px 9px", borderRadius:20,
            background: pct===100 ? "rgba(16,185,129,0.12)" : isCurrent ? "rgba(59,130,246,0.15)" : "rgba(255,255,255,0.04)",
            border: `1px solid ${pct===100 ? "rgba(16,185,129,0.3)" : isCurrent ? "rgba(59,130,246,0.3)" : "rgba(255,255,255,0.08)"}`,
            color: pct===100 ? "#10b981" : isCurrent ? "#60a5fa" : "#64748b",
            fontWeight: isCurrent ? 700 : 400,
          }}>
            {pct===100?"✓ ":isCurrent?"▶ ":""}{ph.label} {ph.done}/{ph.total}
          </div>
        );
      })}
    </div>
  );
}

function ProjectCard({ proj }: { proj: ProjectSummary }) {
  const [expanded, setExpanded] = useState(false);
  const accentColor = COLOR_HEX[proj.color] ?? "#3b82f6";
  const hc = HEALTH_COLOR[proj.health];

  return (
    <div style={{
      background:"rgba(255,255,255,0.02)", border:`1px solid rgba(255,255,255,0.07)`,
      borderLeft:`4px solid ${accentColor}`, borderRadius:12, padding:"18px 20px",
      marginBottom:12, transition:"all 0.2s",
    }}>
      <div style={{ display:"flex", alignItems:"flex-start", gap:12, cursor:"pointer" }}
        onClick={()=>setExpanded(p=>!p)}>
        {/* Health dot */}
        <div style={{ width:10, height:10, borderRadius:"50%", background:hc, marginTop:5, flexShrink:0,
          boxShadow:`0 0 6px ${hc}` }} />

        {/* Main info */}
        <div style={{ flex:1 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
            <span style={{ fontSize:15, fontWeight:700, color:"#f1f5f9" }}>{proj.name}</span>
            {proj.customer && <span style={{ fontSize:11, color:"#64748b" }}>{proj.customer}</span>}
            <span style={{ fontSize:11, padding:"2px 8px", borderRadius:20,
              background:`${hc}15`, border:`1px solid ${hc}30`, color:hc, fontWeight:600 }}>
              {HEALTH_ICON[proj.health]} {HEALTH_LABEL[proj.health]}
            </span>
          </div>

          {/* Progress bar */}
          <div style={{ marginTop:8, display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ flex:1, height:8, background:"rgba(255,255,255,0.08)", borderRadius:4, overflow:"hidden" }}>
              <div style={{ height:"100%", width:`${proj.pct}%`,
                background: proj.pct===100 ? "#10b981" : "#3b82f6",
                borderRadius:4, transition:"width 0.4s" }} />
            </div>
            <span style={{ fontSize:13, fontWeight:700, color: proj.pct===100?"#10b981":"#60a5fa", minWidth:38 }}>
              {proj.pct}%
            </span>
          </div>

          {/* Phase mini-bar */}
          <PhaseBar breakdown={proj.phaseBreakdown} />

          {/* Stats row */}
          <div style={{ display:"flex", gap:16, marginTop:8, flexWrap:"wrap" }}>
            <span style={{ fontSize:11, color:"#64748b" }}>✅ {proj.doneTasks}/{proj.totalTasks} task</span>
            {proj.activeTasks>0 && <span style={{ fontSize:11, color:"#6366f1" }}>⚙ {proj.activeTasks} đang làm</span>}
            {proj.overdueTasks>0 && <span style={{ fontSize:11, color:"#ef4444", fontWeight:700 }}>⚠ {proj.overdueTasks} quá hạn</span>}
            {proj.deadline && <span style={{ fontSize:11, color:"#94a3b8" }}>📅 Bàn giao: {proj.deadline}</span>}
          </div>
        </div>

        {/* Expand */}
        <span style={{ color:"#334155", fontSize:12, marginTop:4 }}>{expanded?"▲":"▼"}</span>
      </div>

      {/* Expanded phase details */}
      {expanded && <PhaseDetails breakdown={proj.phaseBreakdown} currentPhase={proj.currentPhase} />}
    </div>
  );
}

export default function PwrProjectReportClient({ report }: { report: ProjectSummary[] }) {
  const [sortKey, setSortKey] = useState<"health"|"pct"|"deadline">("health");

  const sorted = [...report].sort((a,b) => {
    if (sortKey==="health") {
      const order: Record<string,number>={RED:0,YELLOW:1,GREEN:2};
      return (order[a.health]??3)-(order[b.health]??3);
    }
    if (sortKey==="pct") return a.pct-b.pct;
    if (sortKey==="deadline") return (a.deadline??"")<(b.deadline??"") ? -1:1;
    return 0;
  });

  const redCount    = report.filter(p=>p.health==="RED").length;
  const yellowCount = report.filter(p=>p.health==="YELLOW").length;
  const greenCount  = report.filter(p=>p.health==="GREEN").length;
  const avgPct      = report.length>0 ? Math.round(report.reduce((s,p)=>s+p.pct,0)/report.length) : 0;

  return (
    <div style={{ padding:"20px 24px 80px", color:"#f8fafc", fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif", maxWidth:860, margin:"0 auto" }}>

      {/* Header */}
      <div style={{ marginBottom:24 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:10 }}>
          <div>
            <h1 style={{ fontSize:22, fontWeight:800, margin:0 }}>📊 Tiến Độ Dự Án</h1>
            <p style={{ fontSize:13, color:"#64748b", margin:"4px 0 0" }}>{report.length} dự án đang theo dõi</p>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <Link href="/pwr/focus" style={{ fontSize:12, padding:"7px 14px", borderRadius:8, border:"1px solid rgba(255,255,255,0.1)", color:"#94a3b8", textDecoration:"none" }}>
              🎯 Daily Focus
            </Link>
            <Link href="/pwr/kanban" style={{ fontSize:12, padding:"7px 14px", borderRadius:8, border:"1px solid rgba(255,255,255,0.1)", color:"#94a3b8", textDecoration:"none" }}>
              📋 Kanban
            </Link>
          </div>
        </div>

        {/* Summary KPI */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginTop:16 }}>
          {[
            { label:"Tiến độ TB",  value:`${avgPct}%`,          color:"#3b82f6" },
            { label:"🔴 Nguy hiểm", value:redCount,              color:"#ef4444" },
            { label:"🟡 Rủi ro",   value:yellowCount,            color:"#f59e0b" },
            { label:"🟢 Đúng hạn", value:greenCount,             color:"#10b981" },
          ].map(s=>(
            <div key={s.label} style={{
              padding:"12px 16px", borderRadius:10,
              background:`${s.color}10`, border:`1px solid ${s.color}25`,
              textAlign:"center"
            }}>
              <div style={{ fontSize:22, fontWeight:800, color:s.color }}>{s.value}</div>
              <div style={{ fontSize:11, color:"#64748b", marginTop:2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Sort */}
        <div style={{ display:"flex", gap:8, marginTop:14, flexWrap:"wrap" }}>
          <span style={{ fontSize:12, color:"#475569", alignSelf:"center" }}>Sắp xếp:</span>
          {[
            { key:"health" as const, label:"Rủi ro trước" },
            { key:"pct"    as const, label:"Tiến độ thấp nhất" },
            { key:"deadline" as const, label:"Deadline gần nhất" },
          ].map(s=>(
            <button key={s.key} onClick={()=>setSortKey(s.key)} style={{
              fontSize:11, padding:"5px 12px", borderRadius:20, cursor:"pointer",
              background: sortKey===s.key ? "rgba(99,102,241,0.2)" : "transparent",
              border:`1px solid ${sortKey===s.key ? "rgba(99,102,241,0.4)" : "rgba(255,255,255,0.08)"}`,
              color: sortKey===s.key ? "#a5b4fc" : "#475569",
            }}>{s.label}</button>
          ))}
        </div>
      </div>

      {/* Project cards */}
      {sorted.length===0 ? (
        <div style={{ textAlign:"center", padding:60, color:"#475569" }}>
          Chưa có dự án nào. <Link href="/pwr/kanban" style={{ color:"#6366f1" }}>Tạo dự án mới</Link>
        </div>
      ) : (
        sorted.map(proj => <ProjectCard key={proj.id} proj={proj} />)
      )}
    </div>
  );
}
