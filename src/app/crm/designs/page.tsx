'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, Plus, Filter, Eye } from 'lucide-react';

interface Design {
  id: string;
  version: string;
  project: { id: string, name: string };
  designer: string;
  createdAt: string;
  status: 'DRAFT' | 'INTERNAL_REVIEW' | 'CUSTOMER_REVIEW' | 'REVISION' | 'APPROVED';
  customerApproved: boolean;
}

export default function DesignsPage() {
  const [designs, setDesigns] = useState<Design[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    const fetchDesigns = async () => {
      try {
        setIsLoading(true);
        const res = await fetch('/api/crm/designs');
        if (!res.ok) throw new Error('Failed to fetch designs');
        const data = await res.json();
        setDesigns(data.designs || data);
      } catch (err: any) {
        setError(err.message || 'Something went wrong');
      } finally {
        setIsLoading(false);
      }
    };
    fetchDesigns();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'badge badge-success';
      case 'CUSTOMER_REVIEW': return 'badge badge-primary';
      case 'INTERNAL_REVIEW': return 'badge badge-warning';
      case 'REVISION': return 'badge badge-danger';
      default: return 'badge badge-secondary';
    }
  };

  const filteredDesigns = designs.filter(design => {
    const matchesSearch = design.project?.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          design.version.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter ? design.status === statusFilter : true;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Thiết kế</h1>
          <p className="page-subtitle">Quản lý các phiên bản thiết kế của dự án</p>
        </div>
        <button className="btn btn-primary flex items-center gap-2">
          <Plus size={16} /> Tạo mới
        </button>
      </div>

      <div className="card p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Tìm kiếm theo dự án, phiên bản..." 
              className="form-input pl-10 w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-gray-500" />
            <select 
              className="form-input"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">Tất cả trạng thái</option>
              <option value="DRAFT">Bản nháp</option>
              <option value="INTERNAL_REVIEW">Chờ duyệt nội bộ</option>
              <option value="CUSTOMER_REVIEW">Khách hàng đang duyệt</option>
              <option value="REVISION">Cần chỉnh sửa</option>
              <option value="APPROVED">Đã phê duyệt</option>
            </select>
          </div>
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
        ) : filteredDesigns.length === 0 ? (
          <div className="p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
              <Search size={32} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">Không tìm thấy thiết kế</h3>
            <p className="text-gray-500 mt-1">Vui lòng thử lại với từ khóa khác.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="p-4 font-medium text-gray-600">Phiên bản</th>
                  <th className="p-4 font-medium text-gray-600">Dự án</th>
                  <th className="p-4 font-medium text-gray-600">Người thiết kế</th>
                  <th className="p-4 font-medium text-gray-600">Ngày tạo</th>
                  <th className="p-4 font-medium text-gray-600">Trạng thái</th>
                  <th className="p-4 font-medium text-gray-600">Khách duyệt</th>
                  <th className="p-4 font-medium text-gray-600">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredDesigns.map((design) => (
                  <tr key={design.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="p-4 font-medium">{design.version}</td>
                    <td className="p-4">{design.project?.name || 'N/A'}</td>
                    <td className="p-4">{design.designer}</td>
                    <td className="p-4">{new Date(design.createdAt).toLocaleDateString('vi-VN')}</td>
                    <td className="p-4">
                      <span className={getStatusBadge(design.status)}>
                        {design.status}
                      </span>
                    </td>
                    <td className="p-4">
                      {design.customerApproved ? (
                        <span className="text-green-600 font-medium">Đã duyệt</span>
                      ) : (
                        <span className="text-gray-400">Chưa duyệt</span>
                      )}
                    </td>
                    <td className="p-4">
                      <Link href={`/crm/designs/${design.id}`} className="text-blue-600 hover:text-blue-800 flex items-center gap-1">
                        <Eye size={16} /> Chi tiết
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
