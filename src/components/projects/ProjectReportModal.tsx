'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Printer, Download, X, DollarSign, CheckCircle2, ShieldAlert, BookOpen, Package, FileSpreadsheet, Building2 } from 'lucide-react';

interface ProjectReportModalProps {
  projectId: number;
  isOpen: boolean;
  onClose: () => void;
}

export default function ProjectReportModal({ projectId, isOpen, onClose }: ProjectReportModalProps) {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen && projectId) {
      loadReport();
    }
  }, [isOpen, projectId]);

  async function loadReport() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/projects/${projectId}/report`);
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Không thể tải báo cáo');
      setData(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen || !mounted) return null;

  function formatVND(num: number) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num || 0);
  }

  function exportCSV() {
    if (!data) return;

    const p = data.project;
    const s = data.summary;

    let csv = `\uFEFF`; // UTF-8 BOM
    csv += `HỒ SƠ BÁO CÁO TỔNG HỢP DỰ ÁN 360°\n`;
    csv += `Mã Dự Án,${p.code}\n`;
    csv += `Tên Dự Án,${p.name}\n`;
    csv += `Chủ Đầu Tư,${p.customer || '—'}\n`;
    csv += `Ngày Báo Cáo,${new Date().toLocaleDateString('vi-VN')}\n\n`;

    csv += `TỔNG QUAN TÀI CHÍNH & TIẾN ĐỘ\n`;
    csv += `Giá trị Hợp đồng,${s.totalContractValue}\n`;
    csv += `Tổng Chi phí phát sinh,${s.totalCostAmount}\n`;
    csv += `Lợi nhuận gộp,${s.grossProfit}\n`;
    csv += `Tỷ suất lợi nhuận,${s.profitMargin}%\n`;
    csv += `Tiến độ hoàn thành,${s.progressPercent}%\n\n`;

    csv += `DANH SÁCH CÔNG VIỆC\n`;
    csv += `Tên Công Việc,Người Phụ Trách,Trạng Thái,% Hoàn Thành\n`;
    data.tasks.forEach((t: any) => {
      csv += `"${t.name}","${t.assigneeName || ''}","${t.status}","${t.progress || 0}%"\n`;
    });

    csv += `\nCHI PHÍ PHÁT SINH\n`;
    csv += `Ngày Chi,Nội Dung,Phân Loại,Số Tiền\n`;
    data.costs.forEach((c: any) => {
      csv += `"${c.costDate}","${c.title}","${c.category}","${c.amount}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Bao_Cao_Du_An_${p.code}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const modalContent = (
    <div
      className="modal-backdrop print-modal-backdrop"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(5px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        className="modal print-modal-box"
        style={{
          maxWidth: 950,
          width: '100%',
          maxHeight: '92vh',
          backgroundColor: '#0F172A',
          color: '#F8FAFC',
          borderRadius: 16,
          boxShadow: '0 25px 80px rgba(0, 0, 0, 0.8)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          zIndex: 100000,
        }}
      >
        {/* Modal Top Bar */}
        <div
          className="no-print"
          style={{
            padding: '14px 20px',
            background: '#1E293B',
            borderBottom: '1px solid #334155',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileSpreadsheet className="text-primary" size={20} />
            Hồ sơ Báo cáo Tổng hợp 360° — {data?.project?.code || 'Loading...'}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={exportCSV}
              disabled={loading || !data}
              style={{ background: '#334155', color: '#F8FAFC', border: 'none' }}
            >
              <Download size={14} /> Xuất Excel CSV
            </button>

            <button
              className="btn btn-primary btn-sm"
              onClick={() => window.print()}
              disabled={loading || !data}
            >
              <Printer size={14} /> In Báo Cáo / Xuất PDF
            </button>

            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94A3B8',
                cursor: 'pointer',
                fontSize: 20,
                padding: '0 4px',
              }}
            >
              ×
            </button>
          </div>
        </div>

        {/* Printable Report Body */}
        <div
          className="print-report-container"
          style={{
            padding: '24px 32px',
            overflowY: 'auto',
            flex: 1,
            background: '#0F172A',
            color: '#F8FAFC',
          }}
        >
          {loading ? (
            <div style={{ padding: 60, textAlign: 'center', color: '#94A3B8' }}>
              Đang tổng hợp dữ liệu 6 phân hệ dự án...
            </div>
          ) : error ? (
            <div className="alert alert-danger">{error}</div>
          ) : !data ? null : (
            <div className="report-paper">
              {/* Header Letterhead */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  paddingBottom: 16,
                  borderBottom: '2px solid #334155',
                  marginBottom: 20,
                }}
              >
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#38BDF8', letterSpacing: 0.5 }}>
                    {data.settings.company_name || 'XƯỞNG NỘI THẤT HOMEPRO'}
                  </div>
                  <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>
                    📍 {data.settings.address || 'Khu công nghiệp / Xưởng thi công HomePro'}
                  </div>
                  <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>
                    📞 Hotline: {data.settings.hotline || '0905 123 456'} | 🏦 Ngân hàng: {data.settings.bank_account || 'Vietcombank'}
                  </div>
                </div>

                <div style={{ textAlign: 'right', fontSize: 12, color: '#94A3B8' }}>
                  <div>Ngày lập báo cáo: <strong>{new Date().toLocaleDateString('vi-VN')}</strong></div>
                  <div>Hệ thống: HomePro Manager v2.0</div>
                </div>
              </div>

              {/* Document Title */}
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: '#F8FAFC', margin: 0 }}>
                  HỒ SƠ BÁO CÁO TỔNG HỢP DỰ ÁN 360°
                </h2>
                <div style={{ fontSize: 14, color: '#38BDF8', fontWeight: 600, marginTop: 4 }}>
                  MÃ DỰ ÁN: {data.project.code} — {data.project.name.toUpperCase()}
                </div>
              </div>

              {/* Executive KPI Summary Box */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: 12,
                  marginBottom: 24,
                  padding: 16,
                  background: '#1E293B',
                  borderRadius: 12,
                  border: '1px solid #334155',
                }}
              >
                <div>
                  <div style={{ fontSize: 11, color: '#94A3B8' }}>Giá Trị Hợp Đồng</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#60A5FA', marginTop: 4 }}>
                    {formatVND(data.summary.totalContractValue)}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 11, color: '#94A3B8' }}>Chi Phí Thực Tế</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#F87171', marginTop: 4 }}>
                    {formatVND(data.summary.totalCostAmount)}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 11, color: '#94A3B8' }}>Lợi Nhuận Gộp (%)</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: data.summary.grossProfit >= 0 ? '#34D399' : '#F87171', marginTop: 4 }}>
                    {formatVND(data.summary.grossProfit)} ({data.summary.profitMargin}%)
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 11, color: '#94A3B8' }}>Tiến Độ Tổng Thể</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#FBBF24', marginTop: 4 }}>
                    {data.summary.progressPercent}% hoàn thành
                  </div>
                </div>
              </div>

              {/* SECTION I: Project General Information */}
              <div className="report-section mb-6">
                <h3 className="section-header" style={{ fontSize: 14, fontWeight: 700, color: '#38BDF8', borderBottom: '1px solid #334155', paddingBottom: 6, marginBottom: 10 }}>
                  I. THÔNG TIN CHUNG DỰ ÁN & CHỦ ĐẦU TƯ
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 13 }}>
                  <div>• Chủ đầu tư: <strong>{data.project.customer || 'Chưa cập nhật'}</strong></div>
                  <div>• Trạng thái: <strong>{data.project.status}</strong></div>
                  <div>• Địa chỉ công trình: <strong>{data.project.location || '—'}</strong></div>
                  <div>• Quản lý dự án: <strong>{data.project.manager || '—'}</strong></div>
                  <div>• Ngày bắt đầu: <strong>{data.project.startDate || '—'}</strong></div>
                  <div>• Hạn bàn giao: <strong>{data.project.deadline || '—'}</strong></div>
                </div>
              </div>

              {/* SECTION II: Tasks & Schedule */}
              <div className="report-section mb-6">
                <h3 className="section-header" style={{ fontSize: 14, fontWeight: 700, color: '#38BDF8', borderBottom: '1px solid #334155', paddingBottom: 6, marginBottom: 10 }}>
                  II. DANH MỤC CÔNG VIỆC & TIẾN ĐỘ THI CÔNG ({data.tasks.length} hạng mục)
                </h3>
                {data.tasks.length === 0 ? (
                  <div style={{ fontSize: 12, color: '#94A3B8' }}>Chưa có danh mục công việc.</div>
                ) : (
                  <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#1E293B', color: '#94A3B8', textAlign: 'left' }}>
                        <th style={{ padding: 6, borderBottom: '1px solid #334155' }}>Tên Công Việc</th>
                        <th style={{ padding: 6, borderBottom: '1px solid #334155' }}>Phụ Trách</th>
                        <th style={{ padding: 6, borderBottom: '1px solid #334155' }}>Trạng Thái</th>
                        <th style={{ padding: 6, borderBottom: '1px solid #334155', textAlign: 'right' }}>% Tiến Độ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.tasks.map((t: any) => (
                        <tr key={t.id} style={{ borderBottom: '1px solid #1E293B' }}>
                          <td style={{ padding: 6, fontWeight: 600 }}>{t.name}</td>
                          <td style={{ padding: 6 }}>{t.assigneeName || '—'}</td>
                          <td style={{ padding: 6 }}>{t.status}</td>
                          <td style={{ padding: 6, textAlign: 'right', fontWeight: 700, color: '#38BDF8' }}>{t.progress || 0}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* SECTION III: BOQ & Materials */}
              <div className="report-section mb-6">
                <h3 className="section-header" style={{ fontSize: 14, fontWeight: 700, color: '#38BDF8', borderBottom: '1px solid #334155', paddingBottom: 6, marginBottom: 10 }}>
                  III. DỰ TOÁN BÓC TÁCH VẬT TƯ (BOQ) ({data.boqItems.length} chi tiết)
                </h3>
                {data.boqItems.length === 0 ? (
                  <div style={{ fontSize: 12, color: '#94A3B8' }}>Chưa có bảng bóc tách BOQ.</div>
                ) : (
                  <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#1E293B', color: '#94A3B8', textAlign: 'left' }}>
                        <th style={{ padding: 6, borderBottom: '1px solid #334155' }}>Hạng Mục / Đồ Gỗ</th>
                        <th style={{ padding: 6, borderBottom: '1px solid #334155' }}>Vật Tư</th>
                        <th style={{ padding: 6, borderBottom: '1px solid #334155', textAlign: 'center' }}>ĐVT</th>
                        <th style={{ padding: 6, borderBottom: '1px solid #334155', textAlign: 'right' }}>Dự Toán</th>
                        <th style={{ padding: 6, borderBottom: '1px solid #334155', textAlign: 'right' }}>Thành Tiền</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.boqItems.map((b: any) => (
                        <tr key={b.id} style={{ borderBottom: '1px solid #1E293B' }}>
                          <td style={{ padding: 6, fontWeight: 600 }}>{b.componentName}</td>
                          <td style={{ padding: 6 }}>{b.materialName}</td>
                          <td style={{ padding: 6, textAlign: 'center' }}>{b.unit}</td>
                          <td style={{ padding: 6, textAlign: 'right' }}>{b.estimatedQuantity}</td>
                          <td style={{ padding: 6, textAlign: 'right', fontWeight: 700, color: '#34D399' }}>{formatVND(b.totalAmount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* SECTION IV: Financial Costs */}
              <div className="report-section mb-6">
                <h3 className="section-header" style={{ fontSize: 14, fontWeight: 700, color: '#38BDF8', borderBottom: '1px solid #334155', paddingBottom: 6, marginBottom: 10 }}>
                  IV. BẢNG KÊ CHI PHÍ PHÁT SINH THỰC TẾ ({data.costs.length} khoản)
                </h3>
                {data.costs.length === 0 ? (
                  <div style={{ fontSize: 12, color: '#94A3B8' }}>Chưa có chi phí phát sinh nào.</div>
                ) : (
                  <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#1E293B', color: '#94A3B8', textAlign: 'left' }}>
                        <th style={{ padding: 6, borderBottom: '1px solid #334155' }}>Ngày Chi</th>
                        <th style={{ padding: 6, borderBottom: '1px solid #334155' }}>Nội Dung Chi Phi</th>
                        <th style={{ padding: 6, borderBottom: '1px solid #334155' }}>Phân Loại</th>
                        <th style={{ padding: 6, borderBottom: '1px solid #334155', textAlign: 'right' }}>Số Tiền</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.costs.map((c: any) => (
                        <tr key={c.id} style={{ borderBottom: '1px solid #1E293B' }}>
                          <td style={{ padding: 6 }}>{c.costDate}</td>
                          <td style={{ padding: 6, fontWeight: 600 }}>{c.title}</td>
                          <td style={{ padding: 6 }}>{c.category}</td>
                          <td style={{ padding: 6, textAlign: 'right', fontWeight: 700, color: '#F87171' }}>{formatVND(c.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* SECTION V: Signatures Block */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gap: 20,
                  marginTop: 40,
                  paddingTop: 20,
                  borderTop: '1px solid #334155',
                  textAlign: 'center',
                  fontSize: 12,
                }}
              >
                <div>
                  <div style={{ fontWeight: 700 }}>ĐẠI DIỆN CHỦ ĐẦU TƯ</div>
                  <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>(Ký và ghi rõ họ tên)</div>
                  <div style={{ height: 60 }}></div>
                </div>

                <div>
                  <div style={{ fontWeight: 700 }}>QUẢN LÝ DỰ ÁN / XƯỞNG</div>
                  <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>(Ký và ghi rõ họ tên)</div>
                  <div style={{ height: 60 }}></div>
                </div>

                <div>
                  <div style={{ fontWeight: 700 }}>BAN GIÁM ĐỐC KÝ DUYỆT</div>
                  <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>(Ký và ghi rõ họ tên)</div>
                  <div style={{ height: 60 }}></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
