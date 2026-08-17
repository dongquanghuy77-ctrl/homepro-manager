'use client';

import React, { useState } from 'react';

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

  const filteredDocs = filterCat ? docs.filter(d => d.document_category === filterCat) : docs;

  return (
    <div className="space-y-6">
      {/* Dashboard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center items-center">
          <div className="text-3xl font-bold text-slate-800">{docs.length}</div>
          <div className="text-sm text-slate-500 font-medium">Total Documents</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center items-center">
          <div className="text-3xl font-bold text-blue-600">
            {initialData.statusStats.find(s => s.status === 'RAW')?.count || docs.length}
          </div>
          <div className="text-sm text-slate-500 font-medium">Pending Review (RAW)</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm col-span-2">
          <div className="text-sm text-slate-500 font-medium mb-2">Category Breakdown</div>
          <div className="flex flex-wrap gap-2">
            <button 
              onClick={() => setFilterCat('')}
              className={`px-3 py-1 text-xs rounded-full border ${filterCat === '' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
            >
              All Categories
            </button>
            {initialData.stats.map(s => (
              <button 
                key={s.category} 
                onClick={() => setFilterCat(s.category)}
                className={`px-3 py-1 text-xs rounded-full border ${filterCat === s.category ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
              >
                {s.category} ({s.count})
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-medium">Source ID</th>
                <th className="px-4 py-3 font-medium">File Name</th>
                <th className="px-4 py-3 font-medium">Project</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Size</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDocs.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-slate-500">{doc.source_id.split('-').pop()}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800 max-w-[250px] truncate" title={doc.file_name}>
                      {doc.file_name}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">{new Date(doc.created_at).toLocaleString()}</div>
                  </td>
                  <td className="px-4 py-3 max-w-[200px] truncate" title={doc.project_name}>
                    {doc.project_name || '-'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-medium text-slate-700">{doc.document_category}</span>
                      {doc.classification_confidence && (
                        <span className="text-[10px] text-slate-400">Conf: {(doc.classification_confidence * 100).toFixed(0)}%</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {formatSize(doc.file_size)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(doc.source_status)}`}>
                      {doc.source_status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <a href={`/source-center/${doc.source_id}`} className="text-blue-600 hover:text-blue-800 text-sm font-medium mr-3">
                      View
                    </a>
                  </td>
                </tr>
              ))}
              {filteredDocs.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    No documents found.
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
