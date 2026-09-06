'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Package, Activity, AlertCircle, ArrowUpRight, ArrowDownRight, Lock, CheckCircle2, ChevronDown, ChevronRight, Briefcase, Download, FileText, FileSpreadsheet, Printer } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

type PwrMaterial = any;
type PwrTransaction = any;
type PwrTask = any;

export default function PwrInventoryClient({ materials, transactions, tasks }: { materials: PwrMaterial[], transactions: PwrTransaction[], tasks: PwrTask[] }) {
  const [activeTab, setActiveTab] = useState<'STOCK' | 'HISTORY'>('STOCK');
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [showExportMenu, setShowExportMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Đóng menu khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleRow = (id: number) => {
    const next = new Set(expandedRows);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedRows(next);
  };

  // 1. Map taskId to Project & Batch
  const taskToProjectBatch = useMemo(() => {
    const map: Record<number, { projectName: string, batchName: string }> = {};
    tasks.forEach(t => {
      const batchTag = (t.tags || []).find((tag: string) => tag.startsWith('BATCH_'));
      const batchName = batchTag ? batchTag.replace('BATCH_', '') : 'Không phân lô';
      const projectName = t.projectRef || 'Dự án hệ thống';
      map[t.id] = { projectName, batchName };
    });
    return map;
  }, [tasks]);

  // 2. Compute 3-Level Allocation
  const allocation = useMemo(() => {
    const alloc: Record<number, Record<string, Record<string, any>>> = {};
    materials.forEach(m => { alloc[m.id] = {}; });

    transactions.forEach(tx => {
      const taskInfo = tx.taskId ? taskToProjectBatch[tx.taskId] : null;
      const projectName = taskInfo ? taskInfo.projectName : 'Dự án Hệ thống';
      const batchName = taskInfo ? taskInfo.batchName : 'Giao dịch Hệ thống';
      
      if (!alloc[tx.materialId]) alloc[tx.materialId] = {};
      if (!alloc[tx.materialId][projectName]) alloc[tx.materialId][projectName] = {};
      if (!alloc[tx.materialId][projectName][batchName]) {
        alloc[tx.materialId][projectName][batchName] = { activeReserve: 0, pendingImport: 0, totalImported: 0, totalExported: 0, lastImportDate: null };
      }
      
      const bAlloc = alloc[tx.materialId][projectName][batchName];
      
      if (tx.transactionType === 'RESERVE') bAlloc.activeReserve += tx.quantity;
      if (tx.transactionType === 'RESERVE_CONSUMED') bAlloc.activeReserve -= tx.quantity;
      if (tx.transactionType === 'PENDING_IMPORT') bAlloc.pendingImport += tx.quantity;
      if (tx.transactionType === 'IMPORT_RESOLVED') bAlloc.pendingImport -= tx.quantity;
      if (tx.transactionType === 'EXPORT') bAlloc.totalExported += tx.quantity;
      if (tx.transactionType === 'IMPORT') {
        bAlloc.totalImported += tx.quantity;
        if (!bAlloc.lastImportDate || new Date(tx.createdAt) > new Date(bAlloc.lastImportDate)) {
          bAlloc.lastImportDate = tx.createdAt;
        }
      }
    });
    return alloc;
  }, [materials, transactions, taskToProjectBatch]);

  const boardMaterials = materials.filter(m => m.category === 'BOARD' || m.category === 'VÁN' || m.unit?.toLowerCase() === 'tấm').sort((a,b) => a.name.localeCompare(b.name));
  const edgeMaterials = materials.filter(m => m.category === 'EDGE_BAND' || m.category === 'NẸP' || m.unit?.toLowerCase() === 'm' || m.unit?.toLowerCase() === 'mét').sort((a,b) => a.name.localeCompare(b.name));
  const hardwareMaterials = materials.filter(m => !boardMaterials.includes(m) && !edgeMaterials.includes(m)).sort((a,b) => a.name.localeCompare(b.name));

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

  // --- LOGIC XUẤT BÁO CÁO (EXPORT) ---
  const downloadCSV = (csvContent: string, filename: string) => {
    const bom = '\uFEFF'; // BOM for UTF-8 Excel support
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportStock = () => {
    let csv = "Mã VT,Tên Vật Tư,Loại (Phân khu),Tồn Tổng,Giam lỏng,Khả dụng,ĐVT\n";
    materials.forEach(mat => {
        const available = mat.stockLevel - mat.reservedLevel;
        // Escape quotes if needed
        const name = mat.name.replace(/"/g, '""');
        csv += `"${mat.id}","${name}","${mat.category || 'OTHER'}",${mat.stockLevel},${mat.reservedLevel},${available},"${mat.unit}"\n`;
    });
    downloadCSV(csv, `TonKho_VanHanh_${format(new Date(), 'ddMMyyyy')}.csv`);
    setShowExportMenu(false);
  };

  const handleExportHistory = () => {
    let csv = "Thời gian,Loại Giao dịch,Mã VT,Tên Vật tư,Số lượng,Dự án,Lô\n";
    transactions.forEach(t => {
        const mat = materials.find(m => m.id === t.materialId);
        const time = format(new Date(t.createdAt), 'dd/MM/yyyy HH:mm');
        const taskInfo = t.taskId ? taskToProjectBatch[t.taskId] : { projectName: 'Hệ thống', batchName: 'Hệ thống' };
        const sign = (t.transactionType === 'EXPORT' || t.transactionType === 'RESERVE') ? '-' : '+';
        const name = (mat?.name || '').replace(/"/g, '""');
        csv += `"${time}","${getTransactionLabel(t.transactionType)}","${t.materialId}","${name}","${sign}${t.quantity}","${taskInfo.projectName}","${taskInfo.batchName}"\n`;
    });
    downloadCSV(csv, `LichSuGiaoDich_KeToan_${format(new Date(), 'ddMMyyyy')}.csv`);
    setShowExportMenu(false);
  };

  const handlePrintPDF = () => {
    setShowExportMenu(false);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  // --- RENDER COMPONENT ---
  const renderMaterialGroup = (title: string, icon: string, groupMats: PwrMaterial[]) => {
    if (groupMats.length === 0) return null;
    return (
      <React.Fragment>
        <tr style={{ background: 'var(--color-surface-2)', borderBottom: '1px solid var(--color-border)', borderTop: '2px solid var(--color-border)' }}>
          <td colSpan={8} style={{ padding: '16px 24px', fontWeight: 800, fontSize: 16, color: 'var(--color-text)' }}>
            {icon} {title}
          </td>
        </tr>
        {groupMats.map(mat => {
          const available = mat.stockLevel - mat.reservedLevel;
          const isExp = expandedRows.has(mat.id);
          const matAlloc = allocation[mat.id] || {};
          
          let hasActiveBatches = false;
          Object.keys(matAlloc).forEach(proj => {
            Object.keys(matAlloc[proj]).forEach(batch => {
              const b = matAlloc[proj][batch];
              if (b.activeReserve > 0 || b.pendingImport > 0 || b.totalImported > 0 || b.totalExported > 0) hasActiveBatches = true;
            });
          });

          return (
            <React.Fragment key={mat.id}>
              <tr className="hover-row" style={{ borderBottom: '1px solid var(--color-border)', cursor: hasActiveBatches ? 'pointer' : 'default', background: isExp ? 'var(--color-surface-2)' : 'transparent' }} onClick={() => hasActiveBatches && toggleRow(mat.id)}>
                <td className="no-print" style={{ padding: '16px 0 16px 24px', color: 'var(--color-text-muted)' }}>
                  {hasActiveBatches ? (isExp ? <ChevronDown size={18} /> : <ChevronRight size={18} />) : <div style={{ width: 18 }}/>}
                </td>
                <td style={{ padding: '16px 8px', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>#{mat.id}</td>
                <td style={{ padding: '16px 24px', fontWeight: 700 }}>{mat.name}</td>
                <td style={{ padding: '16px 24px' }}>
                  <span style={{ padding: '4px 8px', background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
                    {mat.category || 'OTHER'}
                  </span>
                </td>
                <td style={{ padding: '16px 24px', textAlign: 'right', fontWeight: 800, color: '#3b82f6', fontSize: 15 }}>{mat.stockLevel}</td>
                <td style={{ padding: '16px 24px', textAlign: 'right', fontWeight: 700, color: mat.reservedLevel > 0 ? '#f59e0b' : 'var(--color-text-muted)' }}>
                  {mat.reservedLevel > 0 ? `-${mat.reservedLevel}` : '0'}
                </td>
                <td style={{ padding: '16px 24px', textAlign: 'right', fontWeight: 800, color: available < 0 ? '#ef4444' : '#10b981', fontSize: 15 }}>{available}</td>
                <td style={{ padding: '16px 24px', color: 'var(--color-text-secondary)' }}>{mat.unit}</td>
              </tr>
              
              {isExp && Object.keys(matAlloc).map(projName => {
                const batches = Object.keys(matAlloc[projName]).filter(b => {
                  const bd = matAlloc[projName][b];
                  return bd.activeReserve > 0 || bd.pendingImport > 0 || bd.totalImported > 0 || bd.totalExported > 0;
                });
                
                if (batches.length === 0) return null;

                return (
                  <React.Fragment key={`${mat.id}-${projName}`}>
                    <tr style={{ background: 'rgba(59,130,246,0.05)' }}>
                      <td className="no-print"></td>
                      <td></td>
                      <td colSpan={6} style={{ padding: '8px 24px', fontWeight: 700, color: '#1e40af', fontSize: 13, borderBottom: '1px solid rgba(59,130,246,0.1)' }}>
                        🏢 Dự án: {projName.toUpperCase()}
                      </td>
                    </tr>
                    {batches.map(batchName => {
                      const b = matAlloc[projName][batchName];
                      return (
                        <tr key={`${mat.id}-${projName}-${batchName}`} style={{ background: 'rgba(59,130,246,0.02)', borderBottom: '1px solid var(--color-border-light)' }}>
                          <td className="no-print"></td>
                          <td></td>
                          <td colSpan={6} style={{ padding: '12px 24px 12px 48px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                                <Briefcase size={14} color="#3b82f6" />
                                Lô: {batchName}
                              </div>
                              <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
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
                                  {b.lastImportDate && (
                                    <span style={{ fontSize: 11, fontWeight: 500, color: '#059669', background: 'rgba(16,185,129,0.1)', padding: '2px 6px', borderRadius: 4, marginLeft: 4 }}>
                                      ({format(new Date(b.lastImportDate), 'dd/MM')})
                                    </span>
                                  )}
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
            </React.Fragment>
          );
        })}
      </React.Fragment>
    );
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page { size: landscape; margin: 1cm; }
          body * { visibility: hidden; }
          #print-area, #print-area * { visibility: visible; }
          #print-area { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
          .hover-row { background: transparent !important; }
          .hover-row:hover { background: transparent !important; }
        }
      `}} />
      <div id="print-area" style={{ padding: 24, maxWidth: 1200, margin: '0 auto', fontFamily: 'var(--font-sans)', color: 'var(--color-text)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="no-print" style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg, #3b82f6, #2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
              <Package size={24} />
            </div>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>Kho 2 Chiều Nâng Cao (3-Level 2D Inventory)</h1>
              <p style={{ margin: '4px 0 0 0', color: 'var(--color-text-secondary)', fontSize: 14 }}>
                Phân khu Khoa học • Cấu trúc Đa Dự Án / Đa Lô • Truy vết Kế toán
              </p>
            </div>
          </div>

          <div className="no-print" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <a
              href="/pwr/stocktake"
              style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f59e0b', color: 'white', border: 'none', padding: '10px 16px', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer', textDecoration: 'none' }}
            >
              📋 Kiểm Kê Kho
            </a>
            <div style={{ position: 'relative' }} ref={menuRef}>
              <button 
                onClick={() => setShowExportMenu(!showExportMenu)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#10b981', color: 'white', border: 'none', padding: '10px 16px', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(16,185,129,0.2)' }}
              >
                <Download size={18} /> Xuất Báo Cáo
              </button>

              {showExportMenu && (
                <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 8, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, boxShadow: '0 10px 25px -5px rgba(0,0,0,0.2)', width: 260, zIndex: 100, overflow: 'hidden' }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg)' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Hệ thống Báo cáo 3 Tầng</span>
                  </div>
                  
                  <button onClick={handlePrintPDF} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 4, padding: '12px 16px', border: 'none', borderBottom: '1px solid var(--color-border)', background: 'transparent', textAlign: 'left', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, color: 'var(--color-text)' }}>
                      <Printer size={16} color="#ef4444" /> Tầng 1: Góc nhìn Quản lý
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', paddingLeft: 24 }}>In PDF A4 Ngang - Bức tranh toàn cảnh kho.</div>
                  </button>

                  <button onClick={handleExportStock} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 4, padding: '12px 16px', border: 'none', borderBottom: '1px solid var(--color-border)', background: 'transparent', textAlign: 'left', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, color: 'var(--color-text)' }}>
                      <FileSpreadsheet size={16} color="#10b981" /> Tầng 2: Vận hành Kho
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', paddingLeft: 24 }}>Xuất Excel Tồn kho - Phục vụ lọc và tính toán.</div>
                  </button>

                  <button onClick={handleExportHistory} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 4, padding: '12px 16px', border: 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, color: 'var(--color-text)' }}>
                      <FileText size={16} color="#3b82f6" /> Tầng 3: Đối soát Kế toán
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', paddingLeft: 24 }}>Xuất CSV Giao dịch - Truy vết ngày nhập/xuất.</div>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="no-print" style={{ display: 'flex', gap: 8, marginBottom: 24, borderBottom: '1px solid var(--color-border)', paddingBottom: 16 }}>
          <button
            onClick={() => setActiveTab('STOCK')}
            style={{
              padding: '8px 16px', borderRadius: 8, fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer',
              background: activeTab === 'STOCK' ? 'var(--color-primary)' : 'transparent',
              color: activeTab === 'STOCK' ? 'white' : 'var(--color-text-secondary)',
            }}
          >
            Danh sách Tồn Kho Nâng Cao
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
                  <th className="no-print" style={{ padding: '16px 24px', width: 40 }}></th>
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
                {renderMaterialGroup('PHÂN KHU VÁN (BOARDS)', '🪚', boardMaterials)}
                {renderMaterialGroup('PHÂN KHU NẸP (EDGE BANDING)', '🎗️', edgeMaterials)}
                {renderMaterialGroup('PHÂN KHU PHỤ KIỆN (HARDWARE)', '🔩', hardwareMaterials)}

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
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
              <thead style={{ background: 'var(--color-surface-2)', borderBottom: '2px solid var(--color-border)' }}>
                <tr>
                  <th style={{ padding: '16px 24px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Thời gian</th>
                  <th style={{ padding: '16px 24px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Giao dịch</th>
                  <th style={{ padding: '16px 24px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Vật tư</th>
                  <th style={{ padding: '16px 24px', fontWeight: 700, color: 'var(--color-text-secondary)', textAlign: 'right' }}>Số lượng</th>
                  <th style={{ padding: '16px 24px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Dự án / Lô</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(t => {
                  const mat = materials.find(m => m.id === t.materialId);
                  const color = getTransactionColor(t.transactionType);
                  const taskInfo = t.taskId ? taskToProjectBatch[t.taskId] : { projectName: 'Hệ thống', batchName: 'Hệ thống' };
                  
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
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <span style={{ fontWeight: 700, color: '#1e40af' }}>{taskInfo.projectName}</span>
                          <span style={{ display: 'inline-block', background: 'rgba(59,130,246,0.1)', color: '#3b82f6', padding: '2px 6px', borderRadius: 4, fontWeight: 600, width: 'fit-content' }}>
                            Lô: {taskInfo.batchName}
                          </span>
                        </div>
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
    </>
  );
}
