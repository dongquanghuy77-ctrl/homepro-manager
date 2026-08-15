'use client';

import { useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, ArrowRightLeft, Search, Calendar, FileText, Package } from 'lucide-react';
import { receiveGoodsAction, issueMaterialAction, transferStockAction } from '../actions';

type Transaction = any; // Type accurately mapped from join
type Material = any;
type Warehouse = any;

export default function TransactionsUI({
  transactions,
  materials,
  warehouses
}: {
  transactions: Transaction[],
  materials: Material[],
  warehouses: Warehouse[]
}) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);

  // Form
  const [selectedMat, setSelectedMat] = useState('');
  const [selectedWh, setSelectedWh] = useState('');
  const [targetWh, setTargetWh] = useState('');
  const [qty, setQty] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');

  const filtered = transactions.filter(t => {
    if (typeFilter && t.movementType !== typeFilter) return false;
    const s = search.toLowerCase();
    if (s && !t.movementNumber.toLowerCase().includes(s) && !t.materialName.toLowerCase().includes(s)) return false;
    return true;
  });

  async function handleReceipt(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      materialId: Number(selectedMat),
      warehouseId: Number(selectedWh),
      quantity: Number(qty),
      unitCost: unitCost ? Number(unitCost) : undefined,
      referenceType: 'MANUAL',
      referenceId: null,
      notes,
      userId: 1 // TODO: get from auth
    };
    const res = await receiveGoodsAction(payload);
    if (res.success) {
      setShowReceiptModal(false);
      window.location.reload();
    } else alert(res.error);
  }

  async function handleIssue(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      materialId: Number(selectedMat),
      warehouseId: Number(selectedWh),
      quantity: Number(qty),
      referenceType: 'MANUAL',
      referenceId: null,
      notes,
      userId: 1 // TODO: get from auth
    };
    const res = await issueMaterialAction(payload);
    if (res.success) {
      setShowIssueModal(false);
      window.location.reload();
    } else alert(res.error);
  }

  async function handleTransfer(e: React.FormEvent) {
    e.preventDefault();
    if (selectedWh === targetWh) {
      alert('Kho chuyển và kho nhận không được trùng nhau!');
      return;
    }
    const payload = {
      materialId: Number(selectedMat),
      fromWarehouseId: Number(selectedWh),
      fromLocationId: null,
      toWarehouseId: Number(targetWh),
      toLocationId: null,
      quantity: Number(qty),
      userId: 1
    };
    const res = await transferStockAction(payload);
    if (res.success) {
      setShowTransferModal(false);
      window.location.reload();
    } else alert(res.error);
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Giao dịch Kho</h1>
          <p className="page-subtitle">Quản lý các phiếu Nhập, Xuất, Chuyển kho nội bộ</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary text-green-700 bg-green-50 border-green-200 hover:bg-green-100" onClick={() => setShowReceiptModal(true)}>
            <ArrowDownLeft size={16} /> Nhập Kho
          </button>
          <button className="btn btn-secondary text-red-700 bg-red-50 border-red-200 hover:bg-red-100" onClick={() => setShowIssueModal(true)}>
            <ArrowUpRight size={16} /> Xuất Kho
          </button>
          <button className="btn btn-secondary text-blue-700 bg-blue-50 border-blue-200 hover:bg-blue-100" onClick={() => setShowTransferModal(true)}>
            <ArrowRightLeft size={16} /> Chuyển Kho
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-header flex items-center gap-4">
          <div className="search-box flex-1">
            <Search size={18} className="search-icon" />
            <input 
              type="text" 
              placeholder="Tìm theo mã phiếu, tên vật tư..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="search-input w-full"
            />
          </div>
          <select className="input max-w-xs" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="">Tất cả loại giao dịch</option>
            <option value="RECEIPT">Nhập kho (RECEIPT)</option>
            <option value="ISSUE">Xuất kho (ISSUE)</option>
            <option value="TRANSFER_IN">Chuyển đến (TRANSFER IN)</option>
            <option value="TRANSFER_OUT">Chuyển đi (TRANSFER OUT)</option>
          </select>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Mã phiếu</th>
                <th>Ngày giao dịch</th>
                <th>Loại</th>
                <th>Vật tư</th>
                <th>Kho</th>
                <th className="text-right">Số lượng</th>
                <th className="text-right">Đơn giá</th>
                <th className="text-right">Tổng tiền</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => {
                const isOut = t.quantity < 0;
                return (
                  <tr key={t.id}>
                    <td className="font-medium text-blue-600">{t.movementNumber}</td>
                    <td>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Calendar size={14} /> {new Date(t.movementDate).toLocaleString('vi-VN')}
                      </div>
                    </td>
                    <td>
                      {t.movementType === 'RECEIPT' && <span className="badge bg-green-100 text-green-800">Nhập kho</span>}
                      {t.movementType === 'ISSUE' && <span className="badge bg-red-100 text-red-800">Xuất kho</span>}
                      {t.movementType.includes('TRANSFER') && <span className="badge bg-blue-100 text-blue-800">Chuyển kho</span>}
                    </td>
                    <td>
                      <div className="flex items-center gap-2 font-medium">
                        <Package size={14} className="text-gray-400" /> {t.materialName}
                      </div>
                    </td>
                    <td>{t.warehouseName}</td>
                    <td className={`text-right font-bold ${isOut ? 'text-red-600' : 'text-green-600'}`}>
                      {isOut ? '' : '+'}{t.quantity}
                    </td>
                    <td className="text-right text-gray-500">{new Intl.NumberFormat('vi-VN').format(t.unitCost)}</td>
                    <td className="text-right font-medium">{new Intl.NumberFormat('vi-VN').format(t.totalCost)}</td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-gray-500">Không tìm thấy giao dịch nào.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* RECEIPT MODAL */}
      {showReceiptModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h3 className="modal-title flex items-center gap-2"><ArrowDownLeft size={18} className="text-green-600" /> Nhập Kho Thủ Công</h3>
              <button className="modal-close" onClick={() => setShowReceiptModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleReceipt} className="grid grid-cols-2 gap-4">
                <div className="form-group col-span-2">
                  <label>Vật tư *</label>
                  <select required className="input" value={selectedMat} onChange={e=>setSelectedMat(e.target.value)}>
                    <option value="">-- Chọn Vật Tư --</option>
                    {materials.map(m => <option key={m.id} value={m.id}>[{m.code}] {m.name}</option>)}
                  </select>
                </div>
                <div className="form-group col-span-2">
                  <label>Nhập vào Kho *</label>
                  <select required className="input" value={selectedWh} onChange={e=>setSelectedWh(e.target.value)}>
                    <option value="">-- Chọn Kho --</option>
                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Số lượng *</label>
                  <input required type="number" step="0.01" className="input" value={qty} onChange={e=>setQty(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Đơn giá nhập (Tùy chọn)</label>
                  <input type="number" className="input" value={unitCost} onChange={e=>setUnitCost(e.target.value)} />
                </div>
                <div className="form-group col-span-2">
                  <label>Ghi chú</label>
                  <input className="input" value={notes} onChange={e=>setNotes(e.target.value)} />
                </div>
                <div className="col-span-2 flex justify-end gap-3 mt-4">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowReceiptModal(false)}>Hủy</button>
                  <button type="submit" className="btn btn-primary bg-green-600 hover:bg-green-700 border-none">Xác nhận Nhập Kho</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ISSUE MODAL */}
      {showIssueModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h3 className="modal-title flex items-center gap-2"><ArrowUpRight size={18} className="text-red-600" /> Xuất Kho Thủ Công</h3>
              <button className="modal-close" onClick={() => setShowIssueModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleIssue} className="grid grid-cols-2 gap-4">
                <div className="form-group col-span-2">
                  <label>Vật tư *</label>
                  <select required className="input" value={selectedMat} onChange={e=>setSelectedMat(e.target.value)}>
                    <option value="">-- Chọn Vật Tư --</option>
                    {materials.map(m => <option key={m.id} value={m.id}>[{m.code}] {m.name} (Tồn: {m.stockQty})</option>)}
                  </select>
                </div>
                <div className="form-group col-span-2">
                  <label>Xuất từ Kho *</label>
                  <select required className="input" value={selectedWh} onChange={e=>setSelectedWh(e.target.value)}>
                    <option value="">-- Chọn Kho --</option>
                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Số lượng cần xuất *</label>
                  <input required type="number" step="0.01" className="input" value={qty} onChange={e=>setQty(e.target.value)} />
                </div>
                <div className="form-group col-span-2">
                  <label>Ghi chú</label>
                  <input className="input" value={notes} onChange={e=>setNotes(e.target.value)} />
                </div>
                <div className="col-span-2 flex justify-end gap-3 mt-4">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowIssueModal(false)}>Hủy</button>
                  <button type="submit" className="btn btn-primary bg-red-600 hover:bg-red-700 border-none">Xác nhận Xuất Kho</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* TRANSFER MODAL */}
      {showTransferModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h3 className="modal-title flex items-center gap-2"><ArrowRightLeft size={18} className="text-blue-600" /> Chuyển Kho Nội Bộ</h3>
              <button className="modal-close" onClick={() => setShowTransferModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleTransfer} className="grid grid-cols-2 gap-4">
                <div className="form-group col-span-2">
                  <label>Vật tư *</label>
                  <select required className="input" value={selectedMat} onChange={e=>setSelectedMat(e.target.value)}>
                    <option value="">-- Chọn Vật Tư --</option>
                    {materials.map(m => <option key={m.id} value={m.id}>[{m.code}] {m.name} (Tồn: {m.stockQty})</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Từ Kho (Xuất) *</label>
                  <select required className="input" value={selectedWh} onChange={e=>setSelectedWh(e.target.value)}>
                    <option value="">-- Kho xuất --</option>
                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Đến Kho (Nhập) *</label>
                  <select required className="input" value={targetWh} onChange={e=>setTargetWh(e.target.value)}>
                    <option value="">-- Kho nhận --</option>
                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
                <div className="form-group col-span-2">
                  <label>Số lượng chuyển *</label>
                  <input required type="number" step="0.01" className="input" value={qty} onChange={e=>setQty(e.target.value)} />
                </div>
                <div className="col-span-2 flex justify-end gap-3 mt-4">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowTransferModal(false)}>Hủy</button>
                  <button type="submit" className="btn btn-primary bg-blue-600 hover:bg-blue-700 border-none">Xác nhận Chuyển Kho</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
