'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, CheckCircle, XCircle, FileText, User } from 'lucide-react';
import Link from 'next/link';

interface DesignDetail {
  id: string;
  version: string;
  project: { id: string, name: string };
  designer: string;
  createdAt: string;
  status: 'DRAFT' | 'INTERNAL_REVIEW' | 'CUSTOMER_REVIEW' | 'REVISION' | 'APPROVED';
  customerApproved: boolean;
  notes: string;
  files: Array<{ name: string; url: string }>;
}

export default function DesignDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [design, setDesign] = useState<DesignDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [customerApproved, setCustomerApproved] = useState(false);

  useEffect(() => {
    const fetchDesign = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(`/api/crm/designs/${params.id}`);
        if (!res.ok) {
          if (res.status === 404) throw new Error('Không tìm thấy thiết kế');
          throw new Error('Failed to fetch design details');
        }
        const data = await res.json();
        setDesign(data);
        setStatus(data.status);
        setCustomerApproved(data.customerApproved);
      } catch (err: any) {
        setError(err.message || 'Something went wrong');
      } finally {
        setIsLoading(false);
      }
    };
    fetchDesign();
  }, [params.id]);

  const handleUpdate = async () => {
    if (!design) return;
    try {
      const res = await fetch(`/api/crm/designs/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, customerApproved })
      });
      if (!res.ok) throw new Error('Failed to update design');
      setDesign({ ...design, status: status as any, customerApproved });
      alert('Cập nhật thành công');
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (isLoading) {
    return (
      <div className="page-container flex justify-center items-center h-[50vh]">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
        <span className="ml-3 text-gray-500">Đang tải dữ liệu...</span>
      </div>
    );
  }

  if (error || !design) {
    return (
      <div className="page-container">
        <div className="card p-8 text-center">
          <p className="text-red-500 mb-4">{error || 'Không tìm thấy dữ liệu'}</p>
          <Link href="/crm/designs" className="btn btn-secondary">Quay lại danh sách</Link>
        </div>
      </div>
    );
  }

  const getStatusBadge = (s: string) => {
    switch (s) {
      case 'APPROVED': return 'badge badge-success';
      case 'CUSTOMER_REVIEW': return 'badge badge-primary';
      case 'INTERNAL_REVIEW': return 'badge badge-warning';
      case 'REVISION': return 'badge badge-danger';
      default: return 'badge badge-secondary';
    }
  };

  return (
    <div className="page-container">
      <div className="flex items-center mb-6">
        <Link href="/crm/designs" className="text-gray-500 hover:text-gray-900 mr-4">
          <ArrowLeft size={24} />
        </Link>
        <div>
          <h1 className="page-title">Chi tiết thiết kế: {design.version}</h1>
          <p className="page-subtitle">Dự án: {design.project?.name}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className={getStatusBadge(design.status)}>{design.status}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
              <FileText size={20} className="text-gray-400" />
              Tài liệu & File đính kèm
            </h3>
            {design.files && design.files.length > 0 ? (
              <ul className="space-y-2">
                {design.files.map((file, idx) => (
                  <li key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded border border-gray-100">
                    <span className="font-medium text-gray-700">{file.name}</span>
                    <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">Tải xuống</a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 italic">Không có file đính kèm</p>
            )}
            
            <div className="mt-6">
              <p className="text-sm font-medium text-gray-700 mb-2">Ghi chú:</p>
              <div className="bg-gray-50 p-4 rounded text-gray-600 whitespace-pre-line border border-gray-100">
                {design.notes || 'Không có ghi chú.'}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Quy trình duyệt</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái (Workflow)</label>
                <select 
                  className="form-input w-full"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="DRAFT">Bản nháp</option>
                  <option value="INTERNAL_REVIEW">Chờ duyệt nội bộ</option>
                  <option value="CUSTOMER_REVIEW">Khách hàng đang duyệt</option>
                  <option value="REVISION">Cần chỉnh sửa</option>
                  <option value="APPROVED">Đã phê duyệt</option>
                </select>
              </div>
              
              <div className="flex items-center gap-2 mt-4">
                <input 
                  type="checkbox" 
                  id="customerApproved" 
                  checked={customerApproved}
                  onChange={(e) => setCustomerApproved(e.target.checked)}
                  className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                />
                <label htmlFor="customerApproved" className="text-sm text-gray-700 font-medium">Khách hàng đã duyệt</label>
              </div>

              <button 
                onClick={handleUpdate} 
                disabled={status === design.status && customerApproved === design.customerApproved}
                className="btn btn-primary w-full flex justify-center items-center gap-2 mt-4"
              >
                <Save size={16} /> Cập nhật
              </button>
            </div>
          </div>

          <div className="card p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Thông tin chung</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Người thiết kế</p>
                <p className="font-medium mt-1 flex items-center gap-1"><User size={16} className="text-gray-400"/> {design.designer}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Ngày tạo</p>
                <p className="font-medium mt-1">{new Date(design.createdAt).toLocaleDateString('vi-VN')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
