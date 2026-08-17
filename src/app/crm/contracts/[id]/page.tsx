'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, FileText, User, Calendar, DollarSign, ExternalLink, Briefcase } from 'lucide-react';
import Link from 'next/link';
import { PdfExportButton } from '@/components/bao-minh/PdfExportButton';


interface ContractDetail {
  id: string;
  contractNumber: string;
  customer: { id: string, name: string };
  project: { id: string, name: string };
  value: number;
  signDate: string;
  status: 'DRAFT' | 'SIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  description: string;
  paymentTerms: string;
}

export default function ContractDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [contract, setContract] = useState<ContractDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('');

  useEffect(() => {
    const fetchContract = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(`/api/crm/contracts/${params.id}`);
        if (!res.ok) {
          if (res.status === 404) throw new Error('Không tìm thấy hợp đồng');
          throw new Error('Failed to fetch contract details');
        }
        const data = await res.json();
        setContract(data);
        setStatus(data.status);
      } catch (err: any) {
        setError(err.message || 'Something went wrong');
      } finally {
        setIsLoading(false);
      }
    };
    fetchContract();
  }, [params.id]);

  const handleUpdate = async () => {
    if (!contract || status === contract.status) return;
    try {
      const res = await fetch(`/api/crm/contracts/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (!res.ok) throw new Error('Failed to update contract');
      setContract({ ...contract, status: status as any });
      alert('Cập nhật trạng thái thành công');
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

  if (error || !contract) {
    return (
      <div className="page-container">
        <div className="card p-8 text-center">
          <p className="text-red-500 mb-4">{error || 'Không tìm thấy dữ liệu'}</p>
          <Link href="/crm/contracts" className="btn btn-secondary">Quay lại danh sách</Link>
        </div>
      </div>
    );
  }

  const getStatusBadge = (s: string) => {
    switch (s) {
      case 'COMPLETED': return 'badge badge-success';
      case 'SIGNED': return 'badge badge-primary';
      case 'IN_PROGRESS': return 'badge badge-warning';
      case 'CANCELLED': return 'badge badge-danger';
      default: return 'badge badge-secondary';
    }
  };

  return (
    <div className="page-container">
      <div className="flex items-center mb-6">
        <Link href="/crm/contracts" className="text-gray-500 hover:text-gray-900 mr-4">
          <ArrowLeft size={24} />
        </Link>
        <div className="flex-1">
          <h1 className="page-title">Hợp đồng: {contract.contractNumber}</h1>
          <p className="page-subtitle">Chi tiết và theo dõi trạng thái hợp đồng</p>
        </div>
        <div>
          <PdfExportButton targetId="contract-detail-content" filename={`Hop-Dong-${contract.contractNumber}`} />
        </div>
      </div>

      <div id="contract-detail-content" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
              <FileText size={20} className="text-gray-400" />
              Thông tin chi tiết
            </h3>
            <div className="grid grid-cols-2 gap-x-8 gap-y-6">
              <div>
                <p className="text-sm text-gray-500">Khách hàng</p>
                <div className="flex items-center gap-2 mt-1">
                  <User size={16} className="text-gray-400"/>
                  <Link href={`/crm/customers/${contract.customer?.id}`} className="font-medium text-blue-600 hover:underline">
                    {contract.customer?.name || 'N/A'}
                  </Link>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500">Dự án liên kết</p>
                <div className="flex items-center gap-2 mt-1">
                  <Briefcase size={16} className="text-gray-400"/>
                  <Link href={`/crm/opportunities/${contract.project?.id}`} className="font-medium text-blue-600 hover:underline flex items-center gap-1">
                    {contract.project?.name || 'N/A'} <ExternalLink size={14}/>
                  </Link>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500">Giá trị hợp đồng</p>
                <p className="font-medium mt-1 text-green-600 flex items-center gap-1">
                  <DollarSign size={16} /> {contract.value.toLocaleString('vi-VN')} VNĐ
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Ngày ký</p>
                <p className="font-medium mt-1 flex items-center gap-1">
                  <Calendar size={16} className="text-gray-400"/> {new Date(contract.signDate).toLocaleDateString('vi-VN')}
                </p>
              </div>
            </div>

            <div className="mt-8 border-t border-gray-100 pt-6">
              <p className="text-sm font-medium text-gray-700 mb-2">Mô tả & Điều khoản:</p>
              <div className="bg-gray-50 p-4 rounded text-gray-600 whitespace-pre-line border border-gray-100">
                {contract.description || 'Không có mô tả.'}
              </div>
            </div>
            
            <div className="mt-6">
              <p className="text-sm font-medium text-gray-700 mb-2">Điều khoản thanh toán:</p>
              <div className="bg-blue-50 p-4 rounded text-gray-800 whitespace-pre-line border border-blue-100">
                {contract.paymentTerms || 'Theo thỏa thuận chuẩn.'}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Trạng thái hợp đồng</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm text-gray-500">Trạng thái hiện tại:</span>
                <span className={getStatusBadge(contract.status)}>{contract.status}</span>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cập nhật trạng thái</label>
                <select 
                  className="form-input w-full"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="DRAFT">Nháp</option>
                  <option value="SIGNED">Đã ký</option>
                  <option value="IN_PROGRESS">Đang thực hiện</option>
                  <option value="COMPLETED">Đã hoàn thành</option>
                  <option value="CANCELLED">Đã hủy</option>
                </select>
              </div>

              <button 
                onClick={handleUpdate} 
                disabled={status === contract.status}
                className="btn btn-primary w-full flex justify-center items-center gap-2 mt-4"
              >
                <Save size={16} /> Cập nhật
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
