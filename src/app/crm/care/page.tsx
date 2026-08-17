'use client';

import React, { useEffect, useState } from 'react';
import { Phone, Users, Mail, FileText, CheckSquare, Plus, Filter, Calendar } from 'lucide-react';

interface Activity {
  id: string;
  type: 'CALL' | 'MEETING' | 'EMAIL' | 'NOTE' | 'TASK';
  title: string;
  description: string;
  date: string;
  status: 'TODO' | 'IN_PROGRESS' | 'DONE';
  customerName: string;
  assignee: string;
}

export default function CustomerCarePage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        setIsLoading(true);
        const res = await fetch('/api/crm/activities');
        if (!res.ok) throw new Error('Failed to fetch activities');
        const data = await res.json();
        setActivities(data.activities || data);
      } catch (err: any) {
        setError(err.message || 'Something went wrong');
      } finally {
        setIsLoading(false);
      }
    };
    fetchActivities();
  }, []);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'CALL': return <Phone size={20} className="text-blue-500" />;
      case 'MEETING': return <Users size={20} className="text-purple-500" />;
      case 'EMAIL': return <Mail size={20} className="text-green-500" />;
      case 'NOTE': return <FileText size={20} className="text-yellow-500" />;
      case 'TASK': return <CheckSquare size={20} className="text-red-500" />;
      default: return <FileText size={20} className="text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DONE': return 'badge badge-success';
      case 'IN_PROGRESS': return 'badge badge-primary';
      case 'TODO': return 'badge badge-warning';
      default: return 'badge badge-secondary';
    }
  };

  const filteredActivities = activities.filter(activity => {
    const matchesType = typeFilter ? activity.type === typeFilter : true;
    const matchesStatus = statusFilter ? activity.status === statusFilter : true;
    return matchesType && matchesStatus;
  });

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Chăm sóc khách hàng</h1>
          <p className="page-subtitle">Nhật ký hoạt động và tương tác với khách hàng</p>
        </div>
        <button className="btn btn-primary flex items-center gap-2">
          <Plus size={16} /> Tạo hoạt động
        </button>
      </div>

      <div className="card p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex items-center gap-2 flex-1">
            <Filter size={18} className="text-gray-500" />
            <select 
              className="form-input w-full"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="">Tất cả loại hoạt động</option>
              <option value="CALL">Gọi điện</option>
              <option value="MEETING">Hẹn gặp</option>
              <option value="EMAIL">Email</option>
              <option value="NOTE">Ghi chú</option>
              <option value="TASK">Nhiệm vụ</option>
            </select>
          </div>
          <div className="flex items-center gap-2 flex-1">
            <select 
              className="form-input w-full"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">Tất cả trạng thái</option>
              <option value="TODO">Cần làm</option>
              <option value="IN_PROGRESS">Đang thực hiện</option>
              <option value="DONE">Đã hoàn thành</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card p-6">
        {isLoading ? (
          <div className="p-8 text-center flex justify-center items-center">
            <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="ml-3 text-gray-500">Đang tải dữ liệu...</span>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-500">{error}</div>
        ) : filteredActivities.length === 0 ? (
          <div className="p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
              <Calendar size={32} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">Không tìm thấy hoạt động nào</h3>
            <p className="text-gray-500 mt-1">Hãy tạo mới một hoạt động để bắt đầu.</p>
          </div>
        ) : (
          <div className="relative border-l-2 border-gray-200 ml-3 pl-6 space-y-8 py-4">
            {filteredActivities.map((activity) => (
              <div key={activity.id} className="relative">
                <div className="absolute -left-[35px] bg-white p-1 rounded-full border border-gray-200 shadow-sm">
                  {getActivityIcon(activity.type)}
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="text-md font-semibold text-gray-900">{activity.title}</h4>
                      <p className="text-sm text-gray-500 mt-1">Khách hàng: <span className="font-medium text-gray-700">{activity.customerName}</span></p>
                    </div>
                    <span className={getStatusBadge(activity.status)}>
                      {activity.status}
                    </span>
                  </div>
                  <p className="text-gray-600 mt-2 text-sm whitespace-pre-line">{activity.description}</p>
                  <div className="mt-4 pt-3 border-t border-gray-200 flex justify-between items-center text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Calendar size={14} /> {new Date(activity.date).toLocaleString('vi-VN')}
                    </span>
                    <span>Phụ trách: <strong>{activity.assignee}</strong></span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
