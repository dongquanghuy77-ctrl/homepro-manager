'use client';

import React, { useState } from 'react';
import { Package, Activity, AlertCircle, ArrowUpRight, ArrowDownRight, Lock, FileText, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

type PwrMaterial = any; // Bypass exact types for now to avoid boilerplate
type PwrTransaction = any;

export default function PwrInventoryClient({ materials, transactions }: { materials: PwrMaterial[], transactions: PwrTransaction[] }) {
  const [activeTab, setActiveTab] = useState<'STOCK' | 'HISTORY'>('STOCK');

  const getTransactionIcon = (type: string) => {
    switch(type) {
      case 'IMPORT': return <ArrowUpRight size={16} color="#10b981" />;
      case 'EXPORT': return <ArrowDownRight size={16} color="#ef4444" />;
      case 'RESERVE': return <Lock size={16} color="#f59e0b" />;
      case 'PENDING_IMPORT': return <AlertCircle size={16} color="#8b5cf6" />;
      case 'IMPORT_RESOLVED': return <CheckCircle2 size={16} color="#10b981" />;
      case 'RESERVE_CONSUMED': return <CheckCircle2 size={16} color="#64748b" />;
      default: return <Activity size={16} color="var(--color-text-muted)" />;
    }
  };

  const getTransactionLabel = (type: string) => {
    switch(type) {
      case 'IMPORT': return 'Nhập kho';
      case 'EXPORT': return 'Xuất tiêu hao';
      case 'RESERVE': return 'Giam lỏng (Reserve)';
      case 'PENDING_IMPORT': return 'Chờ nhập (Thiếu)';
      case 'IMPORT_RESOLVED': return 'Đã nhập bù';
      case 'RESERVE_CONSUMED': return 'Đã xuất tiêu hao';
      default: return type;
    }
  };

  const getTransactionColor = (type: string) => {
    switch(type) {
      case 'IMPORT': return '#10b981';
      case 'EXPORT': return '#ef4444';
      case 'RESERVE': return '#f59e0b';
      case 'PENDING_IMPORT': return '#8b5cf6';
      case 'IMPORT_RESOLVED': return '#10b981';
      case 'RESERVE_CONSUMED': return '#64748b';
      default: return 'var(--color-text-secondary)';
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto', fontFamily: 'var(--font-sans)', color: 'var(--color-text)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg, #3b82f6, #2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
          <Package size={24} />
        </div>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>Kho Tự Động (Auto-Inventory)</h1>
          <p style={{ margin: '4px 0 0 0', color: 'var(--color-text-secondary)', fontSize: 14 }}>
            Kho vật tư riêng biệt dành cho trạm Nuốt File, chạy ngầm hoàn toàn độc lập với Core ERP.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24, borderBottom: '1px solid var(--color-border)', paddingBottom: 16 }}>
        <button
          onClick={() => setActiveTab('STOCK')}
          style={{
            padding: '8px 16px', borderRadius: 8, fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer',
            background: activeTab === 'STOCK' ? 'var(--color-primary)' : 'transparent',
            color: activeTab === 'STOCK' ? 'white' : 'var(--color-text-secondary)',
          }}
        >
          Danh sách Tồn Kho
        </button>
        <button
          onClick={() => setActiveTab('HISTORY')}
          style={{
            padding: '8px 16px', borderRadius: 8, fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer',
            background: activeTab === 'HISTORY' ? 'var(--color-primary)' : 'transparent',
            color: activeTab === 'HISTORY' ? 'white' : 'var(--color-text-secondary)',
          }}
        >
          Lịch sử Giao dịch
        </button>
      </div>

      {activeTab === 'STOCK' && (
        <div style={{ background: 'var(--color-surface)', borderRadius: 12, border: '1px solid var(--color-border)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
            <thead style={{ background: 'var(--color-surface-2)', borderBottom: '2px solid var(--color-border)' }}>
              <tr>
                <th style={{ padding: '16px 24px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Mã VT</th>
                <th style={{ padding: '16px 24px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Tên Vật Tư</th>
                <th style={{ padding: '16px 24px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Loại</th>
                <th style={{ padding: '16px 24px', fontWeight: 700, color: 'var(--color-text-secondary)', textAlign: 'right' }}>Tồn thực tế</th>
                <th style={{ padding: '16px 24px', fontWeight: 700, color: 'var(--color-text-secondary)', textAlign: 'right' }}>Giam lỏng</th>
                <th style={{ padding: '16px 24px', fontWeight: 700, color: 'var(--color-text-secondary)', textAlign: 'right' }}>Khả dụng</th>
                <th style={{ padding: '16px 24px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>ĐVT</th>
              </tr>
            </thead>
            <tbody>
              {materials.map(mat => {
                const available = mat.stockLevel - mat.reservedLevel;
                return (
                  <tr key={mat.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '16px 24px', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>#{mat.id}</td>
                    <td style={{ padding: '16px 24px', fontWeight: 600 }}>{mat.name}</td>
                    <td style={{ padding: '16px 24px' }}>
                      <span style={{ padding: '4px 8px', background: 'var(--color-surface-2)', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
                        {mat.type}
                      </span>
                    </td>
                    <td style={{ padding: '16px 24px', textAlign: 'right', fontWeight: 700, color: '#3b82f6' }}>{mat.stockLevel}</td>
                    <td style={{ padding: '16px 24px', textAlign: 'right', fontWeight: 600, color: mat.reservedLevel > 0 ? '#f59e0b' : 'var(--color-text-muted)' }}>
                      {mat.reservedLevel > 0 ? `-${mat.reservedLevel}` : '0'}
                    </td>
                    <td style={{ padding: '16px 24px', textAlign: 'right', fontWeight: 800, color: available < 0 ? '#ef4444' : '#10b981' }}>{available}</td>
                    <td style={{ padding: '16px 24px', color: 'var(--color-text-secondary)' }}>{mat.unit}</td>
                  </tr>
                );
              })}
              {materials.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-muted)' }}>Kho hiện đang trống.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'HISTORY' && (
        <div style={{ background: 'var(--color-surface)', borderRadius: 12, border: '1px solid var(--color-border)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
            <thead style={{ background: 'var(--color-surface-2)', borderBottom: '2px solid var(--color-border)' }}>
              <tr>
                <th style={{ padding: '16px 24px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Thời gian</th>
                <th style={{ padding: '16px 24px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Giao dịch</th>
                <th style={{ padding: '16px 24px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Vật tư</th>
                <th style={{ padding: '16px 24px', fontWeight: 700, color: 'var(--color-text-secondary)', textAlign: 'right' }}>Số lượng</th>
                <th style={{ padding: '16px 24px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Ghi chú / Task Ref</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map(t => {
                const mat = materials.find(m => m.id === t.materialId);
                const color = getTransactionColor(t.transactionType);
                return (
                  <tr key={t.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '16px 24px', color: 'var(--color-text-secondary)', fontSize: 13 }}>
                      {format(new Date(t.createdAt), 'dd/MM/yyyy HH:mm', { locale: vi })}
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color, fontWeight: 600 }}>
                        {getTransactionIcon(t.transactionType)}
                        {getTransactionLabel(t.transactionType)}
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px', fontWeight: 500 }}>
                      {mat?.name || `Vật tư #${t.materialId}`}
                    </td>
                    <td style={{ padding: '16px 24px', textAlign: 'right', fontWeight: 800, color }}>
                      {t.transactionType === 'EXPORT' || t.transactionType === 'RESERVE' ? '-' : '+'}{t.quantity}
                    </td>
                    <td style={{ padding: '16px 24px', color: 'var(--color-text-secondary)', fontSize: 13, maxWidth: 300 }}>
                      {t.taskId && (
                        <span style={{ display: 'inline-block', background: 'rgba(59,130,246,0.1)', color: '#3b82f6', padding: '2px 6px', borderRadius: 4, fontWeight: 600, marginRight: 8, fontSize: 11 }}>
                          Task #{t.taskId}
                        </span>
                      )}
                      {t.notes}
                    </td>
                  </tr>
                );
              })}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-muted)' }}>Chưa có giao dịch nào.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
