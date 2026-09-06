'use client';
import React, { useState, useEffect } from 'react';
import { Play, AlertTriangle, CheckCircle2, Factory, Clock, Plus, X, Loader2, Check, Download, Package } from 'lucide-react';

type StationId = 'INBOX' | 'CNC' | 'DAN_CANH' | 'KHOAN_CAM' | 'DONG_GOI';
type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE' | 'ISSUE';

interface KanbanTask { id: number; title: string; station: StationId; status: TaskStatus; points: number; dueDate?: string | null; isOverdue?: boolean; overdueDays?: number; }

interface WorkOrder { id: number; operation: string; sequence: number; plannedQuantity: number; workCenterId: number | null; status: string; }
interface ProductionOrder { id: number; code: string; status: string; priority: string | null; plannedQuantity: number; workOrders: WorkOrder[]; importedCount: number; plannedEnd: string | null; }

const INITIAL_TASKS: KanbanTask[] = [];

const STATIONS = [
  { id: 'INBOX',     name: 'Hàng Đợi (Chưa giao)', icon: Clock,         color: '#9ca3af', isOffline: false },
  { id: 'CNC',       name: 'Máy CNC',               icon: Factory,       color: '#3b82f6', isOffline: false },
  { id: 'DAN_CANH',  name: 'Máy Dán Cạnh',          icon: Factory,       color: '#f59e0b', isOffline: false },
  { id: 'KHOAN_CAM', name: 'Máy Khoan Cam',          icon: Factory,       color: '#10b981', isOffline: false },
  { id: 'DONG_GOI',  name: 'Đóng Gói',              icon: CheckCircle2,  color: '#8b5cf6', isOffline: false },
];

const WC_NAME: Record<number, string> = { 1: 'CNC', 2: 'Dán Cạnh', 3: 'Khoan Cam', 4: 'Đóng Gói' };

