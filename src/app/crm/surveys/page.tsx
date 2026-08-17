'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, Plus, Filter, Eye } from 'lucide-react';

interface Survey {
  id: string;
  code: string;
  surveyDate: string;
  location: string;
  constructionType: string;
  area: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  surveyor: string;
}

export default function SurveysPage() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    const fetchSurveys = async () => {
      try {
        setIsLoading(true);
        const res = await fetch('/api/crm/surveys');
        if (!res.ok) throw new Error('Failed to fetch surveys');
        const data = await res.json();
        setSurveys(data.surveys || data);
      } catch (err: any) {
        setError(err.message || 'Something went wrong');
      } finally {
        setIsLoading(false);
      }
    };
    fetchSurveys();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'badge badge-success';
      case 'IN_PROGRESS': return 'badge badge-primary';
      case 'CANCELLED': return 'badge badge-danger';
      default: return 'badge badge-warning';
    }
  };

  const filteredSurveys = surveys.filter(survey => {
    const matchesSearch = survey.code.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          survey.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter ? survey.status === statusFilter : true;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Khảo sát</h1>
          <p className="page-subtitle">Quản lý danh sách khảo sát công trình</p>
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
              placeholder="Tìm kiếm theo mã, địa điểm..." 
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
              <option value="PENDING">Chờ xử lý</option>
              <option value="IN_PROGRESS">Đang tiến hành</option>
              <option value="COMPLETED">Hoàn thành</option>
              <option value="CANCELLED">Đã hủy</option>
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
        ) : filteredSurveys.length === 0 ? (
          <div className="p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
              <Search size={32} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">Không tìm thấy khảo sát</h3>
            <p className="text-gray-500 mt-1">Vui lòng thử lại với từ khóa khác hoặc tạo mới.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="p-4 font-medium text-gray-600">Mã khảo sát</th>
                  <th className="p-4 font-medium text-gray-600">Ngày khảo sát</th>
                  <th className="p-4 font-medium text-gray-600">Địa điểm</th>
                  <th className="p-4 font-medium text-gray-600">Loại công trình</th>
                  <th className="p-4 font-medium text-gray-600">Diện tích</th>
                  <th className="p-4 font-medium text-gray-600">Người khảo sát</th>
                  <th className="p-4 font-medium text-gray-600">Trạng thái</th>
                  <th className="p-4 font-medium text-gray-600">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredSurveys.map((survey) => (
                  <tr key={survey.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="p-4 font-medium">{survey.code}</td>
                    <td className="p-4">{new Date(survey.surveyDate).toLocaleDateString('vi-VN')}</td>
                    <td className="p-4">{survey.location}</td>
                    <td className="p-4">{survey.constructionType}</td>
                    <td className="p-4">{survey.area} m²</td>
                    <td className="p-4">{survey.surveyor}</td>
                    <td className="p-4">
                      <span className={getStatusBadge(survey.status)}>
                        {survey.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <Link href={`/crm/surveys/${survey.id}`} className="text-blue-600 hover:text-blue-800 flex items-center gap-1">
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
