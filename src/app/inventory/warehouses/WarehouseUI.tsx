'use client';

import { useState } from 'react';
import { ArchiveRestore, Plus, MapPin } from 'lucide-react';
import { createWarehouseAction } from '../actions';
import { warehouses } from '@/db/schema';

export type Warehouse = typeof warehouses.$inferSelect;

export default function WarehouseUI({ initialWarehouses }: { initialWarehouses: Warehouse[] }) {
  const [warehouses, setWarehouses] = useState<Warehouse[]>(initialWarehouses);
  
  const [activeWhId, setActiveWhId] = useState<number | null>(warehouses[0]?.id || null);
  const activeWh = warehouses.find(w => w.id === activeWhId);

  const [showWhModal, setShowWhModal] = useState(false);

  // Form states
  const [whCode, setWhCode] = useState('');
  const [whName, setWhName] = useState('');
  const [whType, setWhType] = useState('MAIN_WAREHOUSE');

  async function handleCreateWh(e: React.FormEvent) {
    e.preventDefault();
    const res = await createWarehouseAction({ code: whCode, name: whName, type: whType });
    if (res.success && res.data) {
      setWarehouses([...warehouses, res.data]);
      setActiveWhId(res.data.id);
      setShowWhModal(false);
    } else alert(res.error);
  }

  return (
    <div className="page-container flex h-[calc(100vh-60px)]" style={{ padding: 0 }}>
      {/* Sidebar */}
      <div className="w-64 bg-white border-r flex flex-col">
        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2"><ArchiveRestore size={18}/> Danh Sách Kho</h2>
          <button className="btn-icon" onClick={() => setShowWhModal(true)}><Plus size={16}/></button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {warehouses.map(w => (
            <div 
              key={w.id} 
              className={`p-3 rounded-lg cursor-pointer flex items-center justify-between mb-1 ${activeWhId === w.id ? 'bg-blue-50 border border-blue-200 text-blue-700' : 'hover:bg-gray-50'}`}
              onClick={() => setActiveWhId(w.id)}
            >
              <div>
                <div className="font-medium">{w.name}</div>
                <div className="text-xs text-gray-500 opacity-80">{w.code}</div>
              </div>
            </div>
          ))}
          {warehouses.length === 0 && <div className="p-4 text-center text-gray-500 text-sm">Chưa có kho nào.</div>}
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 bg-gray-50 overflow-y-auto p-6">
        {activeWh ? (
          <div>
            <div className="flex justify-between items-end mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-800">{activeWh.name}</h1>
                <p className="text-sm text-gray-500 flex items-center gap-1 mt-1"><MapPin size={14}/> {activeWh.address || 'Chưa cấu hình địa chỉ'}</p>
              </div>
            </div>
            
            <div className="card shadow-sm p-6 bg-white rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-4">Thông tin chi tiết</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500 uppercase">Mã Kho</label>
                  <p className="font-medium">{activeWh.code}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase">Loại Kho</label>
                  <p className="font-medium">{activeWh.type}</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-400">
            Chọn một kho từ danh sách để xem chi tiết.
          </div>
        )}
      </div>

      {showWhModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <h3 className="modal-title">Thêm Kho Mới</h3>
              <button className="modal-close" onClick={() => setShowWhModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleCreateWh}>
                <div className="form-group">
                  <label>Mã Kho *</label>
                  <input required className="input" value={whCode} onChange={e=>setWhCode(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Tên Kho *</label>
                  <input required className="input" value={whName} onChange={e=>setWhName(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Loại Kho</label>
                  <select className="input" value={whType} onChange={e=>setWhType(e.target.value)}>
                    <option value="MAIN_WAREHOUSE">Kho Chính</option>
                    <option value="WORKSHOP">Kho Xưởng (Sản xuất)</option>
                    <option value="PROJECT_SITE">Kho Công Trình</option>
                  </select>
                </div>
                <div className="flex justify-end gap-3 mt-4">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowWhModal(false)}>Hủy</button>
                  <button type="submit" className="btn btn-primary">Tạo Kho</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
