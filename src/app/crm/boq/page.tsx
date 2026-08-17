'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, ExternalLink, FileSpreadsheet } from 'lucide-react';

interface BOQ {
  id: string;
  code: string;
  projectId: string;
  projectName: string;
  totalAmount: number;
  status: 'DRAFT' | 'APPROVED' | 'REJECTED' | 'REVISION';
  createdAt: string;
}

export default function BOQPage() {
  const [boqs, setBoqs] = useState<BOQ[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchBOQs = async () => {
      try {
        setIsLoading(true);
        const res = await fetch('/api/crm/boq');
        if (!res.ok) throw new Error('Failed to fetch BOQ list');
        const data = await res.json();
        setBoqs(data.boqs || data);
      } catch (err: any) {
        setError(err.message || 'Something went wrong');
      } finally {
        setIsLoading(false);
      }
    };
    fetchBOQs();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'badge badge-success';
      case 'DRAFT': return 'badge badge-secondary';
      case 'REJECTED': return 'badge badge-danger';
      case 'REVISION': return 'badge badge-warning';
      default: return 'badge badge-secondary';
    }
  };

  const filteredBoqs = boqs.filter(boq => 
    boq.code.toLowerCase().includes(searchQuery.toLowerCase()) || 
    boq.projectName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Bảng khối lượng (BOQ)</h1>
          <p className="page-subtitle">Quản lý BOQ tổng quan từ CRM</p>
        </div>
        <Link href="/bom" className="btn btn-primary flex items-center gap-2">
          <FileSpreadsheet size={16} /> Mở BOQ Đầy đủ
        </Link>
      </div>

      <div className="card p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Tìm kiếm theo mã BOQ, tên dự án..." 
            className="form-input pl-10 w-full md:w-1/2"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center flex justify-center items-center">
            <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="ml-3 text-gray-500">Đang tải dữ liệu...</span>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-500">{error}</div>
        ) : filteredBoqs.length === 0 ? (
          <div className="p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
              <Search size={32} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">Không tìm thấy BOQ</h3>
            <p className="text-gray-500 mt-1">Chưa có bảng khối lượng nào được tạo hoặc không phù hợp với tìm kiếm.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="p-4 font-medium text-gray-600">Mã BOQ</th>
                  <th className="p-4 font-medium text-gray-600">Dự án liên kết</th>
                  <th className="p-4 font-medium text-gray-600">Tổng giá trị</th>
                  <th className="p-4 font-medium text-gray-600">Ngày tạo</th>
                  <th className="p-4 font-medium text-gray-600">Trạng thái</th>
                  <th className="p-4 font-medium text-gray-600">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredBoqs.map((boq) => (
                  <tr key={boq.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="p-4 font-medium">{boq.code}</td>
                    <td className="p-4">
                      <Link href={`/crm/opportunities/${boq.projectId}`} className="text-blue-600 hover:underline">
                        {boq.projectName}
                      </Link>
                    </td>
                    <td className="p-4 font-medium text-green-600">
                      {boq.totalAmount.toLocaleString('vi-VN')} VNĐ
                    </td>
                    <td className="p-4">{new Date(boq.createdAt).toLocaleDateString('vi-VN')}</td>
                    <td className="p-4">
                      <span className={getStatusBadge(boq.status)}>
                        {boq.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <Link href={`/bom/${boq.id}`} className="text-gray-500 hover:text-blue-600 flex items-center gap-1">
                        <ExternalLink size={16} /> Chi tiết BOM
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
