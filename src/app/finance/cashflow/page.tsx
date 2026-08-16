'use client';

import { Activity, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import Link from 'next/link';

export default function CashflowPage() {
  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Activity className="text-primary" size={24} />
            Báo Cáo Dòng Tiền
          </h1>
          <p className="page-subtitle">Phân tích Thu / Chi và dự báo dòng tiền</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="card p-6 bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-blue-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-white/20 rounded-lg"><DollarSign size={20} /></div>
            <h3 className="font-medium text-blue-100">Số Dư Hiện Tại</h3>
          </div>
          <p className="text-3xl font-bold">1,250,000,000 đ</p>
        </div>
        
        <div className="card p-6 bg-gradient-to-br from-green-500 to-green-600 text-white shadow-green-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-white/20 rounded-lg"><TrendingUp size={20} /></div>
            <h3 className="font-medium text-green-100">Tổng Thu (Tháng)</h3>
          </div>
          <p className="text-3xl font-bold">+450,000,000 đ</p>
        </div>
        
        <div className="card p-6 bg-gradient-to-br from-red-500 to-red-600 text-white shadow-red-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-white/20 rounded-lg"><TrendingDown size={20} /></div>
            <h3 className="font-medium text-red-100">Tổng Chi (Tháng)</h3>
          </div>
          <p className="text-3xl font-bold">-210,000,000 đ</p>
        </div>
      </div>

      <div className="card p-8 text-center text-gray-500">
        <Activity size={48} className="mx-auto text-gray-300 mb-4" />
        <h3 className="text-lg font-medium text-gray-700 mb-2">Biểu đồ dòng tiền đang được cập nhật</h3>
        <p>Tính năng báo cáo đồ thị chi tiết đang được phát triển trong Sprint tiếp theo.</p>
      </div>
    </div>
  );
}
