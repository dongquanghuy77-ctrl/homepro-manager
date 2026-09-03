import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, CheckCircle2, ShieldAlert, Play, Clock, Camera, Check, AlertTriangle, Upload, X, Loader2, RefreshCw } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import { usePwrStore } from '@/lib/pwr/usePwrStore';

interface StationTask {
  id: number;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
}

// Map stationId display name -> API team param
const TEAM_MAP: Record<string, string> = {
  'CNC': 'CNC',
  'Dán Cạnh': 'DAN_CANH',
  'Khoan Cam': 'KHOAN_CAM',
  'DAN_CANH': 'DAN_CANH',
  'KHOAN_CAM': 'KHOAN_CAM',
};

export function StationWorkflowUI({ stationId, onBack }: { stationId: string; onBack: () => void }) {
  const [tasks, setTasks] = useState<StationTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [defectPhotoUrl, setDefectPhotoUrl] = useState<string | null>(null);
  const [compressedFileObj, setCompressedFileObj] = useState<File | null>(null);
  const [defectNote, setDefectNote] = useState('');
  const [isSubmittingError, setIsSubmittingError] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addPoints } = usePwrStore();

  const team = TEAM_MAP[stationId] || stationId;

  // Load real tasks from DB
  const fetchTasks = async () => {
    try {
      const res = await fetch(`/api/pwr/station/tasks?team=${team}`);
      const data = await res.json();
      setTasks(data.tasks || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchTasks(); }, [stationId]);

  const handleComplete = async (taskId: number) => {
    setCompleting(taskId);
    // Optimistic UI
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'DONE' } : t));

    try {
      await fetch('/api/pwr/station/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, quantityDone: 1 }),
      });
      addPoints(15);
      try { new Audio('/ting.mp3').play(); } catch {}
    } catch {
      // Rollback nếu fail
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'IN_PROGRESS' } : t));
    }
    setCompleting(null);
  };

  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const compressed = await imageCompression(file, { maxSizeMB: 0.5, maxWidthOrHeight: 1280, useWebWorker: false });
      setDefectPhotoUrl(URL.createObjectURL(compressed));
      setCompressedFileObj(compressed);
    } catch { alert('Không thể xử lý ảnh, vui lòng thử lại!'); }
    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmitDefect = async () => {
    if (!compressedFileObj) return;
    setIsSubmittingError(true);
    try {
      const formData = new FormData();
      formData.append('file', compressedFileObj);
      formData.append('taskId', String(tasks[0]?.id || 0));
      formData.append('note', defectNote);
      const res = await fetch('/api/pwr/mobile/defects', { method: 'POST', body: formData });
      if (!res.ok) throw new Error();
      alert('Đã gửi báo lỗi thành công!');
      setDefectPhotoUrl(null); setCompressedFileObj(null); setDefectNote('');
    } catch { alert('Lỗi mạng. Hãy thử lại.'); }
    setIsSubmittingError(false);
  };

  const doneTasks = tasks.filter(t => t.status === 'DONE').length;
  const pendingTasks = tasks.filter(t => t.status !== 'DONE').length;

  return (
    <div style={{ padding: '0 20px 100px 20px', animation: 'fadeIn 0.3s ease-out' }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .spinner { border: 3px solid rgba(239,68,68,0.2); border-top: 3px solid #ef4444; border-radius: 50%; width: 24px; height: 24px; animation: spin 1s linear infinite; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}} />

      <button onClick={onBack} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 20, marginBottom: 24, cursor: 'pointer' }}>
        <ArrowLeft size={20} /> Quay lại thẻ chính
      </button>

      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Play size={24} color="#34d399" fill="#34d399" /> {stationId}
        </h2>
        <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
          <span style={{ fontSize: 13, color: '#9ca3af' }}>⏳ Đang chờ: <strong style={{ color: '#fff' }}>{pendingTasks}</strong></span>
          <span style={{ fontSize: 13, color: '#9ca3af' }}>✅ Hoàn thành: <strong style={{ color: '#10b981' }}>{doneTasks}</strong></span>
          <button onClick={fetchTasks} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', padding: 0 }}><RefreshCw size={14} /></button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
          <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
          <p>Đang tải công việc...</p>
        </div>
      ) : tasks.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af', background: 'rgba(255,255,255,0.05)', borderRadius: 16 }}>
          <CheckCircle2 size={48} color="#10b981" style={{ margin: '0 auto 12px' }} />
          <p style={{ fontSize: 16, fontWeight: 600, color: '#fff' }}>Không có công việc nào!</p>
          <p style={{ fontSize: 13 }}>Manager chưa giao task cho trạm này.<br />Vui lòng liên hệ quản lý.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {tasks.map((task) => (
            <div key={task.id} className="glass-card" style={{ padding: 20, borderLeft: task.status === 'DONE' ? '4px solid #10b981' : '4px solid #3b82f6' }}>
              {task.dueDate && (
                <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Clock size={12} /> Hạn: {task.dueDate}
                </div>
              )}
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4, textDecoration: task.status === 'DONE' ? 'line-through' : 'none', color: task.status === 'DONE' ? '#6b7280' : '#fff' }}>
                {task.title}
              </div>
              {task.description && <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 12 }}>{task.description}</div>}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: task.priority === 'HIGH' ? '#ef4444' : '#fbbf24', fontWeight: 600 }}>
                  {task.priority === 'HIGH' ? '🔴' : task.priority === 'MEDIUM' ? '🟡' : '🟢'} {task.priority}
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
                  {task.status !== 'DONE' ? (
                    <>
                      <button
                        onClick={() => handleComplete(task.id)}
                        disabled={completing === task.id}
                        style={{ background: '#3b82f6', color: 'white', border: 'none', borderRadius: 12, padding: '10px 16px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', opacity: completing === task.id ? 0.7 : 1 }}
                      >
                        {completing === task.id ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle2 size={18} />}
                        Hoàn Thành
                      </button>
                      <button onClick={() => fileInputRef.current?.click()} style={{ width: 48, background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                        <ShieldAlert size={20} />
                      </button>
                    </>
                  ) : (
                    <div style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', padding: '10px 16px', borderRadius: 12, fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Check size={16} /> Đã hoàn thành
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <input type="file" accept="image/*" ref={fileInputRef} style={{ display: 'none' }} onChange={handlePhotoCapture} />

      {isUploading && (
        <div style={{ marginTop: 24, padding: 16, background: 'rgba(239,68,68,0.1)', border: '1px dashed #ef4444', borderRadius: 16, textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto 12px' }}></div>
          <div style={{ color: '#ef4444', fontSize: 14, fontWeight: 600 }}>Đang nén ảnh...</div>
        </div>
      )}

      {defectPhotoUrl && !isUploading && (
        <div style={{ marginTop: 24, background: 'rgba(30,30,35,0.8)', border: '1px solid #374151', borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #374151', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#ef4444', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}><AlertTriangle size={16} /> Báo lỗi vật tư</span>
            <button onClick={() => { setDefectPhotoUrl(null); setCompressedFileObj(null); }} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer' }}><X size={18} /></button>
          </div>
          <img src={defectPhotoUrl} alt="Lỗi" style={{ width: '100%', maxHeight: 200, objectFit: 'cover' }} />
          <div style={{ padding: 16 }}>
            <input type="text" placeholder="Nhập ghi chú lỗi..." value={defectNote} onChange={(e) => setDefectNote(e.target.value)} style={{ width: '100%', background: 'rgba(0,0,0,0.5)', border: '1px solid #374151', borderRadius: 8, padding: '12px', color: 'white', marginBottom: 12, boxSizing: 'border-box' }} />
            <button onClick={handleSubmitDefect} disabled={isSubmittingError} style={{ width: '100%', background: '#ef4444', color: 'white', border: 'none', borderRadius: 8, padding: '12px 0', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: isSubmittingError ? 0.7 : 1, cursor: 'pointer' }}>
              {isSubmittingError ? <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> : <Upload size={18} />}
              {isSubmittingError ? 'Đang gửi...' : 'Gửi báo lỗi'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