export default function ManagerKanbanBoard() {
  const [tasks, setTasks] = useState<KanbanTask[]>(INITIAL_TASKS);
  const [draggedTaskId, setDraggedTaskId] = useState<number | null>(null);
  const [loadError, setLoadError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', stationTeam: 'INBOX' as StationId, priority: 'MEDIUM' });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  // ERP Bridge states
  const [showErpModal, setShowErpModal] = useState(false);
  const [erpOrders, setErpOrders] = useState<ProductionOrder[]>([]);
  const [erpLoading, setErpLoading] = useState(false);
  const [selectedWOs, setSelectedWOs] = useState<Set<number>>(new Set());
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState('');
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);

  // Load real tasks from DB
  const fetchTasks = async () => {
    try {
      const res = await fetch('/api/pwr/tasks?stationDispatch=true&limit=100');
      if (!res.ok) return;
      const data = await res.json();
      const todayStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' });
      // Map pwr_tasks fields to KanbanTask shape
      const mapped: KanbanTask[] = (data.tasks || []).map((t: any) => ({
        id: t.id,
        title: t.title,
        station: (t.stationTeam || 'INBOX') as StationId,
        status: (t.status === 'DONE' ? 'DONE' : t.status === 'IN_PROGRESS' ? 'IN_PROGRESS' : 'TODO') as TaskStatus,
        points: t.priority === 'HIGH' ? 20 : t.priority === 'LOW' ? 10 : 15,
        dueDate: t.dueDate || null,
        isOverdue: t.dueDate ? t.dueDate < todayStr : false,
        overdueDays: t.dueDate && t.dueDate < todayStr
          ? Math.ceil((new Date(todayStr).getTime() - new Date(t.dueDate).getTime()) / 86400000)
          : 0,
      }));
      setTasks(mapped);
      setLoadError('');
    } catch {
      setLoadError('Không tải được dữ liệu. Đang thử lại...');
    }
  };

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 30000); // Polling 30s
    return () => clearInterval(interval);
  }, []);

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
    const taskToMove = tasks.find(t => t.id === taskId);

    const stationConfig = STATIONS.find(s => s.id === targetStationId);

    // RAO CHAN QA 2: Chong keo nham tram
    if (taskToMove && targetStationId !== 'INBOX') {
      const titleLower = taskToMove.title.toLowerCase();
      let expectedStation = null;
      if (titleLower.includes('[cnc]')) expectedStation = 'CNC';
      else if (titleLower.includes('[dán cạnh]') || titleLower.includes('[dan canh]')) expectedStation = 'DAN_CANH';
      else if (titleLower.includes('[khoan cam]')) expectedStation = 'KHOAN_CAM';
      else if (titleLower.includes('mua hàng') || titleLower.includes('khẩn cấp')) expectedStation = 'PURCHASING'; // Not a valid machine

      if (expectedStation && expectedStation !== targetStationId) {
        alert(`Lỗi vận hành: Công việc này thuộc về ${expectedStation} nhưng bạn lại kéo vào ${targetStationId}. Hệ thống từ chối thao tác để tránh lỗi sản xuất!`);
        setDraggedTaskId(null);
        return;
      }
    }
    
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

    // Persist to DB
    try {
      const newTeam = targetStationId === 'INBOX' ? null : targetStationId;
      await fetch(`/api/pwr/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stationTeam: newTeam }),
      });
    } catch {
      // Rollback on error
      fetchTasks();
    }
  };

  // Tạo task mới nhanh
  const handleCreateTask = async () => {
    if (!newTask.title.trim()) { setCreateError('Vui lòng nhập tên task'); return; }
    setCreating(true); setCreateError('');
    try {
      const res = await fetch('/api/pwr/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTask.title.trim(),
          category: 'OPERATIONAL_TASK',
          priority: newTask.priority,
          status: 'TODO',
          stationTeam: newTask.stationTeam === 'INBOX' ? null : newTask.stationTeam,
        }),
      });
      if (!res.ok) { const d = await res.json(); setCreateError(d.error || 'Lỗi tạo task'); setCreating(false); return; }
      setNewTask({ title: '', stationTeam: 'INBOX', priority: 'MEDIUM' });
      setShowCreateModal(false);
      fetchTasks();
    } catch { setCreateError('Lỗi mạng'); }
    setCreating(false);
  };

  // ERP Bridge: Load production orders
  const openErpModal = async () => {
    setShowErpModal(true); setErpLoading(true); setSelectedWOs(new Set()); setImportMsg('');
    try {
      const res = await fetch('/api/pwr/erp/production-orders');
      const d = await res.json();
      setErpOrders(d.orders || []);
    } catch {}
    setErpLoading(false);
  };

  const toggleWO = (woId: number) => setSelectedWOs(prev => {
    const next = new Set(prev);
    next.has(woId) ? next.delete(woId) : next.add(woId);
    return next;
  });

  const handleImport = async () => {
    if (selectedWOs.size === 0) { setImportMsg('Chọn ít nhất 1 công đoạn'); return; }
    setImporting(true); setImportMsg('');
    try {
      const res = await fetch('/api/pwr/erp/import-work-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workOrderIds: Array.from(selectedWOs) }),
      });
      const d = await res.json();
      setImportMsg(d.message || (d.error ? '❌ ' + d.error : '✅ Thành công'));
      if (d.created > 0) { fetchTasks(); }
    } catch { setImportMsg('❌ Lỗi mạng'); }
    setImporting(false);
  };

  return (
    <div style={{ padding: 24, background: '#0a0a0f', minHeight: '100vh', color: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 800, margin: '0 0 8px 0', color: '#c084fc' }}>Bảng Điều Phối Sản Xuất</h1>
          <p style={{ color: '#9ca3af', fontSize: 16, margin: 0 }}>Kéo thả để giao việc xuống máy trạm. Tự động đồng bộ mỗi 30s.</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
          <button onClick={openErpModal}
            style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 12, padding: '12px 18px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
            <Download size={18} /> Import từ Lệnh SX
          </button>
          <button onClick={() => { setShowCreateModal(true); setCreateError(''); }}
            style={{ background: '#c084fc', color: '#fff', border: 'none', borderRadius: 12, padding: '12px 20px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 15 }}>
            <Plus size={20} /> Tạo Task Mới
          </button>
        </div>
      </div>

      {/* Quick Create Modal */}
      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#111118', borderRadius: 20, padding: 32, width: '100%', maxWidth: 480, border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>➕ Tạo Task Mới</h2>
              <button onClick={() => setShowCreateModal(false)} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            {createError && <div style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 14 }}>{createError}</div>}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, color: '#9ca3af', marginBottom: 6 }}>Tên công việc *</label>
              <input
                autoFocus
                type="text"
                placeholder="VD: Cắt lô ván MDF lõi xanh (Bếp A12)"
                value={newTask.title}
                onChange={e => setNewTask(t => ({ ...t, title: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && handleCreateTask()}
                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '12px 14px', color: '#fff', fontSize: 15, boxSizing: 'border-box' as any }}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, color: '#9ca3af', marginBottom: 6 }}>Giao cho trạm</label>
                <select value={newTask.stationTeam} onChange={e => setNewTask(t => ({ ...t, stationTeam: e.target.value as StationId }))}
                  style={{ width: '100%', background: '#1a1a25', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '12px 14px', color: '#fff', fontSize: 14 }}>
                  {STATIONS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, color: '#9ca3af', marginBottom: 6 }}>Độ ưu tiên</label>
                <select value={newTask.priority} onChange={e => setNewTask(t => ({ ...t, priority: e.target.value }))}
                  style={{ width: '100%', background: '#1a1a25', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '12px 14px', color: '#fff', fontSize: 14 }}>
                  <option value="LOW">🟢 Thấp</option>
                  <option value="MEDIUM">🟡 Trung bình</option>
                  <option value="HIGH">🔴 Cao</option>
                </select>
              </div>
            </div>
            <button onClick={handleCreateTask} disabled={creating}
              style={{ width: '100%', background: '#c084fc', color: '#fff', border: 'none', borderRadius: 12, padding: '14px 0', fontWeight: 700, fontSize: 16, cursor: creating ? 'wait' : 'pointer', opacity: creating ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {creating ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={18} />}
              {creating ? 'Đang tạo...' : 'Tạo Task'}
            </button>
          </div>
        </div>
      )}

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
                    {task.isOverdue ? (
                      <div style={{ color: '#ef4444', fontSize: 12, fontWeight: 700, background: 'rgba(239,68,68,0.1)', padding: '3px 8px', borderRadius: 6, border: '1px solid rgba(239,68,68,0.3)' }}>
                        ⚠️ Trễ {task.overdueDays}d
                      </div>
                    ) : task.dueDate ? (
                      <div style={{ color: '#10b981', fontSize: 12, fontWeight: 600 }}>
                        {task.dueDate}
                      </div>
                    ) : (
                      <div style={{ color: '#fbbf24', fontSize: 13, fontWeight: 700 }}>+{task.points} đ</div>
                    )}
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

      {/* ERP Import Modal */}
      {showErpModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#111118', borderRadius: 20, padding: 28, width: '100%', maxWidth: 600, border: '1px solid rgba(255,255,255,0.08)', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>📥 Import từ Lệnh Sản Xuất</h2>
              <button onClick={() => setShowErpModal(false)} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            {importMsg && (
              <div style={{ background: importMsg.startsWith('❌') ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)', color: importMsg.startsWith('❌') ? '#ef4444' : '#10b981', padding: '10px 14px', borderRadius: 10, marginBottom: 16, fontSize: 14 }}>
                {importMsg}
              </div>
            )}

            <div style={{ flex: 1, overflowY: 'auto' }}>
              {erpLoading ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
                  <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px', display: 'block' }} />
                  Đang tải lệnh sản xuất...
                </div>
              ) : erpOrders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
                  <Package size={40} color="#6b7280" style={{ margin: '0 auto 12px', display: 'block' }} />
                  Không có lệnh sản xuất nào ở trạng thái RELEASED/IN_PROGRESS.
                </div>
              ) : erpOrders.map(order => (
                <div key={order.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, marginBottom: 12, overflow: 'hidden' }}>
                  <div onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}
                    style={{ padding: '14px 16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontWeight: 700, color: '#c084fc' }}>{order.code}</span>
                      <span style={{ marginLeft: 12, fontSize: 13, color: '#9ca3af' }}>
                        {order.workOrders.length} công đoạn · SL: {order.plannedQuantity}
                        {order.importedCount > 0 && <span style={{ color: '#10b981', marginLeft: 8 }}>✅ {order.importedCount} đã import</span>}
                      </span>
                    </div>
                    <span style={{ color: '#6b7280', fontSize: 13 }}>{expandedOrderId === order.id ? '▲' : '▼'}</span>
                  </div>
                  {expandedOrderId === order.id && (
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '8px 16px 14px' }}>
                      {order.workOrders.map(wo => (
                        <div key={wo.id} onClick={() => toggleWO(wo.id)}
                          style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 4px', cursor: 'pointer', borderRadius: 8, background: selectedWOs.has(wo.id) ? 'rgba(192,132,252,0.08)' : 'transparent' }}>
                          <div style={{ width: 20, height: 20, borderRadius: 4, border: `2px solid ${selectedWOs.has(wo.id) ? '#c084fc' : '#374151'}`, background: selectedWOs.has(wo.id) ? '#c084fc' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {selectedWOs.has(wo.id) && <Check size={12} color="white" />}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 14, fontWeight: 600 }}>{wo.sequence}. {wo.operation}</div>
                            <div style={{ fontSize: 12, color: '#9ca3af' }}>
                              Trạm: {WC_NAME[wo.workCenterId ?? 0] || 'Chưa xác định'} · SL: {wo.plannedQuantity}
                            </div>
                          </div>
                          <span style={{ fontSize: 11, color: wo.status === 'COMPLETED' ? '#10b981' : '#fbbf24', fontWeight: 600 }}>{wo.status}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: '#9ca3af' }}>Đã chọn: <strong style={{ color: '#c084fc' }}>{selectedWOs.size}</strong> công đoạn</span>
              <button onClick={handleImport} disabled={importing || selectedWOs.size === 0}
                style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: 12, padding: '12px 24px', fontWeight: 700, cursor: (importing || selectedWOs.size === 0) ? 'not-allowed' : 'pointer', opacity: (importing || selectedWOs.size === 0) ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                {importing ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Download size={18} />}
                {importing ? 'Đang tạo...' : 'Tạo Tasks'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
