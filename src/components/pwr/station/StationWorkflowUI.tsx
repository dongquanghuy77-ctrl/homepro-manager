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
  const [defectPhoto, setDefectPhoto] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addPoints } = usePwrStore();

  // Thuật toán: Optimistic Update
  const handleComplete = (taskId: number) => {
    // 1. Cập nhật UI ngay lập tức
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'DONE' } : t));
    
    // 2. Kích hoạt thuật toán cộng điểm (15 điểm mỗi việc)
    addPoints(15);
    
    // 3. Play sound / Animation (Giả lập)
    if (typeof window !== 'undefined') {
      const audio = new Audio('/ting.mp3');
      audio.play().catch(() => {});
    }
    
    // 3. API Call ngầm ở đây (Dùng React Query mutate)
    // mutate({ id: taskId, status: 'DONE' })
  };

  // Tư duy ngược: Ép dung lượng ảnh ngay tại client để chống tràn RAM và đứt mạng xưởng
  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      // Ép nén ảnh nghiêm ngặt
      const options = {
        maxSizeMB: 0.5, // Tối đa 500KB
        maxWidthOrHeight: 1280,
        useWebWorker: true
      };
      
      const compressedFile = await imageCompression(file, options);
      console.log('Original size:', (file.size / 1024 / 1024).toFixed(2), 'MB');
      console.log('Compressed size:', (compressedFile.size / 1024 / 1024).toFixed(2), 'MB');
      
      // Tạo preview
      const previewUrl = URL.createObjectURL(compressedFile);
      setDefectPhoto(previewUrl);
      
      // Lúc này mới gọi API upload thực sự
      
    } catch (error) {
      alert('Không thể xử lý ảnh, vui lòng thử lại!');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: '#03030a', color: '#fff' }}>
      {/* Header Sticky */}
      <div style={{ 
        position: 'sticky', top: 0, zIndex: 50, 
        background: 'rgba(10, 10, 15, 0.8)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16
      }}>
        <button onClick={onBack} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
          <ArrowLeft size={20} />
        </button>
        <div>
          <div style={{ fontSize: 13, color: '#9ca3af' }}>Khu vực sản xuất</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#c084fc' }}>Tổ {stationId === 'DAN_CANH' ? 'Dán Cạnh' : stationId === 'KHOAN_CAM' ? 'Khoan Cam' : 'CNC'}</div>
        </div>
      </div>

      <div style={{ padding: 20, paddingBottom: 100 }}>
        {/* Danh sách Việc cần làm */}
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: '#e5e7eb', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Clock size={18} color="#9ca3af" /> Hàng đợi thực hiện
        </h3>
        
        {tasks.map((task) => (
          <div key={task.id} style={{ 
            background: 'rgba(15,15,20,0.6)', border: '1px solid rgba(255,255,255,0.1)', 
            borderRadius: 16, padding: 16, marginBottom: 12,
            opacity: task.status === 'DONE' ? 0.5 : 1,
            transition: 'all 0.3s ease'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{task.name}</div>
                <div style={{ fontSize: 13, color: '#9ca3af' }}>Mã lệnh: #{task.id + 1024}</div>
              </div>
              <div style={{ background: 'rgba(251,191,36,0.1)', color: '#fbbf24', padding: '4px 10px', borderRadius: 12, fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Check size={14} /> +{task.points}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              {task.status !== 'DONE' ? (
                <>
                  <button 
                    onClick={() => handleComplete(task.id)}
                    style={{ flex: 1, background: '#10b981', color: 'white', border: 'none', borderRadius: 12, padding: '12px 0', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer' }}
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

        {/* Khối Hiển thị lỗi vừa chụp (Mô phỏng upload) */}
        {isUploading && (
          <div style={{ marginTop: 24, padding: 16, background: 'rgba(239,68,68,0.1)', border: '1px dashed #ef4444', borderRadius: 16, textAlign: 'center' }}>
            <div className="spinner" style={{ margin: '0 auto 12px' }}></div>
            <div style={{ color: '#ef4444', fontSize: 14, fontWeight: 600 }}>Đang nén và tải ảnh lên...</div>
          </div>
        )}

        {defectPhoto && !isUploading && (
          <div style={{ marginTop: 24, background: 'rgba(30,30,35,0.8)', border: '1px solid #374151', borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #374151', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#ef4444', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}><AlertTriangle size={16} /> Báo lỗi vật tư</span>
              <button onClick={() => setDefectPhoto(null)} style={{ background: 'none', border: 'none', color: '#9ca3af' }}><X size={18} /></button>
            </div>
            <img src={defectPhoto} alt="Lỗi" style={{ width: '100%', maxHeight: 200, objectFit: 'cover' }} />
            <div style={{ padding: 16 }}>
              <input type="text" placeholder="Nhập ghi chú lỗi..." style={{ width: '100%', background: 'rgba(0,0,0,0.5)', border: '1px solid #374151', borderRadius: 8, padding: '12px', color: 'white', marginBottom: 12 }} />
              <button style={{ width: '100%', background: '#ef4444', color: 'white', border: 'none', borderRadius: 8, padding: '12px 0', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Upload size={18} /> Gửi báo lỗi
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
