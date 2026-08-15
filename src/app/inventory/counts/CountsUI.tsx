'use client';

import { useState } from 'react';
import { Search, Plus, CheckCircle, Clock, Save, FileText } from 'lucide-react';
import { createStocktakeAction, completeStocktakeAction, updateCountItemAction } from '../actions';

export default function CountsUI({ initialCounts, initialItems, warehouses }: any) {
  const [counts] = useState<any[]>(initialCounts);
  const [items] = useState<any[]>(initialItems);
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
  
  const [viewingCount, setViewingCount] = useState<any | null>(null);

  // Edit item state
  const [editingItem, setEditingItem] = useState<number | null>(null);
  const [tempQty, setTempQty] = useState('');
  const [tempNotes, setTempNotes] = useState('');

  const filtered = counts.filter(c => {
    if (!search) return true;
    return c.code.toLowerCase().includes(search.toLowerCase());
  });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedWarehouseId) return;
    const res = await createStocktakeAction({ warehouseId: Number(selectedWarehouseId), userId: 1 });
    if (res.success) {
      setShowCreateModal(false);
      window.location.reload();
    } else alert(res.error);
  }

  async function handleSaveItem(itemId: number) {
    const res = await updateCountItemAction(itemId, Number(tempQty), tempNotes);
    if (res.success) {
      setEditingItem(null);
      window.location.reload();
    } else alert(res.error);
  }

  async function handleComplete(countId: number) {
    if (!confirm('Bạn có chắc chắn muốn chốt số liệu và tự động tạo giao dịch điều chỉnh?')) return;
    const res = await completeStocktakeAction(countId, 1);
    if (res.success) {
      setViewingCount(null);
      window.location.reload();
    } else alert(res.error);
  }

  if (viewingCount) {
    const countItems = items.filter(i => i.countId === viewingCount.id);
    return (
      <div className="page-container">
        <div className="page-header">
          <div>
            <h1 className="page-title flex items-center gap-2">
              <button className="text-gray-500 hover:text-gray-900" onClick={() => setViewingCount(null)}>←</button>
              Chi tiết Kiểm Kê: {viewingCount.code}
            </h1>
            <p className="page-subtitle">Kho: {viewingCount.warehouseName} | Trạng thái: {viewingCount.status}</p>
          </div>
          {viewingCount.status === 'DRAFT' && (
            <button className="btn btn-primary bg-green-600 hover:bg-green-700 border-none" onClick={() => handleComplete(viewingCount.id)}>
              <CheckCircle size={16} /> Hoàn Tất & Điều Chỉnh Tồn Kho
            </button>
          )}
        </div>

        <div className="card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Mã Vật Tư</th>
                <th>Tên Vật Tư</th>
                <th>Vị trí</th>
                <th className="text-right">Tồn hệ thống</th>
                <th className="text-right">Tồn thực tế</th>
                <th className="text-right">Chênh lệch</th>
                <th>Ghi chú</th>
                {viewingCount.status === 'DRAFT' && <th>Thao tác</th>}
              </tr>
            </thead>
            <tbody>
              {countItems.map(item => (
                <tr key={item.id}>
                  <td className="font-medium text-gray-700">{item.materialCode}</td>
                  <td>{item.materialName}</td>
                  <td>{item.locationName || '-'}</td>
                  <td className="text-right text-gray-500 font-medium">{item.systemQuantity}</td>
                  
                  {editingItem === item.id ? (
                    <>
                      <td className="text-right">
                        <input type="number" step="0.01" className="input w-24 text-right" autoFocus value={tempQty} onChange={e=>setTempQty(e.target.value)} />
                      </td>
                      <td>-</td>
                      <td>
                        <input className="input w-full" value={tempNotes} onChange={e=>setTempNotes(e.target.value)} placeholder="Lý do chênh lệch" />
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <button className="text-green-600 hover:text-green-800" onClick={() => handleSaveItem(item.id)}><Save size={16}/></button>
                          <button className="text-gray-400 hover:text-gray-600" onClick={() => setEditingItem(null)}>Hủy</button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="text-right font-bold text-blue-600">{item.countedQuantity !== null ? item.countedQuantity : '-'}</td>
                      <td className={`text-right font-bold ${item.variance > 0 ? 'text-green-600' : item.variance < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                        {item.variance !== null ? (item.variance > 0 ? `+${item.variance}` : item.variance) : '-'}
                      </td>
                      <td>{item.notes || '-'}</td>
                      {viewingCount.status === 'DRAFT' && (
                        <td>
                          <button 
                            className="text-blue-600 hover:underline text-sm font-medium"
                            onClick={() => {
                              setEditingItem(item.id);
                              setTempQty(item.countedQuantity !== null ? item.countedQuantity : item.systemQuantity);
                              setTempNotes(item.notes || '');
                            }}
                          >
                            Nhập số liệu
                          </button>
                        </td>
                      )}
                    </>
                  )}
                </tr>
              ))}
              {countItems.length === 0 && <tr><td colSpan={8} className="text-center py-8">Kho này hiện không có vật tư nào để kiểm kê.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Kiểm kê Kho</h1>
          <p className="page-subtitle">Quản lý các đợt kiểm kê, đối chiếu và điều chỉnh tồn kho</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          <Plus size={16} /> Tạo phiếu Kiểm kê
        </button>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="search-box">
            <Search size={18} className="search-icon" />
            <input 
              type="text" 
              placeholder="Tìm theo mã phiếu..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="search-input w-full"
            />
          </div>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Mã Phiếu</th>
                <th>Ngày tạo</th>
                <th>Kho kiểm kê</th>
                <th>Trạng thái</th>
                <th>Người tạo</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} onClick={() => setViewingCount(c)} className="cursor-pointer hover:bg-gray-50">
                  <td className="font-bold text-blue-600 flex items-center gap-2"><FileText size={16} className="text-gray-400" /> {c.code}</td>
                  <td>{c.scheduledDate ? new Date(c.scheduledDate).toLocaleDateString('vi-VN') : '-'}</td>
                  <td className="font-medium text-gray-700">{c.warehouseName}</td>
                  <td>
                    {c.status === 'DRAFT' && <span className="badge bg-yellow-100 text-yellow-800"><Clock size={12} className="inline mr-1" /> Đang kiểm đếm</span>}
                    {c.status === 'COMPLETED' && <span className="badge bg-green-100 text-green-800"><CheckCircle size={12} className="inline mr-1" /> Đã hoàn tất</span>}
                  </td>
                  <td>Admin</td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={5} className="text-center py-8">Chưa có phiếu kiểm kê nào.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {showCreateModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <h3 className="modal-title flex items-center gap-2"><FileText size={18} /> Tạo Phiếu Kiểm Kê</h3>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleCreate} className="flex flex-col gap-4">
                <div className="form-group">
                  <label>Chọn Kho cần kiểm kê *</label>
                  <select required className="input" value={selectedWarehouseId} onChange={e=>setSelectedWarehouseId(e.target.value)}>
                    <option value="">-- Chọn Kho --</option>
                    {warehouses.map((w:any) => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
                <div className="flex justify-end gap-3 mt-4">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Hủy</button>
                  <button type="submit" className="btn btn-primary">Tạo phiếu</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
