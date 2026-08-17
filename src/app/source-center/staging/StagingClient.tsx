'use client';

import { useState } from 'react';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function StagingClient() {
  const [statusFilter, setStatusFilter] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  
  const query = new URLSearchParams();
  if (statusFilter) query.set('status', statusFilter);
  if (moduleFilter) query.set('module', moduleFilter);
  
  const { data, error, mutate } = useSWR(`/api/source-center/staging?${query.toString()}`, fetcher);

  const handleReview = async (stagingId: string, action: 'APPROVE' | 'REJECT', reviewNote: string = '') => {
    try {
      await fetch('/api/source-center/staging', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stagingId, action, reviewNote })
      });
      mutate();
    } catch (err) {
      console.error(err);
    }
  };

  if (error) return <div className="p-8 text-red-500">Lỗi tải dữ liệu</div>;
  if (!data) return <div className="p-8">Đang tải...</div>;

  const records = data.data || [];

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Staging Review</h1>
      </div>

      <div className="flex gap-4 mb-6">
        <select 
          className="border border-gray-300 rounded-md shadow-sm p-2 bg-white"
          value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">Tất cả trạng thái</option>
          <option value="PENDING">PENDING</option>
          <option value="REVIEW">REVIEW</option>
          <option value="APPROVED">APPROVED</option>
          <option value="REJECTED">REJECTED</option>
        </select>

        <select 
          className="border border-gray-300 rounded-md shadow-sm p-2 bg-white"
          value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)}
        >
          <option value="">Tất cả Module</option>
          <option value="BOQ">BOQ</option>
          <option value="PROCUREMENT">PROCUREMENT</option>
          <option value="INVENTORY">INVENTORY</option>
        </select>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full text-sm text-left">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-4 font-medium text-gray-700">Staging ID</th>
              <th className="px-6 py-4 font-medium text-gray-700">Source Document</th>
              <th className="px-6 py-4 font-medium text-gray-700">Module</th>
              <th className="px-6 py-4 font-medium text-gray-700">Chi tiết dữ liệu</th>
              <th className="px-6 py-4 font-medium text-gray-700">Trạng thái</th>
              <th className="px-6 py-4 font-medium text-gray-700">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {records.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  Không có dữ liệu Staging nào
                </td>
              </tr>
            ) : records.map((record: any) => {
              const rawData = typeof record.raw_data === 'string' ? JSON.parse(record.raw_data) : record.raw_data;
              const lines = rawData?.lines || [];
              
              return (
                <tr key={record.staging_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{record.staging_id}</td>
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-800">{record.file_name}</p>
                    <p className="text-xs text-gray-500">{record.source_name}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded text-xs font-medium">
                      {record.target_module}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="max-h-24 overflow-y-auto text-xs text-gray-600 bg-gray-50 p-2 border rounded">
                      {lines.map((l: any, i: number) => (
                        <div key={i} className="mb-1 truncate">
                          • {l.parsed} {l.materialId ? `(Map: ${l.materialId})` : '(Chưa map)'}
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      record.staging_status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                      record.staging_status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                      record.staging_status === 'REVIEW' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {record.staging_status}
                    </span>
                  </td>
                  <td className="px-6 py-4 space-x-2">
                    {record.staging_status === 'PENDING' || record.staging_status === 'REVIEW' ? (
                      <>
                        <button 
                          onClick={() => handleReview(record.staging_id, 'APPROVE')}
                          className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                        >
                          Duyệt
                        </button>
                        <button 
                          onClick={() => {
                            const reason = prompt('Lý do từ chối?');
                            if (reason !== null) handleReview(record.staging_id, 'REJECT', reason);
                          }}
                          className="px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                        >
                          Từ chối
                        </button>
                      </>
                    ) : (
                      <span className="text-gray-400 text-xs">Không có hành động</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
