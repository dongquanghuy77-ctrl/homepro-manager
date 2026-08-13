'use client';

import React from 'react';

export function DashboardShell({ children, role, user }: { children: React.ReactNode, role: string, user: string }) {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Chào buổi sáng';
    if (hour < 18) return 'Chào buổi chiều';
    return 'Chào buổi tối';
  };

  return (
    <div className="page-container" style={{ maxWidth: '1400px', margin: '0 auto' }}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
            {getGreeting()}, {user}! 👋
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            Dưới đây là tổng quan hoạt động theo phân quyền <strong style={{ color: 'var(--color-primary)' }}>{role}</strong> của bạn.
          </p>
        </div>
        <div className="flex gap-2">
          {/* Quick Actions can be inserted here if passed as prop, or hardcoded for now */}
          <button className="btn btn-secondary text-sm px-3 py-1.5 h-auto">🔄 Làm mới</button>
        </div>
      </div>
      
      <div className="flex flex-col gap-6">
        {children}
      </div>
    </div>
  );
}
