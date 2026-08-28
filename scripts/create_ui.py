ui_code = """'use client';

import { useState } from 'react';
import { UploadCloud, CheckCircle2, AlertCircle, Plus, FileText, ArrowRight, Server, ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function PwrIngestionClient() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [parsedData, setParsedData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    setError(null);
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const res = await fetch('/api/pwr/ingestion/parse', {
        method: 'POST',
        body: formData,
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi server');
      
      setParsedData(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleQuickAdd = async (item: any) => {
    // Gọi API thêm vật tư nhanh
    const res = await fetch('/api/pwr/materials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: item.parsedName,
        skuCode: item.parsedName, // Tạm dùng tên làm mã
        category: item.type,
        unit: item.unit
      })
    });
    
    if (res.ok) {
      // Refresh bằng cách re-upload (hoặc cập nhật state)
      handleUpload();
    }
  };

  const handleExecute = async () => {
    alert("🚀 Giai đoạn 4: Đã nổ Task và Trừ Tồn Kho Thành Công (Mô phỏng)!");
    router.push('/pwr/tasks');
  };

  return (
    <div style={{ padding: '8px 24px 60px', color: 'var(--color-text)', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid var(--color-border)' }}>
        <Server size={24} color="#3b82f6" />
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: -0.5 }}>Trạm Nuốt Dữ Liệu (Ingestion Engine)</h1>
      </div>

      {!parsedData ? (
        <div style={{ background: 'var(--color-surface)', border: '2px dashed var(--color-border)', borderRadius: 16, padding: '64px 24px', textAlign: 'center', maxWidth: 600, margin: '0 auto', transition: 'all 0.2s' }}>
          <UploadCloud size={48} color="var(--color-text-muted)" style={{ marginBottom: 16 }} />
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Kéo thả file Excel từ OneClick Cabinet vào đây</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 14, marginBottom: 24 }}>Hỗ trợ bóc tách tự động Ván, Nẹp, Phụ kiện từ Sheet BOM</p>
          
          <input type="file" accept=".xlsx, .xls" onChange={handleFileChange} style={{ display: 'block', margin: '0 auto 16px' }} />
          
          {file && (
            <button 
              onClick={handleUpload}
              disabled={isUploading}
              style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: 8, fontWeight: 700, cursor: isUploading ? 'not-allowed' : 'pointer' }}
            >
              {isUploading ? 'Đang phân tích (Parsing)...' : 'Tiến hành Nuốt & Chuẩn hóa'}
            </button>
          )}
          {error && <div style={{ color: '#ef4444', marginTop: 16, fontWeight: 600 }}>Cảnh báo: {error}</div>}
        </div>
      ) : (
        <div style={{ animation: 'fadeIn 0.3s ease-in' }}>
          
          {/* Header Báo Cáo */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, background: 'var(--color-surface)', padding: '16px 24px', borderRadius: 12, border: '1px solid var(--color-border)' }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Kết quả đối chiếu: {parsedData.fileName}</h2>
              <div style={{ fontSize: 13, color: 'var(--color-text-muted)', display: 'flex', gap: 16 }}>
                <span style={{ color: '#10b981', fontWeight: 600 }}><CheckCircle2 size={14} style={{ verticalAlign: 'middle', marginRight: 4 }}/> {parsedData.totalMatched} Mã Hợp lệ</span>
                <span style={{ color: '#ef4444', fontWeight: 600 }}><ShieldAlert size={14} style={{ verticalAlign: 'middle', marginRight: 4 }}/> {parsedData.totalMissing} Mã Ngoại lai</span>
              </div>
            </div>
            <button 
              onClick={handleExecute}
              disabled={parsedData.totalMissing > 0}
              style={{ background: parsedData.totalMissing > 0 ? 'var(--color-surface-2)' : '#10b981', color: parsedData.totalMissing > 0 ? 'var(--color-text-muted)' : '#fff', border: 'none', padding: '10px 24px', borderRadius: 8, fontWeight: 700, cursor: parsedData.totalMissing > 0 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
            >
              Phát Lệnh Nổ Task <ArrowRight size={16} />
            </button>
          </div>
          
          {parsedData.totalMissing > 0 && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', padding: 16, borderRadius: 8, marginBottom: 20, color: '#ef4444', fontSize: 14, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertCircle size={20} />
              BỘ LY HỢP KHÓA CỨNG: Phát hiện vật tư ngoại lai. Không thể phát lệnh nổ Task. Vui lòng bổ sung vào Từ Điển.
            </div>
          )}

          {/* Bảng Dữ Liệu */}
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--color-surface-2)', borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Tên Gốc (Raw Name)</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Nhận diện (Type)</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Đã chuẩn hóa</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>Khối lượng</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Trạng thái Từ Điển</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {parsedData.items.map((item: any, idx: number) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '12px 16px', color: 'var(--color-text-muted)' }}>{item.rawName}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: item.type === 'VÁN' ? 'rgba(59,130,246,0.1)' : 'rgba(249,115,22,0.1)', color: item.type === 'VÁN' ? '#3b82f6' : '#f97316' }}>{item.type}</span>
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>{item.parsedName}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700 }}>{item.quantity} <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{item.unit}</span></td>
                    <td style={{ padding: '12px 16px' }}>
                      {item.status === 'MATCHED' ? (
                        <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600, fontSize: 12 }}><CheckCircle2 size={14} /> Khớp ({item.dbMaterialName})</span>
                      ) : (
                        <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600, fontSize: 12 }}><AlertCircle size={14} /> Trống</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {item.status === 'MISSING' && (
                        <button onClick={() => handleQuickAdd(item)} style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 6, padding: '4px 8px', fontSize: 12, fontWeight: 600, color: 'var(--color-text)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Plus size={14} /> Đưa vào Từ điển
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
        </div>
      )}
    </div>
  );
}
"""
with open("src/components/pwr/ingestion/PwrIngestionClient.tsx", "w", encoding="utf-8") as f:
    f.write(ui_code)

page_code = """import PwrIngestionClient from '@/components/pwr/ingestion/PwrIngestionClient';

export default function IngestionPage() {
  return <PwrIngestionClient />;
}
"""
with open("src/app/pwr/ingestion/page.tsx", "w", encoding="utf-8") as f:
    f.write(page_code)

print("Created Frontend")