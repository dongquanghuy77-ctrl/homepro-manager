import React, { useState, useRef } from 'react';
import { ArrowLeft, CheckCircle2, ShieldAlert, Play, Clock, Camera, Check, AlertTriangle, Upload, X } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import { usePwrStore } from '@/lib/pwr/usePwrStore';

export function StationWorkflowUI({ stationId, onBack }: { stationId: string, onBack: () => void }) {
  const [tasks, setTasks] = useState([
    { id: 1, name: 'Cắt lô ván MDF lõi xanh (Bếp)', status: 'IN_PROGRESS', points: 15 },
    { id: 2, name: 'Soi rãnh tủ quần áo master', status: 'TODO', points: 10 },
    { id: 3, name: 'Cắt CNC vách ngăn nghệ thuật', status: 'TODO', points: 20 },
  ]);
  const [isUploading, setIsUploading] = useState(false);
  const [defectPhotoUrl, setDefectPhotoUrl] = useState<string | null>(null);
  const [compressedFileObj, setCompressedFileObj] = useState<File | null>(null);
  const [defectNote, setDefectNote] = useState('');
  const [isSubmittingError, setIsSubmittingError] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addPoints } = usePwrStore();

  const handleComplete = (taskId: number) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'DONE' } : t));
    addPoints(15);
    
    if (typeof window !== 'undefined') {
      const audio = new Audio('/ting.mp3');
      audio.play().catch(() => {});
    }
  };

  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const options = {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 1280,
        useWebWorker: true
      };
      
      const compressedFile = await imageCompression(file, options);
      const previewUrl = URL.createObjectURL(compressedFile);
      setDefectPhotoUrl(previewUrl);
      setCompressedFileObj(compressedFile);
    } catch (error) {
      alert('Không thể xử lý ảnh, vui lòng thử lại!');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmitDefect = async () => {
    if (!compressedFileObj) return;
    setIsSubmittingError(true);
    
    try {
      const formData = new FormData();
      formData.append('file', compressedFileObj);
      formData.append('taskId', String(tasks[0].id)); // Giả lập gắn vào task đầu tiên
      formData.append('note', defectNote);

      const res = await fetch('/api/pwr/mobile/defects', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Network error');

      alert('Đã gửi báo lỗi thành công!');
      setDefectPhotoUrl(null);
      setCompressedFileObj(null);
      setDefectNote('');
    } catch (error) {
      alert('Lỗi mạng khi tải lên. Hãy thử lại.');
    } finally {
      setIsSubmittingError(false);
    }
  };

  return (
    <div style={{ padding: '0 20px 100px 20px', animation: 'fadeIn 0.3s ease-out' }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .spinner { border: 3px solid rgba(239,68,68,0.2); border-top: 3px solid #ef4444; border-radius: 50%; width: 24px; height: 24px; animation: spin 1s linear infinite; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}} />
      
      {/* Nút Back */}
      <button 
        onClick={onBack}
        style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 20, marginBottom: 24, cursor: 'pointer' }}
      >
        <ArrowLeft size={20} /> Quay lại thẻ chính
      </button>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Play size={24} color="#34d399" fill="#34d399" /> {stationId.toUpperCase()}
        </h2>
        <p style={{ color: '#9ca3af', fontSize: 14, margin: 0 }}>Máy đang hoạt động ổn định</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {tasks.map((task) => (
          <div key={task.id} className="glass-card" style={{ padding: 20, borderLeft: task.status === 'DONE' ? '4px solid #10b981' : '4px solid #3b82f6' }}>
            <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Clock size={12} /> Bắt đầu 08:30
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, textDecoration: task.status === 'DONE' ? 'line-through' : 'none', color: task.status === 'DONE' ? '#6b7280' : '#fff' }}>
              {task.name}
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#fbbf24' }}>+{task.points} điểm</span>
              
              <div style={{ display: 'flex', gap: 8 }}>
                {task.status !== 'DONE' ? (
                  <>
                    <button 
                      onClick={() => handleComplete(task.id)}
                      style={{ background: '#3b82f6', color: 'white', border: 'none', borderRadius: 12, padding: '10px 16px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', boxShadow: '0 4px 12px rgba(59,130,246,0.3)' }}
                    >
                      <CheckCircle2 size={18} /> Hoàn Thành
                    </button>
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      style={{ width: 48, background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                    >
                      <ShieldAlert size={20} />
                    </button>
                  </>
                ) : (
                  <div style={{ width: '100%', background: 'rgba(16,185,129,0.1)', color: '#10b981', padding: '12px', borderRadius: 12, textAlign: 'center', fontSize: 14, fontWeight: 600 }}>
                    Đã hoàn thành lúc {new Date().toLocaleTimeString()}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Khối Báo lỗi (Ẩn HTML Input Camera) */}
        <input 
          type="file" 
          accept="image/*" 
          capture="environment" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          onChange={handlePhotoCapture}
        />

        {/* Khối Hiện thị ảnh lỗi */}
        {isUploading && (
          <div style={{ marginTop: 24, padding: 16, background: 'rgba(239,68,68,0.1)', border: '1px dashed #ef4444', borderRadius: 16, textAlign: 'center' }}>
            <div className="spinner" style={{ margin: '0 auto 12px' }}></div>
            <div style={{ color: '#ef4444', fontSize: 14, fontWeight: 600 }}>Đang nén và tải ảnh lên...</div>
          </div>
        )}

        {defectPhotoUrl && !isUploading && (
          <div style={{ marginTop: 24, background: 'rgba(30,30,35,0.8)', border: '1px solid #374151', borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #374151', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#ef4444', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}><AlertTriangle size={16} /> Báo lỗi vật tư</span>
              <button onClick={() => { setDefectPhotoUrl(null); setCompressedFileObj(null); }} style={{ background: 'none', border: 'none', color: '#9ca3af' }}><X size={18} /></button>
            </div>
            <img src={defectPhotoUrl} alt="Lỗi" style={{ width: '100%', maxHeight: 200, objectFit: 'cover' }} />
            <div style={{ padding: 16 }}>
              <input 
                type="text" 
                placeholder="Nhập ghi chú lỗi..." 
                value={defectNote}
                onChange={(e) => setDefectNote(e.target.value)}
                style={{ width: '100%', background: 'rgba(0,0,0,0.5)', border: '1px solid #374151', borderRadius: 8, padding: '12px', color: 'white', marginBottom: 12 }} 
              />
              <button 
                onClick={handleSubmitDefect}
                disabled={isSubmittingError}
                style={{ width: '100%', background: '#ef4444', color: 'white', border: 'none', borderRadius: 8, padding: '12px 0', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: isSubmittingError ? 0.7 : 1 }}
              >
                {isSubmittingError ? <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> : <Upload size={18} />}
                {isSubmittingError ? 'Đang gửi...' : 'Gửi báo lỗi'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
