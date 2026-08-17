'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, User, Users, Phone, Mail, MapPin, Briefcase, FileText, Folder, CheckCircle, Clock, Activity, Edit, DollarSign } from 'lucide-react';

export default function Customer360Page() {
  const { id } = useParams();
  const router = useRouter();
  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/crm/customers/${id}`);
        const json = await res.json();
        if (json.success) {
          setCustomer(json.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) return <div className="page-container p-8 text-center text-gray-500">Đang tải dữ liệu khách hàng 360...</div>;
  if (!customer) return <div className="page-container p-8 text-center text-red-500">Không tìm thấy thông tin khách hàng.</div>;

  const tabs = [
    { id: 'overview', label: 'Tổng quan', icon: User },
    { id: 'contacts', label: 'Người liên hệ', icon: Users }, // Oh wait, lucide Users is not imported
    { id: 'opportunities', label: 'Cơ hội (Pipeline)', icon: Briefcase },
    { id: 'quotes', label: 'Báo giá', icon: FileText },
    { id: 'projects', label: 'Dự án / Hợp đồng', icon: Folder },
    { id: 'finance', label: 'Công nợ', icon: DollarSign },
    { id: 'timeline', label: 'Lịch sử & Hoạt động', icon: Activity },
  ];

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft size={20} className="text-gray-600" />
        </button>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-800">{customer.name}</h1>
            <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
              {customer.customerType === 'ENTERPRISE' ? 'Doanh nghiệp' : 'Cá nhân'}
            </span>
            {customer.code && <span className="text-sm font-medium text-gray-400">#{customer.code}</span>}
          </div>
          <p className="text-sm text-gray-500 mt-1 flex items-center gap-4">
            {customer.phone && <span className="flex items-center gap-1"><Phone size={14}/> {customer.phone}</span>}
            {customer.email && <span className="flex items-center gap-1"><Mail size={14}/> {customer.email}</span>}
          </p>
        </div>
        <div className="ml-auto">
          <button className="btn btn-secondary flex items-center gap-2">
            <Edit size={16} /> Cập nhật
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <div className="card p-5">
            <h3 className="font-bold text-gray-800 mb-4 text-sm uppercase tracking-wider">Thông tin chi tiết</h3>
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-gray-500 mb-1 flex items-center gap-2"><MapPin size={14}/> Địa chỉ Hóa đơn</p>
                <p className="font-medium text-gray-800">{customer.address || '—'}</p>
              </div>
              <div>
                <p className="text-gray-500 mb-1 flex items-center gap-2"><MapPin size={14}/> Địa chỉ Công trình</p>
                <p className="font-medium text-gray-800">{customer.projectAddress || '—'}</p>
              </div>
              <div>
                <p className="text-gray-500 mb-1">Mã số thuế</p>
                <p className="font-medium text-gray-800">{customer.taxCode || '—'}</p>
              </div>
              <div>
                <p className="text-gray-500 mb-1">Nhóm khách hàng</p>
                <p className="font-medium text-gray-800">{customer.customerGroup || 'Chưa phân loại'}</p>
              </div>
            </div>
          </div>
          
          <div className="card p-5">
            <h3 className="font-bold text-gray-800 mb-4 text-sm uppercase tracking-wider">Chỉ số tài chính</h3>
            <div className="space-y-4">
              <div>
                <p className="text-gray-500 text-sm mb-1">Tổng giá trị hợp đồng</p>
                <p className="text-xl font-bold text-gray-800">
                  {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(customer.totalContractValue || 0)}
                </p>
              </div>
              <div>
                <p className="text-gray-500 text-sm mb-1">Tổng công nợ hiện tại</p>
                <p className="text-xl font-bold text-red-600">
                  {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(customer.totalDebt || 0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Content */}
        <div className="lg:col-span-3">
          <div className="card p-2 mb-6">
            <div className="flex overflow-x-auto gap-2">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
                    activeTab === tab.id 
                      ? 'bg-primary text-white shadow-sm' 
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <tab.icon size={16} /> {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="card p-6 min-h-[400px]">
            {activeTab === 'overview' && (
              <div>
                <h3 className="font-bold text-lg mb-4 text-gray-800">Ghi chú chung</h3>
                <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl text-amber-900 text-sm mb-8 whitespace-pre-line">
                  {customer.notes || 'Không có ghi chú.'}
                </div>
                
                <h3 className="font-bold text-lg mb-4 text-gray-800">Cơ hội đang mở (Gần nhất)</h3>
                <div className="border border-gray-100 rounded-xl divide-y divide-gray-100">
                  {/* Placeholder for now */}
                  <div className="p-4 text-center text-sm text-gray-500">Chưa có dữ liệu cơ hội</div>
                </div>
              </div>
            )}
            {activeTab === 'contacts' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-lg text-gray-800">Người liên hệ</h3>
                  <button className="btn btn-primary btn-sm">Thêm liên hệ</button>
                </div>
                {/* Contact list placeholder */}
                <div className="border border-gray-100 rounded-xl p-4 text-center text-sm text-gray-500">Chưa có người liên hệ</div>
              </div>
            )}
            {activeTab !== 'overview' && activeTab !== 'contacts' && (
              <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                <Activity size={48} className="mb-4 opacity-20" />
                <p>Mô đun {tabs.find(t => t.id === activeTab)?.label} đang được phát triển</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
