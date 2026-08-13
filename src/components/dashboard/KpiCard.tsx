'use client';

import React from 'react';
import Link from 'next/link';

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  link?: string;
  color?: string;
  bg?: string;
}

export function KpiCard({ title, value, icon, trend, link, color = '#3B82F6', bg = 'rgba(59,130,246,0.12)' }: KpiCardProps) {
  const CardContent = () => (
    <div className="stat-card hover:shadow-md transition-all h-full" style={{ border: '1px solid var(--color-border-light)', borderRadius: '12px', padding: '20px', background: 'var(--color-surface)' }}>
      <div className="flex justify-between items-start mb-4">
        <div style={{ color: 'var(--color-text-muted)', fontSize: '14px', fontWeight: 500 }}>{title}</div>
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl" style={{ backgroundColor: bg, color: color }}>
          {icon}
        </div>
      </div>
      <div className="flex flex-col">
        <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--color-text)', lineHeight: 1.2 }}>
          {value !== null && value !== undefined ? value : 'N/A'}
        </div>
        {trend && (
          <div className="mt-2 text-sm" style={{ color: trend.isPositive ? '#10B981' : '#EF4444', fontWeight: 500 }}>
            {trend.isPositive ? '↑' : '↓'} {trend.value}
          </div>
        )}
      </div>
    </div>
  );

  if (link) {
    return (
      <Link href={link} style={{ textDecoration: 'none' }}>
        <CardContent />
      </Link>
    );
  }

  return <CardContent />;
}
