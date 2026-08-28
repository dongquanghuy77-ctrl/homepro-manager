'use client';

import React, { useState, useMemo } from 'react';
import { Package, Activity, AlertCircle, ArrowUpRight, ArrowDownRight, Lock, CheckCircle2, ChevronDown, ChevronRight, Briefcase } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

type PwrMaterial = any;
type PwrTransaction = any;
type PwrTask = any;

export default function PwrInventoryClient({ materials, transactions, tasks }: { materials: PwrMaterial[], transactions: PwrTransaction[], tasks: PwrTask[] }) {
  const [activeTab, setActiveTab] = useState<'STOCK' | 'HISTORY'>('STOCK');
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const toggleRow = (id: number) => {
    const next = new Set(expandedRows);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedRows(next);
  };

  // 1. Map taskId to Batch/Project Name
  const taskToBatch = useMemo(() => {
    const map: Record<number, string> = {};
    tasks.forEach(t => {
      const batchTag = (t.tags || []).find((tag: string) => tag.startsWith('BATCH_'));
      map[t.id] = batchTag ? batchTag.replace('BATCH_', '') : 'Hệ thống / Chung';
    });
    return map;
  }, [tasks]);

  // 2. Compute 2D Allocation: allocation[materialId][batchName]
  const allocation = useMemo(() => {
    const alloc: Record<number, Record<string, { activeReserve: number, pendingImport: number, totalImported: number, totalExported: number }>> = {};
    
    materials.forEach(m => { alloc[m.id] = {}; });

    transactions.forEach(tx => {
      const batchName = tx.taskId ? (taskToBatch[tx.taskId] || 'Khác') : 'Không xác định';
      if (!alloc[tx.materialId]) alloc[tx.materialId] = {};
      if (!alloc[tx.materialId][batchName]) {
        alloc[tx.materialId][batchName] = { activeReserve: 0, pendingImport: 0, totalImported: 0, totalExported: 0 };
      }
      
      const bAlloc = alloc[tx.materialId][batchName];
      
      // Calculate based on raw transactions
      if (tx.transactionType === 'RESERVE') bAlloc.activeReserve += tx.quantity;
      if (tx.transactionType === 'RESERVE_CONSUMED') bAlloc.activeReserve -= tx.quantity;
      if (tx.transactionType === 'PENDING_IMPORT') bAlloc.pendingImport += tx.quantity;
      if (tx.transactionType === 'IMPORT_RESOLVED') bAlloc.pendingImport -= tx.quantity;
      if (tx.transactionType === 'IMPORT') bAlloc.totalImported += tx.quantity;
      if (tx.transactionType === 'EXPORT') bAlloc.totalExported += tx.quantity;
    });

    return alloc;
  }, [materials, transactions, taskToBatch]);

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
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>Kho 2 Chiều (2D Inventory)</h1>
          <p style={{ margin: '4px 0 0 0', color: 'var(--color-text-secondary)', fontSize: 14 }}>
            Quản trị Tồn kho Tổng và bóc tách chi tiết theo từng Lô/Dự án.
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
          Danh sách Tồn Kho 2D
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
                <th style={{ padding: '16px 24px', width: 40 }}></th>
                <th style={{ padding: '16px 8px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Mã VT</th>
                <th style={{ padding: '16px 24px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Tên Vật Tư</th>
                <th style={{ padding: '16px 24px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Loại</th>
                <th style={{ padding: '16px 24px', fontWeight: 700, color: 'var(--color-text-secondary)', textAlign: 'right' }}>Tồn Tổng</th>
                <th style={{ padding: '16px 24px', fontWeight: 700, color: 'var(--color-text-secondary)', textAlign: 'right' }}>Giam lỏng</th>
                <th style={{ padding: '16px 24px', fontWeight: 700, color: 'var(--color-text-secondary)', textAlign: 'right' }}>Khả dụng</th>
                <th style={{ padding: '16px 24px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>ĐVT</th>
              </tr>
            </thead>
            <tbody>
              {materials.map(mat => {
                const available = mat.stockLevel - mat.reservedLevel;
                const isExp = expandedRows.has(mat.id);
                const matAlloc = allocation[mat.id] || {};
                const activeBatches = Object.keys(matAlloc).filter(b => 
                  matAlloc[b].activeReserve > 0 || matAlloc[b].pendingImport > 0 || matAlloc[b].totalImported > 0 || matAlloc[b].totalExported > 0
                );

                return (
                  <React.Fragment key={mat.id}>
                    <tr style={{ borderBottom: '1px solid var(--color-border)', cursor: activeBatches.length > 0 ? 'pointer' : 'default', background: isExp ? 'var(--color-surface-2)' : 'transparent' }} onClick={() => activeBatches.length > 0 && toggleRow(mat.id)}>
                      <td style={{ padding: '16px 0 16px 24px', color: 'var(--color-text-muted)' }}>
                        {activeBatches.length > 0 ? (isExp ? <ChevronDown size={18} /> : <ChevronRight size={18} />) : <div style={{ width: 18 }}/>}
                      </td>
                      <td style={{ padding: '16px 8px', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>#{mat.id}</td>
                      <td style={{ padding: '16px 24px', fontWeight: 700 }}>{mat.name}</td>
                      <td style={{ padding: '16px 24px' }}>
                        <span style={{ padding: '4px 8px', background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
                          {mat.type}
                        </span>
                      </td>
                      <td style={{ padding: '16px 24px', textAlign: 'right', fontWeight: 800, color: '#3b82f6', fontSize: 15 }}>{mat.stockLevel}</td>
                      <td style={{ padding: '16px 24px', textAlign: 'right', fontWeight: 700, color: mat.reservedLevel > 0 ? '#f59e0b' : 'var(--color-text-muted)' }}>
                        {mat.reservedLevel > 0 ? `-${mat.reservedLevel}` : '0'}
                      </td>
                      <td style={{ padding: '16px 24px', textAlign: 'right', fontWeight: 800, color: available < 0 ? '#ef4444' : '#10b981', fontSize: 15 }}>{available}</td>
                      <td style={{ padding: '16px 24px', color: 'var(--color-text-secondary)' }}>{mat.unit}</td>
                    </tr>
                    
                    {isExp && activeBatches.map(batchName => {
                      const b = matAlloc[batchName];
                      return (
                        <tr key={`${mat.id}-${batchName}`} style={{ background: 'rgba(59,130,246,0.02)', borderBottom: '1px solid var(--color-border-light)' }}>
                          <td></td>
                          <td></td>
                          <td colSpan={6} style={{ padding: '12px 24px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                                <Briefcase size={14} color="#3b82f6" />
                                Lô: {batchName}
                              </div>
                              <div style={{ display: 'flex', gap: 24 }}>
                                {b.pendingImport > 0 && (
                                  <span style={{ color: '#8b5cf6', display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <AlertCircle size={14} /> Chờ mua: <strong>{b.pendingImport}</strong>
                                  </span>
                                )}
                                <span style={{ color: b.activeReserve > 0 ? '#f59e0b' : 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <Lock size={14} /> Đang giam: <strong>{b.activeReserve}</strong>
                                </span>
                                <span style={{ color: b.totalImported > 0 ? '#10b981' : 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <ArrowUpRight size={14} /> Đã nhập: <strong>{b.totalImported}</strong>
                                </span>
                                <span style={{ color: b.totalExported > 0 ? '#ef4444' : 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <ArrowDownRight size={14} /> Tiêu hao: <strong>{b.totalExported}</strong>
                                </span>
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })}
              {materials.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-muted)' }}>Kho hiện đang trống.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'HISTORY' && (
        <div style={{ background: 'var(--color-surface)', borderRadius: 12, border: '1px solid var(--color-border)', overflow: 'hidden' }}>
          {/* ... existing history table code ... */}
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
            <thead style={{ background: 'var(--color-surface-2)', borderBottom: '2px solid var(--color-border)' }}>
              <tr>
                <th style={{ padding: '16px 24px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Thời gian</th>
                <th style={{ padding: '16px 24px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Giao dịch</th>
                <th style={{ padding: '16px 24px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Vật tư</th>
                <th style={{ padding: '16px 24px', fontWeight: 700, color: 'var(--color-text-secondary)', textAlign: 'right' }}>Số lượng</th>
                <th style={{ padding: '16px 24px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Lô / Dự án</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map(t => {
                const mat = materials.find(m => m.id === t.materialId);
                const color = getTransactionColor(t.transactionType);
                const batchName = t.taskId ? (taskToBatch[t.taskId] || 'Khác') : 'Hệ thống';
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
                      <span style={{ display: 'inline-block', background: 'rgba(59,130,246,0.1)', color: '#3b82f6', padding: '4px 8px', borderRadius: 6, fontWeight: 600 }}>
                        {batchName}
                      </span>
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
