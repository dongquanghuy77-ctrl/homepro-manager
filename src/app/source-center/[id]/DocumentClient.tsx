'use client';
import { useState, useEffect } from 'react';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function DocumentClient({ id }: { id: string }) {
  const { data, error, mutate } = useSWR(`/api/source-center/${id}`, fetcher);
  const [extracting, setExtracting] = useState(false);
  const [committing, setCommitting] = useState(false);

  if (error) return <div className="p-8 text-red-500">Lỗi tải dữ liệu</div>;
  if (!data) return <div className="p-8">Đang tải...</div>;

  const doc = data.data;
  const lines = data.lines || [];
  const staging = data.staging || [];

  const handleExtract = async () => {
    setExtracting(true);
    try {
      await fetch(`/api/source-center/${id}/extract`, { method: 'POST' });
      mutate();
    } catch (err) {
      console.error(err);
    } finally {
      setExtracting(false);
    }
  };

  const handleCommit = async () => {
    setCommitting(true);
    try {
      await fetch(`/api/source-center/${id}/commit`, { method: 'POST' });
      mutate();
    } catch (err) {
      console.error(err);
    } finally {
      setCommitting(false);
    }
  };

  const handleLineUpdate = async (lineId: string, parsedValue: string, linkedMaterialId: string | null) => {
    try {
      await fetch(`/api/source-center/${id}/lines`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lineId, parsedValue, linkedMaterialId: linkedMaterialId ? parseInt(linkedMaterialId) : null, needsReview: false })
      });
      mutate();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center bg-white p-6 rounded-lg shadow">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{doc.file_name}</h1>
          <p className="text-sm text-gray-500">Project: {doc.project_name || 'N/A'} | Category: {doc.document_category}</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
              {doc.source_status}
            </span>
            <span className="text-sm text-gray-500">ID: {doc.source_id}</span>
          </div>
        </div>
        <div className="space-x-3">
          {lines.length === 0 && (
            <button 
              onClick={handleExtract} 
              disabled={extracting}
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
            >
              {extracting ? 'Đang trích xuất...' : 'Trích xuất dữ liệu (AI)'}
            </button>
          )}
          {lines.length > 0 && lines.some((l: any) => !l.staged_record_id) && (
            <button 
              onClick={handleCommit} 
              disabled={committing}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              {committing ? 'Đang đẩy...' : 'Đẩy lên Staging'}
            </button>
          )}
        </div>
      </div>

      {/* Lines Section */}
      {lines.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Dữ liệu đã trích xuất ({lines.length} dòng)</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 font-medium text-gray-700">Dòng</th>
                  <th className="px-4 py-3 font-medium text-gray-700">Giá trị gốc</th>
                  <th className="px-4 py-3 font-medium text-gray-700">Giá trị đã chuẩn hóa</th>
                  <th className="px-4 py-3 font-medium text-gray-700">Phân loại</th>
                  <th className="px-4 py-3 font-medium text-gray-700">Map Master Data (Vật tư)</th>
                  <th className="px-4 py-3 font-medium text-gray-700">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {lines.map((l: any) => (
                  <tr key={l.line_id} className={l.needs_review ? 'bg-yellow-50' : 'hover:bg-gray-50'}>
                    <td className="px-4 py-3">{l.line_number}</td>
                    <td className="px-4 py-3 text-gray-600">{l.raw_value}</td>
                    <td className="px-4 py-3">
                      <input 
                        type="text" 
                        defaultValue={l.parsed_value} 
                        className="border rounded px-2 py-1 w-full"
                        onBlur={(e) => handleLineUpdate(l.line_id, e.target.value, l.linked_material_id)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs ${l.confidence === 'HIGH' ? 'bg-green-100 text-green-800' : l.confidence === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                        {l.field_type} ({l.confidence})
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <select 
                        className="border rounded px-2 py-1 w-full"
                        defaultValue={l.linked_material_id || ''}
                        onChange={(e) => handleLineUpdate(l.line_id, l.parsed_value, e.target.value)}
                      >
                        <option value="">-- Chưa map --</option>
                        <option value="1">Gỗ MDF phủ Melamine 17mm Mộc Phát</option>
                        <option value="2">Bản lề giảm chấn Hafele 315</option>
                        <option value="3">Ray bi 3 tầng Ivan 400mm</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      {l.staged_record_id ? (
                        <span className="text-green-600 font-medium">Đã Staging</span>
                      ) : l.needs_review ? (
                        <span className="text-yellow-600 font-medium">Cần Review</span>
                      ) : (
                        <span className="text-blue-600 font-medium">Sẵn sàng</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Staging History */}
      {staging.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Lịch sử Staging</h2>
          <ul className="space-y-3">
            {staging.map((s: any) => (
              <li key={s.staging_id} className="p-4 border rounded bg-gray-50 flex justify-between items-center">
                <div>
                  <p className="font-medium">{s.staging_id}</p>
                  <p className="text-sm text-gray-500">Module: {s.target_module} | Target: {s.target_entity}</p>
                </div>
                <div className="text-right">
                  <span className="px-2 py-1 bg-gray-200 text-gray-800 rounded text-xs font-medium">{s.staging_status}</span>
                  <p className="text-xs text-gray-400 mt-1">{new Date(s.created_at).toLocaleString('vi-VN')}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
