'use client';

import { DollarSign, PackageOpen, TrendingUp, AlertTriangle } from 'lucide-react';

export default function DashboardUI({ balances, recentTx }: { balances: any[], recentTx: any[] }) {
  const totalValue = balances.reduce((sum, b) => sum + (Number(b.quantity) * Number(b.unitCost || 0)), 0);
  const lowStock = balances.filter(b => Number(b.availableQuantity) < 10).length; // naive 10, real app uses minStock

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Tổng quan Kho</h1>
          <p className="page-subtitle">Thống kê giá trị tồn kho và cảnh báo tự động</p>
        </div>
      </div>

      <div className="qc-stats-grid mb-8">
        <div className="qc-stat-card">
          <div className="qc-stat-icon bg-blue-100 text-blue-600"><DollarSign size={24} /></div>
          <div>
            <div className="qc-stat-value">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(totalValue)}</div>
            <div className="qc-stat-label">Tổng Giá Trị Tồn Kho</div>
          </div>
        </div>
        <div className="qc-stat-card">
          <div className="qc-stat-icon bg-green-100 text-green-600"><PackageOpen size={24} /></div>
          <div>
            <div className="qc-stat-value">{balances.length}</div>
            <div className="qc-stat-label">Mã vật tư có trong kho</div>
          </div>
        </div>
        <div className="qc-stat-card">
          <div className="qc-stat-icon bg-orange-100 text-orange-600"><TrendingUp size={24} /></div>
          <div>
            <div className="qc-stat-value">{recentTx.length}</div>
            <div className="qc-stat-label">Giao dịch gần đây</div>
          </div>
        </div>
        <div className="qc-stat-card border-red-200">
          <div className="qc-stat-icon bg-red-100 text-red-600"><AlertTriangle size={24} /></div>
          <div>
            <div className="qc-stat-value text-red-600">{lowStock}</div>
            <div className="qc-stat-label">Vật tư sắp hết (Dưới mức Min)</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="card-header border-b pb-3 mb-3">
            <h3 className="font-semibold text-gray-800">Top Vật Tư Tồn Kho (Giá Trị)</h3>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Vật tư</th>
                <th>Kho</th>
                <th className="text-right">Số lượng</th>
                <th className="text-right">Giá trị</th>
              </tr>
            </thead>
            <tbody>
              {balances.sort((a,b) => (b.quantity * b.unitCost) - (a.quantity * a.unitCost)).slice(0, 5).map(b => (
                <tr key={b.id}>
                  <td className="font-medium text-gray-800">{b.materialName}</td>
                  <td><span className="badge badge-gray">{b.warehouseName}</span></td>
                  <td className="text-right">{b.quantity}</td>
                  <td className="text-right font-medium">{new Intl.NumberFormat('vi-VN').format(b.quantity * b.unitCost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card">
          <div className="card-header border-b pb-3 mb-3">
            <h3 className="font-semibold text-gray-800">Giao dịch mới nhất</h3>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Mã phiếu</th>
                <th>Vật tư</th>
                <th>Loại</th>
                <th className="text-right">Số lượng</th>
              </tr>
            </thead>
            <tbody>
              {recentTx.map(t => (
                <tr key={t.id}>
                  <td className="text-blue-600 text-sm font-medium">{t.movementNumber}</td>
                  <td>{t.materialName}</td>
                  <td>
                    {t.movementType === 'RECEIPT' ? <span className="text-green-600 text-xs font-bold">NHẬP</span> : <span className="text-red-600 text-xs font-bold">XUẤT</span>}
                  </td>
                  <td className="text-right font-semibold">{t.quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {lowStock > 0 && (
        <div className="card mt-6 border-red-200">
          <div className="card-header border-b pb-3 mb-3 bg-red-50">
            <h3 className="font-semibold text-red-800 flex items-center gap-2"><AlertTriangle size={18} /> Danh sách Cảnh báo Vật tư dưới mức Min (Dưới 10)</h3>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Mã vật tư</th>
                <th>Tên vật tư</th>
                <th>Kho</th>
                <th className="text-right">Tồn khả dụng</th>
                <th className="text-right">Cần mua thêm (Dự kiến)</th>
              </tr>
            </thead>
            <tbody>
              {balances.filter(b => Number(b.availableQuantity) < 10).map(b => (
                <tr key={b.id} className="bg-red-50/50">
                  <td className="font-medium text-gray-800">{b.materialCode}</td>
                  <td>{b.materialName}</td>
                  <td>{b.warehouseName}</td>
                  <td className="text-right font-bold text-red-600">{b.availableQuantity}</td>
                  <td className="text-right font-medium text-orange-600">+{10 - Number(b.availableQuantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

