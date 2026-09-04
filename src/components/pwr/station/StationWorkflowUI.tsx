import React, { useState, useRef, useEffect } from "react";
import { ArrowLeft, CheckCircle2, ShieldAlert, Play, Clock, Check, AlertTriangle, Upload, X, Loader2, RefreshCw, Plus, Minus } from "lucide-react";
import imageCompression from "browser-image-compression";
import { usePwrStore } from "@/lib/pwr/usePwrStore";

interface StationTask {
  id: number; title: string; description: string | null;
  status: string; priority: string; dueDate: string | null; startedAt?: string | null;
}

const TEAM_MAP: Record<string, string> = {
  "CNC": "CNC", "Dan Canh": "DAN_CANH", "Khoan Cam": "KHOAN_CAM",
  "DAN_CANH": "DAN_CANH", "KHOAN_CAM": "KHOAN_CAM",
};

export function StationWorkflowUI({ stationId, onBack }: { stationId: string; onBack: () => void }) {
  const [tasks, setTasks] = useState<StationTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState<number | null>(null);
  const [completing, setCompleting] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [defectPhotoUrl, setDefectPhotoUrl] = useState<string | null>(null);
  const [compressedFileObj, setCompressedFileObj] = useState<File | null>(null);
  const [defectNote, setDefectNote] = useState("");
  const [isSubmittingError, setIsSubmittingError] = useState(false);
  const [qtyModal, setQtyModal] = useState<{ taskId: number; taskTitle: string } | null>(null);
  const [qtyValue, setQtyValue] = useState(1);
  const [elapsedMap, setElapsedMap] = useState<Record<number, number>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addPoints } = usePwrStore();
  const team = TEAM_MAP[stationId] || stationId;

  const fetchTasks = async () => {
    try {
      const res = await fetch(`/api/pwr/station/tasks?team=${team}`);
      const data = await res.json();
      setTasks(data.tasks || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchTasks(); }, [stationId]);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedMap(prev => {
        const next = { ...prev };
        tasks.forEach(t => {
          if (t.status === "IN_PROGRESS") {
            const started = t.startedAt ? new Date(t.startedAt).getTime() : Date.now();
            next[t.id] = Math.floor((Date.now() - started) / 1000);
          }
        });
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [tasks]);

  const fmt = (s: number) => `${Math.floor(s/60)}:${(s%60).toString().padStart(2,"0")}`;

  const handleStart = async (taskId: number) => {
    setStarting(taskId);
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: "IN_PROGRESS", startedAt: new Date().toISOString() } : t));
    try {
      await fetch("/api/pwr/station/tasks", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, status: "IN_PROGRESS" }),
      });
    } catch {
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: "TODO" } : t));
    }
    setStarting(null);
  };

  const openQtyModal = (task: StationTask) => { setQtyModal({ taskId: task.id, taskTitle: task.title }); setQtyValue(1); };

  const handleConfirmDone = async () => {
    if (!qtyModal) return;
    const { taskId } = qtyModal;
    setCompleting(taskId); setQtyModal(null);
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: "DONE" } : t));
    try {
      await fetch("/api/pwr/station/tasks", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, quantityDone: Math.max(1, qtyValue), status: "DONE" }),
      });
      addPoints(15);
      try { new Audio("/ting.mp3").play(); } catch {}
    } catch {
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: "IN_PROGRESS" } : t));
    }
    setCompleting(null);
  };

  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setIsUploading(true);
    try {
      const compressed = await imageCompression(file, { maxSizeMB: 0.5, maxWidthOrHeight: 1280, useWebWorker: false });
      setDefectPhotoUrl(URL.createObjectURL(compressed)); setCompressedFileObj(compressed);
    } catch { alert("Khong the xu ly anh!"); }
    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmitDefect = async () => {
    if (!compressedFileObj) return;
    setIsSubmittingError(true);
    try {
      const formData = new FormData();
      formData.append("file", compressedFileObj);
      formData.append("taskId", String(tasks[0]?.id || 0));
      formData.append("note", defectNote);
      const res = await fetch("/api/pwr/mobile/defects", { method: "POST", body: formData });
      if (!res.ok) throw new Error();
      alert("Da gui bao loi thanh cong!");
      setDefectPhotoUrl(null); setCompressedFileObj(null); setDefectNote("");
    } catch { alert("Loi mang. Hay thu lai."); }
    setIsSubmittingError(false);
  };

  const doneTasks = tasks.filter(t => t.status === "DONE").length;
  const pendingTasks = tasks.filter(t => t.status !== "DONE").length;

  return (
    <div style={{ padding: "0 20px 100px 20px", animation: "fadeIn 0.3s ease-out" }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin { 0% { transform:rotate(0deg); } 100% { transform:rotate(360deg); } }
        .spinner { border:3px solid rgba(239,68,68,0.2); border-top:3px solid #ef4444; border-radius:50%; width:24px; height:24px; animation:spin 1s linear infinite; }
      `}} />

      <button onClick={onBack} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 20, marginBottom: 24, cursor: "pointer" }}>
        <ArrowLeft size={20} /> Quay lại thẻ chính
      </button>

      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 28, fontWeight: 800, margin: "0 0 4px 0", display: "flex", alignItems: "center", gap: 8 }}>
          <Play size={24} color="#34d399" fill="#34d399" /> {stationId === "CNC" ? "Máy CNC" : stationId === "DAN_CANH" ? "Máy Dán Cạnh" : stationId === "KHOAN_CAM" ? "Máy Khoan Cam" : stationId}
        </h2>
        <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
          <span style={{ fontSize: 13, color: "#cbd5e1" }}>Đang chờ: <strong style={{ color: "#fff" }}>{pendingTasks}</strong></span>
          <span style={{ fontSize: 13, color: "#cbd5e1" }}>Hoàn thành: <strong style={{ color: "#10b981" }}>{doneTasks}</strong></span>
          <button onClick={fetchTasks} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: 0 }}><RefreshCw size={14} /></button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "#cbd5e1" }}>
          <Loader2 size={32} style={{ animation: "spin 1s linear infinite", margin: "0 auto 12px", display: "block" }} />
          <p>Đang tải công việc...</p>
        </div>
      ) : tasks.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: "#cbd5e1", background: "rgba(255,255,255,0.05)", borderRadius: 16 }}>
          <CheckCircle2 size={48} color="#10b981" style={{ margin: "0 auto 12px", display: "block" }} />
          <p style={{ fontSize: 16, fontWeight: 600, color: "#fff" }}>Không có công việc nào!</p>
          <p style={{ fontSize: 14, color: "#94a3b8" }}>Quản đốc chưa giao việc cho trạm này.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {tasks.map(task => {
            const isInProgress = task.status === "IN_PROGRESS";
            const isDone = task.status === "DONE";
            const borderColor = isDone ? "#10b981" : isInProgress ? "#34d399" : "#3b82f6";
            return (
              <div key={task.id} className="glass-card" style={{ padding: 20, borderLeft: `4px solid ${borderColor}` }}>
                {task.dueDate && (
                  <div style={{ fontSize: 12, color: "#cbd5e1", marginBottom: 4, display: "flex", alignItems: "center", gap: 4 }}>
                    <Clock size={12} /> Hạn: {task.dueDate}
                  </div>
                )}
                <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4, textDecoration: isDone ? "line-through" : "none", color: isDone ? "#6b7280" : "#fff" }}>
                  {task.title}
                </div>
                {task.description && <div style={{ fontSize: 13, color: "#cbd5e1", marginBottom: 12 }}>{task.description}</div>}

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, color: task.priority === "HIGH" ? "#ef4444" : "#fbbf24", fontWeight: 600 }}>
  {task.priority === "HIGH" ? "🔴 KHẨN CẤP" : task.priority === "MEDIUM" ? "🟡 ƯU TIÊN" : "🟢 BÌNH THƯỜNG"}
</span>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    {task.status === "TODO" && (
                      <>
                        <button onClick={() => handleStart(task.id)} disabled={starting === task.id}
                          style={{ background: "rgba(59,130,246,0.15)", color: "#3b82f6", border: "1px solid rgba(59,130,246,0.4)", borderRadius: 12, padding: "10px 14px", fontWeight: 600, display: "flex", alignItems: "center", gap: 6, cursor: "pointer", opacity: starting === task.id ? 0.7 : 1 }}>
                          {starting === task.id ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : <Play size={16} fill="#3b82f6" />}
                          Bat Dau
                        </button>
                        <button onClick={() => fileInputRef.current?.click()} style={{ width: 42, height: 42, background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                          <ShieldAlert size={18} />
                        </button>
                      </>
                    )}
                    {isInProgress && (
                      <>
                        <div style={{ fontSize: 13, color: "#34d399", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                          <Clock size={14} /> {fmt(elapsedMap[task.id] || 0)}
                        </div>
                        <button onClick={() => openQtyModal(task)} disabled={completing === task.id}
                          style={{ background: "#10b981", color: "white", border: "none", borderRadius: 12, padding: "10px 16px", fontWeight: 700, display: "flex", alignItems: "center", gap: 6, cursor: "pointer", opacity: completing === task.id ? 0.7 : 1 }}>
                          {completing === task.id ? <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> : <CheckCircle2 size={18} />}
                          Hoan Thanh
                        </button>
                        <button onClick={() => fileInputRef.current?.click()} style={{ width: 42, height: 42, background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                          <ShieldAlert size={18} />
                        </button>
                      </>
                    )}
                    {isDone && (
                      <div style={{ background: "rgba(16,185,129,0.1)", color: "#10b981", padding: "10px 16px", borderRadius: 12, fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                        <Check size={16} /> Da hoan thanh
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <input type="file" accept="image/*" ref={fileInputRef} style={{ display: "none" }} onChange={handlePhotoCapture} />

      {isUploading && (
        <div style={{ marginTop: 24, padding: 16, background: "rgba(239,68,68,0.1)", border: "1px dashed #ef4444", borderRadius: 16, textAlign: "center" }}>
          <div className="spinner" style={{ margin: "0 auto 12px" }}></div>
          <div style={{ color: "#ef4444", fontSize: 14, fontWeight: 600 }}>Đang nén ảnh...</div>
        </div>
      )}

      {defectPhotoUrl && !isUploading && (
        <div style={{ marginTop: 24, background: "rgba(30,30,35,0.8)", border: "1px solid #374151", borderRadius: 16, overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid #374151", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "#ef4444", fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}><AlertTriangle size={16} /> Báo lỗi vật tư</span>
            <button onClick={() => { setDefectPhotoUrl(null); setCompressedFileObj(null); }} style={{ background: "none", border: "none", color: "#cbd5e1", cursor: "pointer" }}><X size={18} /></button>
          </div>
          <img src={defectPhotoUrl} alt="Loi" style={{ width: "100%", maxHeight: 200, objectFit: "cover" }} />
          <div style={{ padding: 16 }}>
            <input type="text" placeholder="Nhập ghi chú lỗi..." value={defectNote} onChange={e => setDefectNote(e.target.value)}
              style={{ width: "100%", background: "rgba(0,0,0,0.5)", border: "1px solid #374151", borderRadius: 8, padding: "12px", color: "white", marginBottom: 12, boxSizing: "border-box" }} />
            <button onClick={handleSubmitDefect} disabled={isSubmittingError}
              style={{ width: "100%", background: "#ef4444", color: "white", border: "none", borderRadius: 8, padding: "12px 0", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: isSubmittingError ? 0.7 : 1, cursor: "pointer" }}>
              {isSubmittingError ? <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> : <Upload size={18} />}
              {isSubmittingError ? "Dang gui..." : "Gui bao loi"}
            </button>
          </div>
        </div>
      )}

      {qtyModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "#111118", borderRadius: "20px 20px 0 0", padding: "28px 24px 40px", width: "100%", maxWidth: 480, border: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Nhập Số Lượng Hoàn Thành</h3>
              <button onClick={() => setQtyModal(null)} style={{ background: "none", border: "none", color: "#cbd5e1", cursor: "pointer" }}><X size={20} /></button>
            </div>
            <p style={{ color: "#cbd5e1", fontSize: 13, margin: "0 0 24px 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{qtyModal.taskTitle}</p>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 24, marginBottom: 28 }}>
              <button onClick={() => setQtyValue(v => Math.max(1, v - 1))}
                style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Minus size={22} />
              </button>
              <div style={{ textAlign: "center" }}>
                <input type="number" min={1} max={9999} value={qtyValue}
                  onChange={e => setQtyValue(Math.max(1, parseInt(e.target.value) || 1))}
                  style={{ fontSize: 52, fontWeight: 800, color: "#10b981", background: "none", border: "none", width: 120, textAlign: "center", outline: "none" }} />
                <div style={{ fontSize: 13, color: "#cbd5e1" }}>sản phẩm</div>
              </div>
              <button onClick={() => setQtyValue(v => Math.min(9999, v + 1))}
                style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Plus size={22} />
              </button>
            </div>
            <button onClick={handleConfirmDone}
              style={{ width: "100%", background: "linear-gradient(135deg,#10b981,#059669)", color: "#fff", border: "none", borderRadius: 14, padding: "16px 0", fontWeight: 800, fontSize: 17, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <CheckCircle2 size={20} /> Xác Nhận Hoàn Thành {qtyValue} san pham
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
