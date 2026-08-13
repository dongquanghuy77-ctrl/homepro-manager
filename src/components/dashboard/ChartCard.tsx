'use client';

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface ChartData {
  name: string;
  value?: number;
  [key: string]: any;
}

interface ChartCardProps {
  title: string;
  type: 'bar' | 'pie';
  data: ChartData[];
  dataKeys?: string[]; // for bar chart (e.g. ['Hoàn thành', 'Trễ hạn'])
  colors?: string[];
}

export function ChartCard({ title, type, data, dataKeys = ['value'], colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'] }: ChartCardProps) {
  
  if (!data || data.length === 0) {
    return (
      <div className="card h-full" style={{ border: '1px solid var(--color-border-light)', borderRadius: '12px' }}>
        <h3 className="card-title mb-4 font-semibold text-lg">{title}</h3>
        <div className="flex items-center justify-center h-[250px] text-gray-400">
          Chưa có dữ liệu
        </div>
      </div>
    );
  }

  return (
    <div className="card h-full" style={{ border: '1px solid var(--color-border-light)', borderRadius: '12px' }}>
      <h3 className="card-title mb-4 font-semibold text-lg">{title}</h3>
      <div style={{ width: '100%', height: '250px' }}>
        <ResponsiveContainer width="100%" height="100%">
          {type === 'bar' ? (
            <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
              <Tooltip 
                cursor={{ fill: '#F3F4F6' }}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              {dataKeys.length > 1 && <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />}
              {dataKeys.map((key, index) => (
                <Bar key={key} dataKey={key} fill={colors[index % colors.length]} radius={[4, 4, 0, 0]} maxBarSize={50} />
              ))}
            </BarChart>
          ) : (
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
                stroke="none"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              <Legend iconType="circle" layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '12px' }} />
            </PieChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
