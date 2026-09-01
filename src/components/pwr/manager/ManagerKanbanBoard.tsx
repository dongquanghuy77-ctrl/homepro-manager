'use client';
import React, { useState, useEffect } from 'react';
import { Play, AlertTriangle, Settings, CheckCircle2, Factory, Clock, GripVertical } from 'lucide-react';

type StationId = 'INBOX' | 'CNC' | 'DAN_CANH' | 'KHOAN_CAM' | 'DONG_GOI';
type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE' | 'ISSUE';

interface KanbanTask {
  id: number;
  title: string;
  station: StationId;
  status: TaskStatus;
  points: number;
}

const INITIAL_TASKS: KanbanTask[] = [
  { id: 101, title: 'Cắt lô ván MDF lõi xanh (Bếp)', station: 'INBOX', status: 'TODO', points: 15 },
  { id: 102, title: 'Soi rãnh tủ quần áo master', station: 'INBOX', status: 'TODO', points: 10 },
  { id: 103, title: 'Dán cạnh lô 5 hộc kéo', station: 'DAN_CANH', status: 'IN_PROGRESS', points: 12 }, // Không cho kéo đi
  { id: 104, title: 'Cắt CNC vách ngăn nghệ thuật', station: 'CNC', status: 'TODO', points: 20 },
];

const STATIONS = [
  { id: 'INBOX', name: 'Hàng Đợi (Chưa giao)', icon: Clock, color: '#9ca3af', isOffline: false },
  { id: 'CNC', name: 'Máy CNC', icon: Factory, color: '#3b82f6', isOffline: false },
  { id: 'DAN_CANH', name: 'Máy Dán Cạnh', icon: Factory, color: '#f59e0b', isOffline: true }, // Giả lập máy hỏng
  { id: 'KHOAN_CAM', name: 'Máy Khoan Cam', icon: Factory, color: '#10b981', isOffline: false },
  { id: 'DONG_GOI', name: 'Đóng Gói', icon: CheckCircle2, color: '#8b5cf6', isOffline: false },
];

export default function ManagerKanbanBoard() {
  const [tasks, setTasks] = useState<KanbanTask[]>(INITIAL_TASKS);
  const [draggedTaskId, setDraggedTaskId] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, task: KanbanTask) => {
    // Rào chắn QA 1: Không cho kéo task đang IN_PROGRESS
    if (task.status === 'IN_PROGRESS') {
      e.preventDefault();
      alert('Bảo vệ an toàn: Không thể di chuyển việc đang được thợ làm (IN_PROGRESS). Hãy thu hồi việc trước.');
      return;
    }
    setDraggedTaskId(task.id);
    e.dataTransfer.setData('text/plain', String(task.id));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetStationId: StationId) => {
    e.preventDefault();
    const taskIdStr = e.dataTransfer.getData('text/plain');
    if (!taskIdStr) return;
    const taskId = parseInt(taskIdStr, 10);

    const stationConfig = STATIONS.find(s => s.id === targetStationId);
    
    // Rào chắn QA 3: Không cho thả vào trạm đang bảo trì
    if (stationConfig?.isOffline) {
      alert(`Bảo vệ an toàn: Máy ${stationConfig.name} đang báo lỗi/bảo trì. Không được phép giao việc mù!`);
      setDraggedTaskId(null);
      return;
    }

    // Optimistic Update
    setTasks(prev => prev.map(t => 
      t.id === taskId ? { ...t, station: targetStationId } : t
    ));
    setDraggedTaskId(null);
  };

  return (
    <div style={{ padding: 24, background: '#0a0a0f', minHeight: '100vh', color: '#fff' }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, margin: '0 0 8px 0', color: '#c084fc' }}>Bảng Điều Phối Sản Xuất</h1>
        <p style={{ color: '#9ca3af', fontSize: 16, margin: 0 }}>Kéo thả để giao việc xuống máy trạm của thợ. Tự động đồng bộ Real-time.</p>
      </div>

      <div style={{ display: 'flex', gap: 24, overflowX: 'auto', paddingBottom: 24 }}>
        {STATIONS.map((station) => (
          <div 
            key={station.id}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, station.id as StationId)}
            style={{ 
              flex: '0 0 320px', 
              background: 'rgba(255,255,255,0.03)', 
              borderRadius: 16, 
              border: '1px solid rgba(255,255,255,0.05)',
              borderTop: `4px solid ${station.isOffline ? '#ef4444' : station.color}`,
              display: 'flex', flexDirection: 'column'
            }}
          >
            <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <station.icon size={20} color={station.isOffline ? '#ef4444' : station.color} />
                <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>{station.name}</h3>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.1)', padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                {tasks.filter(t => t.station === station.id).length}
              </div>
            </div>

            {station.isOffline && (
              <div style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: '10px 16px', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertTriangle size={16} /> Máy đang bảo trì (Offline)
              </div>
            )}

            <div style={{ padding: 16, flex: 1, minHeight: 400, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {tasks.filter(t => t.station === station.id).map(task => (
                <div 
                  key={task.id}
                  draggable={task.status !== 'IN_PROGRESS'}
                  onDragStart={(e) => handleDragStart(e, task)}
                  onDragEnd={() => setDraggedTaskId(null)}
                  style={{
                    background: 'rgba(15,15,20,0.8)',
                    border: '1px solid',
                    borderColor: task.status === 'IN_PROGRESS' ? '#10b981' : 'rgba(255,255,255,0.1)',
                    borderRadius: 12,
                    padding: 16,
                    cursor: task.status === 'IN_PROGRESS' ? 'not-allowed' : 'grab',
                    opacity: draggedTaskId === task.id ? 0.5 : 1,
                    transform: draggedTaskId === task.id ? 'scale(0.95)' : 'none',
                    transition: 'transform 0.2s, opacity 0.2s',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ fontSize: 12, color: '#9ca3af' }}>#{task.id}</div>
                    {task.status === 'IN_PROGRESS' && (
                      <div style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700 }}>
                        ĐANG CHẠY
                      </div>
                    )}
                  </div>
                  <h4 style={{ fontSize: 15, fontWeight: 500, margin: '0 0 16px 0', lineHeight: 1.4 }}>{task.title}</h4>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ background: 'rgba(255,255,255,0.05)', color: '#9ca3af', padding: '4px 10px', borderRadius: 8, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Clock size={14} /> 45p
                    </div>
                    <div style={{ color: '#fbbf24', fontSize: 13, fontWeight: 700 }}>+{task.points} đ</div>
                  </div>
                </div>
              ))}
              
              {tasks.filter(t => t.station === station.id).length === 0 && (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280', fontSize: 14, fontWeight: 500, border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 12 }}>
                  Thả việc vào đây
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
