'use client';

import React, { useState, useRef } from 'react';
import { Upload, Download, Search, AlertCircle, Plus, Trash2, FileText, CheckCircle } from 'lucide-react';

type Document = {
  id: number;
  source_id: string;
  source_name: string;
  source_type: string;
  file_name: string;
  file_size: number;
  project_name: string;
  document_category: string;
  source_status: string;
  created_at: string;
  classification_confidence: number;
  mapped_data?: string;
};

type Props = {
  initialData: {
    stats: { category: string; count: string }[];
    statusStats: { status: string; count: string }[];
    documents: Document[];
  };
};

export default function SourceCenterClient({ initialData }: Props) {
  const [docs, setDocs] = useState<Document[]>(initialData.documents);
  const [filterCat, setFilterCat] = useState('');
  const [searchQ, setSearchQ] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatSize = (bytes: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const processImportedData = (importedRows: any[]) => {
    setDocs(prevDocs => {
      const updatedDocs = [...prevDocs];
      let matchCount = 0;

      importedRows.forEach(row => {
        const rowIndex = updatedDocs.findIndex(d => 
          d.source_id === row.source_id || 
          d.file_name.toLowerCase().includes(String(row.file_name || '').toLowerCase())
        );

        if (rowIndex !== -1) {
          updatedDocs[rowIndex] = {
            ...updatedDocs[rowIndex],
            document_category: row.category || updatedDocs[rowIndex].document_category,
            source_status: row.status || updatedDocs[rowIndex].source_status,
            mapped_data: row.mapped_data || updatedDocs[rowIndex].mapped_data || 'Matched & Updated',
          };
          matchCount++;
        } else {
          updatedDocs.unshift({
            id: Date.now() + Math.random(),
            source_id: row.source_id || `SRC-NEW-${Math.floor(Math.random() * 1000)}`,
            source_name: row.source_name || 'Imported Source',
            source_type: 'Excel/PDF',
            file_name: row.file_name || 'Unknown File',
            file_size: 1024,
            project_name: row.project_name || 'DỰ ÁN BẢO MINH',
            document_category: row.category || 'UNCATEGORIZED',
            source_status: row.status || 'STAGED',
            created_at: new Date().toISOString(),
            classification_confidence: 1.0,
            mapped_data: 'Newly Inserted'
          });
        }
      });

      alert(`Thuật toán ánh xạ đã xử lý xong: ${matchCount} dòng khớp dữ liệu cũ, ${importedRows.length - matchCount} dòng được chèn mới thành công!`);
      return updatedDocs;
    });
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      alert(`Đang phân tích file ${file.name} bằng thuật toán ánh xạ...`);
      setTimeout(() => {
        const mockImportedExcelData = [
          { source_id: docs[0]?.source_id, category: 'CONFIRMED_BOQ', status: 'APPROVED', mapped_data: 'Mapped via Excel Auto-Sync' },
          { file_name: 'ban_ve_moi.pdf', project_name: 'DỰ ÁN BẢO MINH', category: 'DRAWING', status: 'STAGED', mapped_data: 'Inserted Row' }
        ];
        processImportedData(mockImportedExcelData);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }, 1500);
    }
  };

  const handleExport = () => {
    alert('Đang xuất báo cáo luồng dữ liệu chuẩn sang Excel...');
  };

  const handleCellChange = (id: number, field: keyof Document, value: string) => {
    setDocs(prev => prev.map(d => d.id === id ? { ...d, [field]: value } : d));
  };

  const handleDeleteRow = (id: number) => {
    if (confirm('Bạn có chắc chắn muốn xóa dòng dữ liệu này không?')) {
      setDocs(prev => prev.filter(d => d.id !== id));
    }
  };

  const handleAddRow = () => {
    const newRow: Document = {
      id: Date.now(),
      source_id: `SRC-MN-${Math.floor(Math.random() * 9000) + 1000}`,
      source_name: 'Manual Entry',
      source_type: 'Manual',
      file_name: 'Dữ liệu nhập tay',
      file_size: 0,
      project_name: 'DỰ ÁN BẢO MINH',
      document_category: 'UNCATEGORIZED',
      source_status: 'RAW',
      created_at: new Date().toISOString(),
      classification_confidence: 1,
      mapped_data: 'Sẵn sàng nhập'
    };
    setDocs([newRow, ...docs]);
  };

  const filteredDocs = docs.filter(d => {
    if (filterCat && d.document_category !== filterCat) return false;
    if (searchQ && !d.file_name.toLowerCase().includes(searchQ.toLowerCase()) && !d.source_id.toLowerCase().includes(searchQ.toLowerCase())) return false;
    return true;
  });

  return (
    <div style={{ fontFamily: 'var(--font-sans, sans-serif)', color: '#e2e8f0', minHeight: '100vh', padding: '0 0 40px', width: '100%' }}>
      {/* Remove duplicated title since the layout handles it, just provide actions */}
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Top Actions Bar */}
        <div style={{ 
          display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', 
          background: 'rgba(30, 41, 59, 0.5)', padding: '20px', borderRadius: '16px', border: '1px solid #334155',
          boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
        }}>
          <div>
            <div style={{ fontSize: '13px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>Workspace Control</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#f8fafc', marginTop: '4px' }}>Hệ thống Quản lý Nguồn</div>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <input 
              type="file" 
              accept=".xlsx,.xls,.pdf,.csv" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              onChange={handleImportFile} 
            />
            <button onClick={handleAddRow} style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '10px',
              background: '#334155', color: '#f8fafc', border: '1px solid #475569', fontWeight: 600,
              cursor: 'pointer', transition: 'all 0.2s', fontSize: '14px'
            }}>
              <Plus size={18} /> Thêm Dòng
            </button>
            <button onClick={() => fileInputRef.current?.click()} style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '10px',
              background: 'linear-gradient(135deg, #059669 0%, #0d9488 100%)', color: '#fff', border: 'none', 
              fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 15px rgba(5, 150, 105, 0.3)', fontSize: '14px'
            }}>
              <Upload size={18} /> Nhập Data (Excel/PDF)
            </button>
            <button onClick={handleExport} style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '10px',
              background: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)', color: '#fff', border: 'none', 
              fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 15px rgba(37, 99, 235, 0.3)', fontSize: '14px'
            }}>
              <Download size={18} /> Xuất Báo Cáo
            </button>
          </div>
        </div>

        {/* Dashboard Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', padding: '24px', borderRadius: '16px', color: '#fff', boxShadow: '0 4px 20px rgba(37,99,235,0.2)' }}>
            <div style={{ fontSize: '36px', fontWeight: 800, lineHeight: 1 }}>{docs.length}</div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#bfdbfe', marginTop: '8px', textTransform: 'uppercase' }}>Tổng Dữ Liệu (Rows)</div>
          </div>
          <div style={{ background: 'rgba(30, 41, 59, 0.7)', border: '1px solid #334155', padding: '24px', borderRadius: '16px', color: '#f8fafc' }}>
            <div style={{ fontSize: '36px', fontWeight: 800, color: '#fbbf24', lineHeight: 1 }}>{docs.filter(d => d.source_status === 'RAW').length}</div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#94a3b8', marginTop: '8px', textTransform: 'uppercase' }}>Chờ Đồng Bộ (RAW)</div>
          </div>
          <div style={{ background: 'rgba(30, 41, 59, 0.7)', border: '1px solid #334155', padding: '20px', borderRadius: '16px', color: '#f8fafc', gridColumn: 'span 2' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '12px' }}>Bộ lọc & Tìm kiếm</div>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <div style={{ position: 'absolute', left: '12px', color: '#64748b' }}><Search size={16} /></div>
                <input 
                  type="text" 
                  placeholder="Tìm ID Nguồn, Tên file..." 
                  value={searchQ}
                  onChange={e => setSearchQ(e.target.value)}
                  style={{
                    background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#f8fafc',
                    padding: '10px 16px 10px 36px', outline: 'none', fontSize: '14px', width: '220px'
                  }}
                />
              </div>
              <button onClick={() => setFilterCat('')} style={{
                background: filterCat === '' ? '#3b82f6' : '#1e293b', color: filterCat === '' ? '#fff' : '#cbd5e1',
                border: filterCat === '' ? 'none' : '1px solid #334155', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '13px'
              }}>Tất cả</button>
              {initialData.stats.map(s => (
                <button key={s.category} onClick={() => setFilterCat(s.category)} style={{
                  background: filterCat === s.category ? '#3b82f6' : '#1e293b', color: filterCat === s.category ? '#fff' : '#cbd5e1',
                  border: filterCat === s.category ? 'none' : '1px solid #334155', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '13px'
                }}>{s.category}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Excel-like Data Grid */}
        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.4)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: '1200px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#1e293b', borderBottom: '2px solid #334155' }}>
                  <th style={{ padding: '16px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>ID Nguồn</th>
                  <th style={{ padding: '16px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tên File</th>
                  <th style={{ padding: '16px', fontWeight: 800, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.5px', background: 'rgba(59,130,246,0.1)' }}>Dự án (✏️)</th>
                  <th style={{ padding: '16px', fontWeight: 800, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.5px', background: 'rgba(59,130,246,0.1)' }}>Phân loại (✏️)</th>
                  <th style={{ padding: '16px', fontWeight: 800, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.5px', background: 'rgba(59,130,246,0.1)' }}>Trạng thái (✏️)</th>
                  <th style={{ padding: '16px', fontWeight: 800, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.5px', background: 'rgba(16,185,129,0.1)' }}>Thuật toán Sync (✏️)</th>
                  <th style={{ padding: '16px', fontWeight: 800, color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>Xóa</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocs.map((doc, idx) => (
                  <tr key={doc.id} style={{ 
                    borderBottom: '1px solid #1e293b', 
                    background: doc.source_status === 'APPROVED' ? 'rgba(16,185,129,0.05)' : idx % 2 === 0 ? '#0f172a' : '#141e30',
                    transition: 'background 0.2s'
                  }}>
                    <td style={{ padding: '12px 16px', borderRight: '1px solid #1e293b' }}>
                      <span style={{ background: '#334155', color: '#cbd5e1', padding: '4px 8px', borderRadius: '6px', fontWeight: 700, fontSize: '11px' }}>
                        {doc.source_id.split('-').pop()}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', borderRight: '1px solid #1e293b', maxWidth: '200px' }}>
                      <div style={{ fontWeight: 600, color: '#f8fafc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={doc.file_name}>
                        {doc.file_name}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>{formatSize(doc.file_size)}</div>
                    </td>
                    <td style={{ padding: '0', borderRight: '1px solid #1e293b' }}>
                      <input 
                        style={{ width: '100%', height: '52px', background: 'transparent', border: 'none', outline: 'none', color: '#93c5fd', padding: '0 16px', fontSize: '14px', fontWeight: 500 }}
                        value={doc.project_name || ''}
                        onChange={e => handleCellChange(doc.id, 'project_name', e.target.value)}
                      />
                    </td>
                    <td style={{ padding: '0', borderRight: '1px solid #1e293b' }}>
                      <select 
                        style={{ width: '100%', height: '52px', background: 'transparent', border: 'none', outline: 'none', color: '#93c5fd', padding: '0 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', appearance: 'none' }}
                        value={doc.document_category}
                        onChange={e => handleCellChange(doc.id, 'document_category', e.target.value)}
                      >
                        <option value="UNCATEGORIZED" style={{background:'#1e293b'}}>UNCATEGORIZED</option>
                        <option value="DRAWING" style={{background:'#1e293b'}}>DRAWING</option>
                        <option value="BOQ" style={{background:'#1e293b'}}>BOQ</option>
                        <option value="MATERIAL_LIST" style={{background:'#1e293b'}}>MATERIAL_LIST</option>
                        <option value="CONFIRMED_BOQ" style={{background:'#1e293b'}}>CONFIRMED_BOQ</option>
                      </select>
                    </td>
                    <td style={{ padding: '0', borderRight: '1px solid #1e293b' }}>
                      <select 
                        style={{ width: '100%', height: '52px', background: 'transparent', border: 'none', outline: 'none', color: doc.source_status === 'APPROVED' ? '#34d399' : doc.source_status === 'STAGED' ? '#fbbf24' : '#94a3b8', padding: '0 16px', fontSize: '12px', fontWeight: 800, cursor: 'pointer', appearance: 'none' }}
                        value={doc.source_status}
                        onChange={e => handleCellChange(doc.id, 'source_status', e.target.value)}
                      >
                        <option value="RAW" style={{background:'#1e293b'}}>RAW</option>
                        <option value="STAGED" style={{background:'#1e293b'}}>STAGED</option>
                        <option value="APPROVED" style={{background:'#1e293b'}}>APPROVED</option>
                      </select>
                    </td>
                    <td style={{ padding: '0', borderRight: '1px solid #1e293b' }}>
                       <input 
                        style={{ width: '100%', height: '52px', background: 'rgba(16,185,129,0.05)', border: 'none', outline: 'none', color: '#6ee7b7', padding: '0 16px', fontSize: '13px', fontWeight: 500 }}
                        value={doc.mapped_data || ''}
                        placeholder="Nhập data đồng bộ..."
                        onChange={e => handleCellChange(doc.id, 'mapped_data', e.target.value)}
                      />
                    </td>
                    <td style={{ padding: '0', textAlign: 'center' }}>
                      <button 
                        onClick={() => handleDeleteRow(doc.id)}
                        style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '12px', borderRadius: '8px', transition: 'background 0.2s' }}
                        title="Xóa dòng"
                        onMouseOver={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                        onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredDocs.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ padding: '60px 20px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#64748b' }}>
                        <AlertCircle size={48} style={{ opacity: 0.5, marginBottom: '16px' }} />
                        <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#f8fafc' }}>Không có dữ liệu</h3>
                        <p style={{ marginTop: '8px' }}>Bấm "Thêm Dòng" hoặc "Nhập Excel/PDF" để bắt đầu nạp dữ liệu vào hệ thống.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
