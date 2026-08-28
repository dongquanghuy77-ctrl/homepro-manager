'use client';

import React, { useState, useEffect } from 'react';
import { UploadCloud, CheckCircle2, AlertCircle, Plus, FileText, ArrowRight, Server, ShieldAlert, Clock, XCircle, Info, Bell, Book, History, Download, MoreVertical, HelpCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function PwrIngestionClient() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [parsedData, setParsedData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  
  // New states for Smart Router
  const [projectMode, setProjectMode] = useState<'NEW' | 'EXISTING'>('NEW');
  const [newProjectName, setNewProjectName] = useState<string>('');
  const [newProjectType, setNewProjectType] = useState<string>('CÔNG TRÌNH');
  const [showProjectHelp, setShowProjectHelp] = useState<boolean>(true);

  useEffect(() => {
    fetch('/api/pwr/projects')
      .then(res => res.json())
      .then(data => {
        if (data.projects) setProjects(data.projects);
      })
      .catch(err => console.error(err));
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    if (projectMode === 'EXISTING' && !selectedProjectId) {
      setError('Vui lòng chọn Dự án trước khi tải file lên!');
      return;
    }
    
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
    const res = await fetch('/api/pwr/materials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: item.parsedName,
        skuCode: item.parsedName,
        category: item.type,
        unit: item.unit
      })
    });
    
    if (res.ok) {
      handleUpload();
    }
  };

  const handleExecute = async () => {
    if (!parsedData) return;
    if (isUploading) return;
    
    let finalProjectId = selectedProjectId;
    let finalProjectName = newProjectName || parsedData.fileName.replace('.xlsx', '');
    
    if (projectMode === 'EXISTING') {
      if (!selectedProjectId) {
        alert('Vui lòng chọn Dự án!');
        return;
      }
      const selectedProject = projects.find(p => p.id.toString() === selectedProjectId);
      if (selectedProject) {
        finalProjectName = selectedProject.name;
      } else {
        return;
      }
    }

    setIsUploading(true);
    try {
      const batchId = Date.now().toString();
      const res = await fetch('/api/pwr/ingestion/explode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: parsedData.fileName,
          items: parsedData.items,
          batchId: batchId,
          projectId: finalProjectId,
          projectName: finalProjectName,
          isNewProject: projectMode === 'NEW',
          newProjectType: newProjectType
        })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      
      if (result.isShortage) {
        alert(`🚨 Tồn kho không đủ ! Đã chuyển Task sang chế độ [Chờ Vật Tư] và tạo Yêu cầu mua hàng.\nDự án: ${finalProjectName}`);
      } else {
        alert(`💥 ĐÃ NỔ TASK THÀNH CÔNG!\nNhiệm vụ đã được đưa vào WBS của ${finalProjectName}`);
      }
      router.push(`/pwr/kanban?search=BATCH_${batchId}`);
    } catch (err: any) {
      alert("Lỗi Nổ Task: " + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div style={{ padding: '8px 24px 60px', color: 'var(--color-text)', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid var(--color-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Server size={24} color="#3b82f6" />
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            Trạm Nuốt Dữ Liệu (Ingestion Engine)
            <span style={{ fontSize: 11, background: '#1e3a8a', color: '#60a5fa', padding: '2px 8px', borderRadius: 99, fontWeight: 600 }}>Beta</span>
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={() => alert('Tài liệu hướng dẫn chi tiết đang được cập nhật.')} style={{ cursor: 'pointer', background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)', padding: '6px 12px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600 }}>
            <Book size={16} /> Tài liệu hướng dẫn
          </button>
          <button onClick={() => alert('Tính năng xem toàn bộ Lịch sử xử lý đang được phát triển.')} style={{ cursor: 'pointer', background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)', padding: '6px 12px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600 }}>
            <History size={16} /> Lịch sử xử lý
          </button>
          <button onClick={() => alert('Bạn có 3 thông báo mới chưa đọc. Trung tâm thông báo đang được nâng cấp.')} style={{ cursor: 'pointer', background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)', padding: '6px 8px', borderRadius: 6, display: 'flex', alignItems: 'center', position: 'relative' }}>
            <Bell size={18} />
            <span style={{ position: 'absolute', top: -4, right: -4, background: '#ef4444', color: '#fff', fontSize: 10, width: 16, height: 16, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>3</span>
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24 }}>
        
        {/* Main Content */}
        <div>
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 8px 0' }}>Chào mừng trở lại!</h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 14, margin: 0 }}>Trạm nuốt dữ liệu sẵn sàng xử lý file Excel của bạn một cách thông minh và an toàn.</p>
          </div>

          {!parsedData ? (
            <>
              {/* Box Upload */}
              <div style={{ background: 'var(--color-surface)', border: '2px dashed var(--color-border)', borderRadius: 16, padding: '48px 24px', textAlign: 'center', marginBottom: 24, transition: 'all 0.2s', position: 'relative' }}>
                <UploadCloud size={48} color="var(--color-text-muted)" style={{ marginBottom: 16 }} />
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, margin: 0 }}>Kéo thả file Excel hoặc click để chọn file</h3>
                <p style={{ color: 'var(--color-text-muted)', fontSize: 14, marginBottom: 24 }}>Hỗ trợ: .xlsx, .xls • Tối đa 50MB • Tự động kiểm tra & xử lý dữ liệu</p>
                
                <div style={{ maxWidth: 400, margin: '0 auto 24px auto', textAlign: 'left' }}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                    <button 
                      onClick={() => setProjectMode('NEW')}
                      style={{ flex: 1, padding: '8px 0', border: '1px solid', borderColor: projectMode === 'NEW' ? '#3b82f6' : 'var(--color-border)', background: projectMode === 'NEW' ? 'rgba(59,130,246,0.1)' : 'transparent', color: projectMode === 'NEW' ? '#3b82f6' : 'var(--color-text-muted)', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 13 }}
                    >
                      + Tạo Dự Án Mới
                    </button>
                    <button 
                      onClick={() => setProjectMode('EXISTING')}
                      style={{ flex: 1, padding: '8px 0', border: '1px solid', borderColor: projectMode === 'EXISTING' ? '#3b82f6' : 'var(--color-border)', background: projectMode === 'EXISTING' ? 'rgba(59,130,246,0.1)' : 'transparent', color: projectMode === 'EXISTING' ? '#3b82f6' : 'var(--color-text-muted)', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 13 }}
                    >
                      Bổ Sung Dự Án Cũ
                    </button>
                  </div>

                  {projectMode === 'NEW' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--color-text-muted)' }}>Tên Dự Án Mới (Tự động lấy tên file nếu để trống):</label>
                        <input 
                          type="text" 
                          placeholder="VD: Tủ bếp nhà anh A..."
                          value={newProjectName}
                          onChange={(e) => setNewProjectName(e.target.value)}
                          style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)', outline: 'none', fontSize: 14 }}
                        />
                      </div>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, alignItems: 'center' }}>
                          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)' }}>Phân Loại Dự Án:</label>
                          <button 
                            onClick={() => setShowProjectHelp(!showProjectHelp)}
                            style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, padding: 0 }}
                          >
                            <HelpCircle size={14} /> {showProjectHelp ? 'Ẩn bảng hướng dẫn' : 'Xem bảng phân loại'}
                          </button>
                        </div>
                        <select 
                          value={newProjectType}
                          onChange={(e) => setNewProjectType(e.target.value)}
                          style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)', outline: 'none', fontSize: 14 }}
                        >
                          <option value="CÔNG TRÌNH">Công Trình / Dự Án (B2B)</option>
                          <option value="BÁN LẺ">Bán Lẻ / Đơn Hàng (B2C)</option>
                          <option value="NỘI BỘ">Sản Xuất Nội Bộ / Mẫu</option>
                        </select>
                        
                        {showProjectHelp && (
                          <div style={{ marginTop: 12, background: 'var(--color-surface)', border: '1px solid #3b82f6', borderRadius: 8, overflow: 'hidden' }}>
                            <div style={{ background: 'rgba(59,130,246,0.1)', padding: '8px 12px', fontSize: 12, fontWeight: 700, color: '#3b82f6', borderBottom: '1px solid rgba(59,130,246,0.2)' }}>
                              BẢNG TỔNG HỢP KIỂM TRA NHANH
                            </div>
                            <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse', textAlign: 'left' }}>
                              <thead>
                                <tr style={{ background: 'var(--color-surface-2)', borderBottom: '1px solid var(--color-border)' }}>
                                  <th style={{ padding: '8px', fontWeight: 600, color: 'var(--color-text-muted)' }}>Tiêu chí</th>
                                  <th style={{ padding: '8px', fontWeight: 600 }}>Công Trình</th>
                                  <th style={{ padding: '8px', fontWeight: 600 }}>Bán Lẻ</th>
                                  <th style={{ padding: '8px', fontWeight: 600 }}>Nội Bộ</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                                  <td style={{ padding: '8px', fontWeight: 600, color: 'var(--color-text-muted)' }}>Quy mô</td>
                                  <td style={{ padding: '8px' }}>Nhiều đợt</td>
                                  <td style={{ padding: '8px' }}>1 đợt</td>
                                  <td style={{ padding: '8px' }}>Ít món</td>
                                </tr>
                                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                                  <td style={{ padding: '8px', fontWeight: 600, color: 'var(--color-text-muted)' }}>Lắp đặt?</td>
                                  <td style={{ padding: '8px' }}>Bắt buộc</td>
                                  <td style={{ padding: '8px' }}>Không</td>
                                  <td style={{ padding: '8px' }}>Không</td>
                                </tr>
                                <tr>
                                  <td style={{ padding: '8px', fontWeight: 600, color: 'var(--color-text-muted)' }}>Doanh thu</td>
                                  <td style={{ padding: '8px' }}>Có</td>
                                  <td style={{ padding: '8px' }}>Có</td>
                                  <td style={{ padding: '8px', color: '#ef4444', fontWeight: 600 }}>Chi phí</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--color-text)' }}>Chọn Dự Án (Bắt buộc):</label>
                      <select 
                        value={selectedProjectId}
                        onChange={(e) => setSelectedProjectId(e.target.value)}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)', outline: 'none', fontSize: 14 }}
                      >
                        <option value="">-- Chọn dự án --</option>
                        {projects.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <input type="file" id="file-upload" accept=".xlsx, .xls" onChange={handleFileChange} style={{ display: 'none' }} />
                <label htmlFor="file-upload" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#3b82f6', color: '#fff', padding: '10px 24px', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>
                  <Plus size={18} /> Chọn file từ máy tính
                </label>
                
                {file && (
                  <div style={{ marginTop: 24, padding: 16, background: 'var(--color-surface-2)', borderRadius: 8, display: 'inline-block', minWidth: 300, textAlign: 'left' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <FileText size={20} color="#3b82f6" />
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{file.name}</span>
                    </div>
                    <button 
                      onClick={handleUpload}
                      disabled={isUploading || (projectMode === 'EXISTING' && !selectedProjectId)}
                      style={{ width: '100%', background: (isUploading || (projectMode === 'EXISTING' && !selectedProjectId)) ? 'var(--color-border)' : '#10b981', color: '#fff', border: 'none', padding: '10px', borderRadius: 6, fontWeight: 600, cursor: (isUploading || (projectMode === 'EXISTING' && !selectedProjectId)) ? 'not-allowed' : 'pointer' }}
                    >
                      {isUploading ? 'Đang phân tích...' : 'Tiến hành Nuốt & Chuẩn hóa'}
                    </button>
                  </div>
                )}
                {error && <div style={{ color: '#ef4444', marginTop: 16, fontWeight: 600, fontSize: 14 }}><AlertCircle size={16} style={{ display: 'inline', verticalAlign: 'text-bottom' }} /> {error}</div>}
              </div>

              {/* KPI Cards (Mocked based on reference design) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
                <div style={{ background: 'var(--color-surface)', padding: 16, borderRadius: 12, border: '1px solid var(--color-border)' }}>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>Tổng file đã xử lý <div style={{ background: 'rgba(59,130,246,0.1)', padding: 4, borderRadius: 6 }}><FileText size={16} color="#3b82f6"/></div></div>
                  <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>1,247</div>
                  <div style={{ fontSize: 12, color: '#10b981' }}>+12% <span style={{ color: 'var(--color-text-muted)' }}>so với tuần trước</span></div>
                </div>
                <div style={{ background: 'var(--color-surface)', padding: 16, borderRadius: 12, border: '1px solid var(--color-border)' }}>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>Thành công <div style={{ background: 'rgba(16,185,129,0.1)', padding: 4, borderRadius: '50%' }}><CheckCircle2 size={16} color="#10b981"/></div></div>
                  <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>1,186</div>
                  <div style={{ fontSize: 12, color: '#10b981' }}>95.1% <span style={{ color: 'var(--color-text-muted)' }}>tỷ lệ thành công</span></div>
                </div>
                <div style={{ background: 'var(--color-surface)', padding: 16, borderRadius: 12, border: '1px solid var(--color-border)' }}>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>Đang xử lý <div style={{ background: 'rgba(245,158,11,0.1)', padding: 4, borderRadius: '50%' }}><Clock size={16} color="#f59e0b"/></div></div>
                  <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>3</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>File đang trong hàng đợi</div>
                </div>
                <div style={{ background: 'var(--color-surface)', padding: 16, borderRadius: 12, border: '1px solid var(--color-border)' }}>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>Thất bại <div style={{ background: 'rgba(239,68,68,0.1)', padding: 4, borderRadius: '50%' }}><XCircle size={16} color="#ef4444"/></div></div>
                  <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>58</div>
                  <div style={{ fontSize: 12, color: '#ef4444' }}>4.9% <span style={{ color: 'var(--color-text-muted)' }}>cần kiểm tra lại</span></div>
                </div>
              </div>

              {/* History Table (Mocked) */}
              <div style={{ background: 'var(--color-surface)', borderRadius: 12, border: '1px solid var(--color-border)', padding: 20 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 16px 0' }}>Lịch sử xử lý gần đây</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {[
                    { n: 'Bang_ke_vat_tu_T5_2024.xlsx', size: '2.4 MB', r: '1,234', s: 'Thành công', sc: '#10b981', t: '2 phút trước' },
                    { n: 'Danh_sach_nhan_su_04.xlsx', size: '1.1 MB', r: '567', s: 'Thành công', sc: '#10b981', t: '15 phút trước' },
                    { n: 'Bao_cao_ton_kho_T4.xlsx', size: '3.7 MB', r: '2,890', s: 'Đang xử lý', sc: '#f59e0b', t: '18 phút trước' },
                    { n: 'Du_lieu_san_xuat_T4.xlsx', size: '5.2 MB', r: '4,567', s: 'Thất bại', sc: '#ef4444', t: '32 phút trước', err: 'Lỗi định dạng cột' }
                  ].map((h, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 16, borderBottom: i < 3 ? '1px solid var(--color-border)' : 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ background: h.sc === '#ef4444' ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)', padding: 8, borderRadius: 8 }}>
                          <FileText size={20} color={h.sc} />
                        </div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{h.n}</div>
                          <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{h.size} • {h.r} dòng dữ liệu</div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: 24 }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: h.sc, marginBottom: 2 }}>{h.s}</div>
                          <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{h.err || h.t}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 12, color: 'var(--color-text-muted)' }}>
                          <Download size={18} cursor="pointer" />
                          <MoreVertical size={18} cursor="pointer" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ textAlign: 'center', marginTop: 16 }}>
                  <button style={{ background: 'transparent', border: 'none', color: '#3b82f6', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Xem tất cả lịch sử →</button>
                </div>
              </div>
            </>
          ) : (
            // ====================== PHẦN KẾT QUẢ ĐỐI CHIẾU ======================
            <div style={{ animation: 'fadeIn 0.3s ease-in' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, background: 'var(--color-surface)', padding: '20px 24px', borderRadius: 12, border: '1px solid var(--color-border)' }}>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                    Kết quả đối chiếu: {parsedData.fileName}
                  </h2>
                  <div style={{ fontSize: 14, color: 'var(--color-text-muted)', display: 'flex', gap: 16 }}>
                    <span style={{ color: '#10b981', fontWeight: 600 }}><CheckCircle2 size={16} style={{ verticalAlign: 'text-bottom', marginRight: 4 }}/> {parsedData.totalMatched} Mã Hợp lệ</span>
                    <span style={{ color: '#ef4444', fontWeight: 600 }}><ShieldAlert size={16} style={{ verticalAlign: 'text-bottom', marginRight: 4 }}/> {parsedData.totalMissing} Mã Ngoại lai</span>
                  </div>
                </div>
                <button 
                  onClick={handleExecute}
                  disabled={isUploading}
                  style={{ background: isUploading ? 'var(--color-surface-2)' : '#10b981', color: isUploading ? 'var(--color-text-muted)' : '#fff', border: 'none', padding: '12px 24px', borderRadius: 8, fontWeight: 700, cursor: isUploading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}
                >
                  {isUploading ? 'ĐANG XỬ LÝ...' : 'Phát Lệnh Nổ Task'} <ArrowRight size={18} />
                </button>
              </div>
              
              {parsedData.totalMissing > 0 && (
                <div style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', padding: 16, borderRadius: 8, marginBottom: 20, color: '#3b82f6', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <AlertCircle size={20} />
                  TỰ ĐỘNG TẠO MÃ (AUTO-MASTER DATA): Các vật tư ngoại lai sẽ tự động được thêm vào Từ Điển và phát lệnh mua hàng khi Nổ Task.
                </div>
              )}

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
                            <button onClick={() => handleQuickAdd(item)} style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 6, padding: '6px 10px', fontSize: 12, fontWeight: 600, color: 'var(--color-text)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Plus size={14} /> Đưa vào Từ điển
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div style={{ marginTop: 24 }}>
                <button onClick={() => { setParsedData(null); setFile(null); }} style={{ background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text)', padding: '10px 20px', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>
                  ← Quay lại Tải file khác
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {/* Instructions */}
          <div style={{ background: 'var(--color-surface)', padding: 24, borderRadius: 12, border: '1px solid var(--color-border)' }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 20px 0' }}>Hướng dẫn nhanh</h3>
            
            <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#3b82f6', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>1</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Chuẩn bị file Excel & Chọn Dự Án</div>
                <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Đảm bảo file xuất từ OneClick. Bắt buộc chọn Dự Án để đưa Task vào WBS.</div>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#3b82f6', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>2</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Chọn & tải lên file</div>
                <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Kéo thả hoặc chọn file từ máy tính (Tối đa 50MB)</div>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#3b82f6', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>3</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Kiểm tra & xác nhận</div>
                <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Hệ thống tự đối chiếu mã vật tư. Bổ sung từ điển nếu báo Đỏ.</div>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#6366f1', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>4</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Phát lệnh Nổ Task</div>
                <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Task được đẩy thẳng vào Cấu Trúc Dự Án (WBS) và phân bổ tải trọng máy.</div>
              </div>
            </div>
            
            <button style={{ width: '100%', background: 'rgba(99,102,241,0.1)', color: '#6366f1', border: 'none', padding: '10px', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              Xem hướng dẫn chi tiết <ArrowRight size={14} />
            </button>
          </div>

          {/* System Info */}
          <div style={{ background: 'var(--color-surface)', padding: 24, borderRadius: 12, border: '1px solid var(--color-border)' }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 16px 0' }}>Thông tin hệ thống</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 8 }}><CheckCircle2 size={14}/> Trạng thái hệ thống</span>
                <span style={{ color: '#10b981', fontWeight: 600 }}>Hoạt động tốt</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 8 }}><Server size={14}/> Phiên bản</span>
                <span style={{ fontWeight: 500 }}>v2.1.0-beta</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 8 }}><Clock size={14}/> Cập nhật cuối</span>
                <span style={{ fontWeight: 500 }}>Vừa xong</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginTop: 4 }}>
                <span style={{ color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 8 }}><Server size={14}/> Dung lượng đã dùng</span>
                <span style={{ fontWeight: 500 }}>2.4 GB / 10 GB</span>
              </div>
              <div style={{ width: '100%', height: 6, background: 'var(--color-border)', borderRadius: 3, marginTop: 4, overflow: 'hidden' }}>
                <div style={{ width: '24%', height: '100%', background: '#3b82f6', borderRadius: 3 }}></div>
              </div>
            </div>
          </div>

          {/* Tips */}
          <div style={{ background: 'rgba(245,158,11,0.05)', padding: 20, borderRadius: 12, border: '1px solid rgba(245,158,11,0.2)' }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 8px 0', color: '#d97706', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Info size={16} /> Mẹo & lưu ý
            </h3>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
              Tính năng Auto-Master Data đã được kích hoạt. Vật tư ngoại lai (Đỏ) sẽ không còn làm kẹt quy trình. Hệ thống sẽ tự động thêm mới vào Từ Điển và kích hoạt luồng đi mua hàng bổ sung.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
