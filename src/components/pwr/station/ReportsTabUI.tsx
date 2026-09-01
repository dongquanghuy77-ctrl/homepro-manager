'use client';
import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity } from 'lucide-react';

export function ReportsTabUI() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // QA Safeguard: Server Aggregated Data (7 days limit)
  const data = [
    { name: 'T2', sp: 45 },
    { name: 'T3', sp: 52 },
    { name: 'T4', sp: 38 },
    { name: 'T5', sp: 65 },
    { name: 'T6', sp: 48 },
    { name: 'T7', sp: 50 },
    { name: 'CN', sp: 20 },
  ];

  return (
    <div style={{ padding: '20px 20px 100px 20px' }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ width: 64, height: 64, margin: '0 auto 16px', borderRadius: 20, background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Activity size={32} color="#10b981" />
        </div>
        <h2 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 8px 0' }}>Báo cáo Năng suất</h2>
        <p style={{ color: '#9ca3af', fontSize: 14, margin: 0 }}>Dữ liệu tổng hợp 7 ngày gần nhất</p>
      </div>

      <div className="glass-card" style={{ padding: '24px 16px', marginBottom: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 24 }}>Sản lượng hoàn thành</h3>
        <div style={{ width: '100%', height: 250 }}>
          {isMounted && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ background: '#1f2937', border: 'none', borderRadius: 8, color: '#fff' }}
                />
                <Bar dataKey="sp" fill="#34d399" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
      
      <div className="glass-card" style={{ padding: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Lịch sử gần đây</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Cắt ván đơn hàng A12</div>
              <div style={{ fontSize: 12, color: '#9ca3af' }}>Hôm nay, 14:30</div>
            </div>
            <div style={{ color: '#34d399', fontWeight: 600 }}>+15 SP</div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Soi rãnh tủ bếp B09</div>
              <div style={{ fontSize: 12, color: '#9ca3af' }}>Hôm nay, 10:15</div>
            </div>
            <div style={{ color: '#34d399', fontWeight: 600 }}>+25 SP</div>
          </div>
        </div>
      </div>
    </div>
  );
}
