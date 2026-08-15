'use client';

import { useState } from 'react';
import { Search, Lock, Unlock, Clock, FileText, Briefcase } from 'lucide-react';
import { cancelReservationAction } from '../actions';

export default function ReservationsUI({ initialReservations }: any) {
  const [reservations, setReservations] = useState<any[]>(initialReservations);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const filtered = reservations.filter(r => {
    if (statusFilter && r.status !== statusFilter) return false;
    if (!search) return true;
    const term = search.toLowerCase();
    return r.materialName.toLowerCase().includes(term) || r.materialCode.toLowerCase().includes(term);
  });

  async function handleCancel(id: number) {
    if (!confirm('Bạn có chắc chắn muốn hủy đặt giữ vật tư này? Số lượng sẽ được cộng lại vào Tồn khả dụng.')) return;
    const res = await cancelReservationAction(id);
    if (res.success) {
      setReservations(reservations.map(r => r.id === id ? { ...r, status: 'CANCELLED' } : r));
      alert('Đã hủy đặt giữ thành công!');
    } else {
      alert(res.error);
    }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Đặt giữ Vật tư</h1>
          <p className="page-subtitle">Quản lý số lượng vật tư đang được giữ cho Dự án hoặc Lệnh sản xuất</p>
        </div>
      </div>

      <div className="card">
        <div className="card-header flex gap-4">
          <div className="search-box flex-1">
            <Search size={18} className="search-icon" />
            <input 
              type="text" 
              placeholder="Tìm theo mã hoặc tên vật tư..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="search-input w-full"
            />
          </div>
          <select className="input max-w-xs" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang đặt giữ (ACTIVE)</option>
            <option value="ISSUED">Đã xuất kho (ISSUED)</option>
            <option value="CANCELLED">Đã hủy (CANCELLED)</option>
          </select>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Vật tư</th>
                <th>Kho</th>
                <th className="text-right">Số lượng giữ</th>
                <th>Nghiệp vụ / Tham chiếu</th>
                <th>Ngày đặt</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id}>
                  <td>
                    <div className="font-medium text-gray-800">{r.materialCode}</div>
                    <div className="text-sm text-gray-500">{r.materialName}</div>
                  </td>
                  <td>{r.warehouseName}</td>
                  <td className="text-right font-bold text-blue-600">{r.quantity}</td>
                  <td>
                    <div className="flex items-center gap-1 text-gray-700">
                      {r.referenceType === 'PROJECT' && <Briefcase size={14}/>}
                      {r.referenceType === 'PRODUCTION' && <FileText size={14}/>}
                      <span className="font-medium">{r.referenceType}: {r.referenceId || 'N/A'}</span>
                    </div>
                    {r.notes && <div className="text-sm text-gray-500 mt-1">{r.notes}</div>}
                  </td>
                  <td>
                    <div className="flex items-center gap-1 text-gray-600">
                      <Clock size={14}/> {new Date(r.reservedAt).toLocaleDateString('vi-VN')}
                    </div>
                  </td>
                  <td>
                    {r.status === 'ACTIVE' && <span className="badge bg-blue-100 text-blue-800"><Lock size={12} className="inline mr-1"/> Đang giữ</span>}
                    {r.status === 'ISSUED' && <span className="badge bg-green-100 text-green-800"><FileText size={12} className="inline mr-1"/> Đã xuất</span>}
                    {r.status === 'CANCELLED' && <span className="badge bg-gray-100 text-gray-600"><Unlock size={12} className="inline mr-1"/> Đã hủy</span>}
                  </td>
                  <td>
                    {r.status === 'ACTIVE' && (
                      <button className="text-red-600 hover:text-red-800 text-sm font-medium" onClick={() => handleCancel(r.id)}>
                        Hủy giữ
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-500">Chưa có dữ liệu đặt giữ nào.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
