'use client';

import React from 'react';
import Link from 'next/link';

interface ActionItem {
  id: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  module: string;
  message: string;
  link?: string;
}

export function ActionCenter({ actions }: { actions: ActionItem[] }) {
  if (!actions || actions.length === 0) {
    return (
      <div className="card h-full" style={{ border: '1px solid var(--color-border-light)', borderRadius: '12px' }}>
        <h3 className="card-title mb-4 font-semibold text-lg">Action Center</h3>
        <div className="flex flex-col items-center justify-center text-center p-8" style={{ color: 'var(--color-text-muted)' }}>
          <div className="text-4xl mb-4">🎉</div>
          <div className="font-medium">Tuyệt vời!</div>
          <div className="text-sm mt-1">Bạn không có việc cần xử lý gấp hôm nay.</div>
        </div>
      </div>
    );
  }

  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return { bg: '#FEF2F2', border: '#F87171', text: '#DC2626', icon: '🚨' };
      case 'HIGH': return { bg: '#FFF7ED', border: '#FB923C', text: '#EA580C', icon: '⚠️' };
      case 'MEDIUM': return { bg: '#FEFCE8', border: '#FACC15', text: '#CA8A04', icon: '⚡' };
      default: return { bg: '#F3F4F6', border: '#9CA3AF', text: '#4B5563', icon: 'ℹ️' };
    }
  };

  return (
    <div className="card h-full" style={{ border: '1px solid var(--color-border-light)', borderRadius: '12px' }}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="card-title font-semibold text-lg">Action Center</h3>
        <span className="badge" style={{ background: '#FEE2E2', color: '#DC2626', fontWeight: 600 }}>{actions.length} Việc cần làm</span>
      </div>
      <div className="flex flex-col gap-3">
        {actions.map((action) => {
          const styles = getSeverityStyles(action.severity);
          const content = (
            <div key={action.id} className="flex items-start gap-3 p-3 rounded-lg transition-colors hover:bg-gray-50" style={{ borderLeft: `4px solid ${styles.border}`, background: styles.bg }}>
              <div className="text-lg">{styles.icon}</div>
              <div className="flex-1">
                <div className="text-sm font-semibold mb-1" style={{ color: styles.text }}>
                  [{action.module}] {action.message}
                </div>
                {action.link && <div className="text-xs text-blue-600 font-medium">Xử lý ngay →</div>}
              </div>
            </div>
          );

          if (action.link) {
            return <Link href={action.link} key={action.id} style={{ textDecoration: 'none' }}>{content}</Link>;
          }
          return content;
        })}
      </div>
    </div>
  );
}
