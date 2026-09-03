"use client";
import React, { useState, useEffect } from "react";
import { CheckCircle2, XCircle, AlertTriangle, Loader2, RefreshCw, ClipboardCheck } from "lucide-react";

export default function QcKioskUI() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [processing, setProcessing] = useState(false);
  
  // Fail Form
  const [reason, setReason] = useState("");
  const [needScrap, setNeedScrap] = useState(false);
  const [scrapMat, setScrapMat] = useState("");
  const [scrapQty, setScrapQty] = useState("");

  const fetchTasks = () => {
    setLoading(true);
    fetch("/api/pwr/station/qc").then(r => r.json()).then(d => {
      setTasks(d.tasks || []);
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchTasks();
    const intv = setInterval(fetchTasks, 30000);
    return () => clearInterval(intv);
  }, []);

  const handleQC = async (isPass: boolean) => {
    if (!isPass && !reason) return alert("Vui lòng nhập lý do lỗi!");
    setProcessing(true);
    
    let scrapItems = [];
    if (needScrap && scrapMat && scrapQty) {
      scrapItems.push({ material: scrapMat, qty: parseFloat(scrapQty) });
    }

    try {
      await fetch("/api/pwr/station/qc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: selectedTask.id,
          isPass,
          reason,
          needScrap,
          scrapItems
        })
      });
      setSelectedTask(null);
      setReason("");
      setNeedScrap(false);
      setScrapMat(""); setScrapQty("");
      fetchTasks();
    } catch (e) {
      alert("Lỗi!");
    }
    setProcessing(false);
  };

  return (
    <div style={{ padding: 24, minHeight: "100vh", background: "#0a0a0f", color: "#fff" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: "0 0 8px", color: "#34d399", display: "flex", alignItems: "center", gap: 12 }}>
            <ClipboardCheck size={32} /> Kiosk QC (Kiểm Định)
          </h1>
          <p style={{ color: "#9ca3af", margin: 0 }}>Xác nhận chất lượng sản phẩm trước khi xuất/nhập kho.</p>
        </div>
        <button onClick={fetchTasks} style={{ background: "rgba(255,255,255,0.1)", color: "#fff", border: "none", padding: "12px 20px", borderRadius: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontWeight: 600 }}>
          <RefreshCw size={18} /> Làm mới
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 80, color: "#9ca3af" }}>
          <Loader2 size={40} style={{ animation: "spin 1s linear infinite", margin: "0 auto 16px", display: "block" }} />
          <p>Đang tải danh sách chờ QC...</p>
        </div>
      ) : tasks.length === 0 ? (
        <div style={{ textAlign: "center", padding: 80, color: "#9ca3af", background: "#111118", borderRadius: 24, border: "1px dashed rgba(255,255,255,0.1)" }}>
          <CheckCircle2 size={64} style={{ margin: "0 auto 16px", display: "block", color: "#10b981", opacity: 0.5 }} />
          <h3 style={{ fontSize: 20, color: "#fff", margin: "0 0 8px" }}>Không có hàng chờ QC</h3>
          <p>Tất cả sản phẩm đã được kiểm định xong.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 20 }}>
          {tasks.map(t => {
            const waitingMin = Math.floor((new Date().getTime() - new Date(t.waitingQcSince).getTime()) / 60000);
            const isDanger = waitingMin > 60;
            return (
              <div key={t.id} style={{ background: "#111118", border: `1px solid ${isDanger ? "#ef4444" : "rgba(255,255,255,0.1)"}`, borderRadius: 16, padding: 20, boxShadow: isDanger ? "0 0 15px rgba(239,68,68,0.2)" : "none" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                  <span style={{ fontSize: 13, color: "#9ca3af", fontWeight: 700 }}>#{t.id}</span>
                  {isDanger ? (
                    <span style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", padding: "4px 8px", borderRadius: 8, fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}><AlertTriangle size={14}/> Chờ {waitingMin}p</span>
                  ) : (
                    <span style={{ background: "rgba(255,255,255,0.1)", color: "#fff", padding: "4px 8px", borderRadius: 8, fontSize: 12, fontWeight: 700 }}>Chờ {waitingMin}p</span>
                  )}
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 8px" }}>{t.title}</h3>
                <p style={{ fontSize: 14, color: "#9ca3af", margin: "0 0 20px" }}>Số lượng: {t.quantityDone}</p>
                <button onClick={() => setSelectedTask(t)} style={{ width: "100%", padding: 12, background: "rgba(52,211,153,0.1)", color: "#34d399", border: "1px solid rgba(52,211,153,0.3)", borderRadius: 8, fontWeight: 700, cursor: "pointer" }}>Kiểm Tra Đơn Này</button>
              </div>
            );
          })}
        </div>
      )}

      {selectedTask && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "#111118", borderRadius: 24, padding: 32, width: "100%", maxWidth: 500, border: "1px solid rgba(255,255,255,0.1)" }}>
            <h2 style={{ margin: "0 0 8px", fontSize: 24, fontWeight: 800 }}>Kiểm định #{selectedTask.id}</h2>
            <p style={{ color: "#9ca3af", marginBottom: 24 }}>{selectedTask.title} (SL: {selectedTask.quantityDone})</p>

            <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
              <button onClick={() => handleQC(true)} disabled={processing} style={{ flex: 1, padding: 16, background: "#10b981", color: "#fff", border: "none", borderRadius: 12, fontWeight: 700, fontSize: 16, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                <CheckCircle2 size={32} /> ĐẠT YÊU CẦU
              </button>
              <button onClick={() => setReason(reason || " ")} disabled={processing} style={{ flex: 1, padding: 16, background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 12, fontWeight: 700, fontSize: 16, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                <XCircle size={32} /> KHÔNG ĐẠT (LỖI)
              </button>
            </div>

            {reason !== "" && (
              <div style={{ background: "rgba(255,255,255,0.03)", padding: 20, borderRadius: 12, marginBottom: 24 }}>
                <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>Lý do lỗi:</label>
                <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Vd: Mẻ góc cắt, lỗi sơn..." style={{ width: "100%", padding: 12, background: "#000", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", borderRadius: 8, marginBottom: 16 }} />
                
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontWeight: 600, color: "#f59e0b" }}>
                  <input type="checkbox" checked={needScrap} onChange={e => setNeedScrap(e.target.checked)} style={{ width: 18, height: 18 }} />
                  Cần cấp bù vật tư để Rework?
                </label>

                {needScrap && (
                  <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
                    <input value={scrapMat} onChange={e => setScrapMat(e.target.value)} placeholder="Tên vật tư (VD: Ván MDF 18)" style={{ flex: 2, padding: 10, background: "#000", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", borderRadius: 8 }} />
                    <input type="number" value={scrapQty} onChange={e => setScrapQty(e.target.value)} placeholder="SL" style={{ flex: 1, padding: 10, background: "#000", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", borderRadius: 8 }} />
                  </div>
                )}
                
                <button onClick={() => handleQC(false)} disabled={processing || !reason.trim()} style={{ width: "100%", marginTop: 24, padding: 14, background: "#ef4444", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer" }}>
                  XÁC NHẬN LỖI & YÊU CẦU REWORK
                </button>
              </div>
            )}

            <button onClick={() => { setSelectedTask(null); setReason(""); setNeedScrap(false); }} style={{ width: "100%", padding: 14, background: "transparent", color: "#9ca3af", border: "none", fontWeight: 600, cursor: "pointer" }}>Đóng</button>
          </div>
        </div>
      )}
    </div>
  );
}
