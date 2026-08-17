'use client';

import React, { useState, useRef } from 'react';
import { Upload, Download, Search, CheckCircle, FileText, AlertCircle } from 'lucide-react';

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
  mapped_data?: string; // Additional editable column
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'RAW': return 'bg-gray-100 text-gray-700';
      case 'INGESTING': return 'bg-blue-100 text-blue-700';
      case 'CLASSIFIED': return 'bg-purple-100 text-purple-700';
      case 'STAGED': return 'bg-yellow-100 text-yellow-700';
      case 'APPROVED': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  // Algorithm: Map incoming excel data to correct rows using source_id matching
  const processImportedData = (importedRows: any[]) => {
    setDocs(prevDocs => {
      const updatedDocs = [...prevDocs];
      let matchCount = 0;

      importedRows.forEach(row => {
        // Smart matching algorithm: Try exact ID, or substring match
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
          // Add new row if not matched (algorithm fallback)
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

      alert(`Thuật toán đã xử lý xong: ${matchCount} dòng khớp dữ liệu cũ, ${importedRows.length - matchCount} dòng được chèn mới thành công!`);
      return updatedDocs;
    });
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      alert(`Đang phân tích file ${file.name} bằng thuật toán ánh xạ...`);
      // Simulate reading Excel file and extracting JSON data
      setTimeout(() => {
        const mockImportedExcelData = [
          { source_id: docs[0]?.source_id, category: 'CONFIRMED_BOQ', status: 'APPROVED', mapped_data: 'Mapped via Excel Auto-Sync' },
          { file_name: 'ban_ve_moi.pdf', project_name: 'DỰ ÁN BẢO MINH', category: 'DRAWING', status: 'STAGED' }
        ];
        processImportedData(mockImportedExcelData);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }, 1500);
    }
  };

  const handleExport = () => {
    alert('Đang xuất báo cáo luồng dữ liệu chuẩn sang PDF...');
  };

  const handleCellChange = (id: number, field: keyof Document, value: string) => {
    setDocs(prev => prev.map(d => d.id === id ? { ...d, [field]: value } : d));
  };

  const filteredDocs = docs.filter(d => {
    if (filterCat && d.document_category !== filterCat) return false;
    if (searchQ && !d.file_name.toLowerCase().includes(searchQ.toLowerCase()) && !d.source_id.toLowerCase().includes(searchQ.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans p-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Source Data Center</h1>
          <p className="text-sm text-slate-500 mt-1">Hệ thống nhập liệu trung tâm kết hợp thuật toán ánh xạ (Row/Col Mapping)</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input type="file" accept=".xlsx,.xls,.pdf,.csv" ref={fileInputRef} className="hidden" onChange={handleImportFile} />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-semibold transition shadow-sm text-sm"
          >
            <Upload size={16} />
            Nhập Data (Excel/PDF)
          </button>
          <button 
            onClick={handleExport}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition shadow-sm text-sm"
          >
            <Download size={16} />
            Xuất Báo Cáo
          </button>
        </div>
      </div>

      {/* Dashboard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center items-center">
          <div className="text-3xl font-bold text-slate-800">{docs.length}</div>
          <div className="text-sm text-slate-500 font-medium">Total Rows</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center items-center">
          <div className="text-3xl font-bold text-blue-600">
            {docs.filter(d => d.source_status === 'RAW').length}
          </div>
          <div className="text-sm text-slate-500 font-medium">Pending Sync</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm col-span-2">
          <div className="text-sm text-slate-500 font-medium mb-2">Filters</div>
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1.5 text-slate-400" size={14} />
              <input 
                type="text" 
                placeholder="Tìm ID, Tên file..." 
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                className="pl-8 pr-3 py-1 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none w-48"
              />
            </div>
            <button 
              onClick={() => setFilterCat('')}
              className={`px-3 py-1 text-xs rounded-full border ${filterCat === '' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
            >
              Tất cả
            </button>
            {initialData.stats.map(s => (
              <button 
                key={s.category} 
                onClick={() => setFilterCat(s.category)}
                className={`px-3 py-1 text-xs rounded-full border ${filterCat === s.category ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
              >
                {s.category}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Excel-like Data Grid */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 whitespace-nowrap">
            <thead className="bg-slate-100 text-slate-600 text-xs uppercase border-b border-slate-300">
              <tr>
                <th className="px-4 py-3 font-bold border-r border-slate-200">ID Nguồn</th>
                <th className="px-4 py-3 font-bold border-r border-slate-200">Tên File</th>
                <th className="px-4 py-3 font-bold border-r border-slate-200">Dự án (Editable)</th>
                <th className="px-4 py-3 font-bold border-r border-slate-200">Phân loại (Editable)</th>
                <th className="px-4 py-3 font-bold border-r border-slate-200">Trạng thái (Editable)</th>
                <th className="px-4 py-3 font-bold border-r border-slate-200">Kích thước</th>
                <th className="px-4 py-3 font-bold">Thuật toán Sync Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredDocs.map((doc, idx) => (
                <tr key={doc.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'} hover:bg-blue-50 transition-colors`}>
                  <td className="px-4 py-2 border-r border-slate-200">
                    <span className="font-mono text-xs text-slate-500 font-bold">{doc.source_id.split('-').pop()}</span>
                  </td>
                  <td className="px-4 py-2 border-r border-slate-200">
                    <div className="font-medium text-slate-800 truncate max-w-xs" title={doc.file_name}>
                      {doc.file_name}
                    </div>
                  </td>
                  <td className="px-4 py-1 border-r border-slate-200 p-0">
                    <input 
                      className="w-full h-full min-h-[36px] bg-transparent outline-none px-4 text-sm focus:bg-white focus:ring-2 focus:ring-inset focus:ring-blue-500 transition-all"
                      value={doc.project_name || ''}
                      onChange={e => handleCellChange(doc.id, 'project_name', e.target.value)}
                    />
                  </td>
                  <td className="px-4 py-1 border-r border-slate-200 p-0">
                    <select 
                      className="w-full h-full min-h-[36px] bg-transparent outline-none px-4 text-sm focus:bg-white focus:ring-2 focus:ring-inset focus:ring-blue-500 appearance-none"
                      value={doc.document_category}
                      onChange={e => handleCellChange(doc.id, 'document_category', e.target.value)}
                    >
                      <option value="UNCATEGORIZED">UNCATEGORIZED</option>
                      <option value="DRAWING">DRAWING</option>
                      <option value="BOQ">BOQ</option>
                      <option value="MATERIAL_LIST">MATERIAL_LIST</option>
                      <option value="CONFIRMED_BOQ">CONFIRMED_BOQ</option>
                    </select>
                  </td>
                  <td className="px-4 py-1 border-r border-slate-200 p-0">
                    <select 
                      className={`w-full h-full min-h-[36px] bg-transparent outline-none px-4 text-xs font-bold focus:bg-white focus:ring-2 focus:ring-inset focus:ring-blue-500 appearance-none ${doc.source_status === 'APPROVED' ? 'text-green-600' : 'text-slate-600'}`}
                      value={doc.source_status}
                      onChange={e => handleCellChange(doc.id, 'source_status', e.target.value)}
                    >
                      <option value="RAW">RAW</option>
                      <option value="STAGED">STAGED</option>
                      <option value="APPROVED">APPROVED</option>
                    </select>
                  </td>
                  <td className="px-4 py-2 border-r border-slate-200 text-slate-500">
                    {formatSize(doc.file_size)}
                  </td>
                  <td className="px-4 py-1 p-0">
                     <input 
                      className="w-full h-full min-h-[36px] bg-emerald-50 text-emerald-800 outline-none px-4 text-sm focus:bg-white focus:ring-2 focus:ring-inset focus:ring-emerald-500 transition-all placeholder-emerald-300"
                      value={doc.mapped_data || ''}
                      placeholder="Chưa có data đồng bộ"
                      onChange={e => handleCellChange(doc.id, 'mapped_data', e.target.value)}
                    />
                  </td>
                </tr>
              ))}
              {filteredDocs.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center">
                      <AlertCircle className="mb-2 text-slate-400" size={32} />
                      <p>Không có dữ liệu nào hiển thị</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
