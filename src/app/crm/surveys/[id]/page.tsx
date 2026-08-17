'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Trash2, MapPin, Building, Ruler, Info, Calendar, DollarSign } from 'lucide-react';
import Link from 'next/link';

interface SurveyDetail {
  id: string;
  code: string;
  surveyDate: string;
  location: string;
  constructionType: string;
  area: number;
  rooms: number;
  floors: number;
  style: string;
  materials: string;
  colors: string;
  equipment: string;
  budget: number;
  expectedSchedule: string;
  specialRequests: string;
  notes: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  surveyor: string;
}

export default function SurveyDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [survey, setSurvey] = useState<SurveyDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('');

  useEffect(() => {
    const fetchSurvey = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(`/api/crm/surveys/${params.id}`);
        if (!res.ok) {
          if (res.status === 404) throw new Error('Không tìm thấy khảo sát');
          throw new Error('Failed to fetch survey details');
        }
        const data = await res.json();
        setSurvey(data);
        setStatus(data.status);
      } catch (err: any) {
        setError(err.message || 'Something went wrong');
      } finally {
        setIsLoading(false);
      }
    };
    fetchSurvey();
  }, [params.id]);

  const handleStatusChange = async () => {
    if (!survey || status === survey.status) return;
    try {
      const res = await fetch(`/api/crm/surveys/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (!res.ok) throw new Error('Failed to update status');
      setSurvey({ ...survey, status: status as any });
      alert('Cập nhật trạng thái thành công');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Bạn có chắc chắn muốn xóa khảo sát này?')) return;
    try {
      const res = await fetch(`/api/crm/surveys/${params.id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete survey');
      router.push('/crm/surveys');
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

  if (error || !survey) {
    return (
      <div className="page-container">
        <div className="card p-8 text-center">
          <p className="text-red-500 mb-4">{error || 'Không tìm thấy dữ liệu'}</p>
          <Link href="/crm/surveys" className="btn btn-secondary">Quay lại danh sách</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="flex items-center mb-6">
        <Link href="/crm/surveys" className="text-gray-500 hover:text-gray-900 mr-4">
          <ArrowLeft size={24} />
        </Link>
        <div>
          <h1 className="page-title">Chi tiết khảo sát: {survey.code}</h1>
          <p className="page-subtitle">Cập nhật thông tin và trạng thái khảo sát</p>
        </div>
        
        <div className="ml-auto flex gap-2">
          <button onClick={handleDelete} className="btn btn-secondary text-red-600 border-red-200 hover:bg-red-50">
            <Trash2 size={16} className="mr-2 inline" /> Xóa
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
              <Building size={20} className="text-gray-400" />
              Thông tin công trình
            </h3>
            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
              <div>
                <p className="text-sm text-gray-500">Địa điểm</p>
                <p className="font-medium flex items-center gap-1 mt-1"><MapPin size={16} className="text-gray-400"/> {survey.location}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Loại công trình</p>
                <p className="font-medium mt-1">{survey.constructionType}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Diện tích</p>
                <p className="font-medium flex items-center gap-1 mt-1"><Ruler size={16} className="text-gray-400"/> {survey.area} m²</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Cấu trúc</p>
                <p className="font-medium mt-1">{survey.floors} tầng, {survey.rooms} phòng</p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
              <Info size={20} className="text-gray-400" />
              Yêu cầu thiết kế & Vật liệu
            </h3>
            <div className="grid grid-cols-2 gap-x-8 gap-y-4 mb-4">
              <div>
                <p className="text-sm text-gray-500">Phong cách</p>
                <p className="font-medium mt-1">{survey.style}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Màu sắc chủ đạo</p>
                <p className="font-medium mt-1">{survey.colors}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-gray-500">Vật liệu</p>
                <p className="mt-1 bg-gray-50 p-2 rounded">{survey.materials}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-gray-500">Thiết bị</p>
                <p className="mt-1 bg-gray-50 p-2 rounded">{survey.equipment}</p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Ghi chú & Yêu cầu đặc biệt</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-700">Yêu cầu đặc biệt:</p>
                <p className="mt-1 text-gray-600 bg-yellow-50 p-3 border border-yellow-100 rounded">{survey.specialRequests || 'Không có'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Ghi chú của người khảo sát:</p>
                <p className="mt-1 text-gray-600 whitespace-pre-line bg-gray-50 p-3 rounded">{survey.notes || 'Không có ghi chú'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Trạng thái</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cập nhật trạng thái</label>
                <select 
                  className="form-input w-full"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="PENDING">Chờ xử lý</option>
                  <option value="IN_PROGRESS">Đang tiến hành</option>
                  <option value="COMPLETED">Hoàn thành</option>
                  <option value="CANCELLED">Đã hủy</option>
                </select>
              </div>
              <button 
                onClick={handleStatusChange} 
                disabled={status === survey.status}
                className="btn btn-primary w-full flex justify-center items-center gap-2"
              >
                <Save size={16} /> Lưu trạng thái
              </button>
            </div>
          </div>

          <div className="card p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Thông tin bổ sung</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Người khảo sát</p>
                <p className="font-medium mt-1">{survey.surveyor}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Ngày khảo sát</p>
                <p className="font-medium mt-1 flex items-center gap-1"><Calendar size={16} className="text-gray-400"/> {new Date(survey.surveyDate).toLocaleDateString('vi-VN')}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Ngân sách dự kiến</p>
                <p className="font-medium mt-1 text-green-600 flex items-center gap-1"><DollarSign size={16} /> {survey.budget.toLocaleString('vi-VN')} VNĐ</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Tiến độ mong muốn</p>
                <p className="font-medium mt-1">{survey.expectedSchedule}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
