'use client';

import React from 'react';
import { formatDate } from '@/lib/utils'; // Assuming this exists

interface Activity {
  id: number;
  action: string;
  actorName: string;
  time: string;
}

export function ActivityFeed({ activities }: { activities: Activity[] }) {
  if (!activities || activities.length === 0) {
    return (
      <div className="card h-full" style={{ border: '1px solid var(--color-border-light)', borderRadius: '12px' }}>
        <h3 className="card-title mb-4 font-semibold text-lg">Hoạt động gần đây</h3>
        <div className="text-center p-8 text-sm text-gray-500">
          Chưa có hoạt động nào được ghi nhận.
        </div>
      </div>
    );
  }

  const getActionLabel = (action: string) => {
    if (action.includes('ATTENDANCE')) return '🕒 Chấm công';
    if (action.includes('LEAVE')) return '✈️ Nghỉ phép';
    if (action.includes('PAYROLL')) return '💰 Bảng lương';
    if (action.includes('PROJECT')) return '🏗️ Dự án';
    if (action.includes('QC')) return '🔍 Chất lượng';
    if (action.includes('EMPLOYEE')) return '👤 Nhân sự';
    return '📝 ' + action;
  };

  return (
    <div className="card h-full" style={{ border: '1px solid var(--color-border-light)', borderRadius: '12px' }}>
      <h3 className="card-title mb-4 font-semibold text-lg">Hoạt động gần đây (Audit)</h3>
      <div className="flex flex-col relative">
        <div className="absolute left-[11px] top-2 bottom-2 w-px bg-gray-200"></div>
        {activities.map((activity, index) => (
          <div key={activity.id} className="flex gap-4 relative mb-4 last:mb-0">
            <div className="w-6 h-6 rounded-full bg-blue-100 border-2 border-white flex items-center justify-center flex-shrink-0 z-10">
              <span className="text-[10px]">●</span>
            </div>
            <div className="flex-1 pb-4">
              <div className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                {activity.actorName || 'System'}
              </div>
              <div className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
                {getActionLabel(activity.action)}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {activity.time ? new Date(activity.time).toLocaleString('vi-VN') : 'Unknown'}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
