'use client';
// src/components/hr/ExecutiveDashboard.tsx
// ══════════════════════════════════════════════════════════════════════════════
// Executive KPI Dashboard — Ban Giám đốc
//
// Tính năng:
//   • 5 KPI Metric Cards với delta % so với tháng trước
//   • Line Chart (recharts): tỷ lệ chuyên cần + giờ công trung bình theo tuần
//   • Xuất PDF: html2canvas + jsPDF với scale = devicePixelRatio × 2 (chống mờ)
//
// GIẢI PHÁP PIXEL SCALE:
//   Vấn đề: Canvas mặc định 96dpi → màn hình Retina 2x/4K → bị mờ khi zoom
//   Giải pháp: scale: window.devicePixelRatio * 2
//     → Canvas nội bộ = 2× kích thước CSS
//     → jsPDF nhận ảnh 2x → shrink xuống đúng kích thước A4
//     → Kết quả: sharp trên mọi màn hình
// ══════════════════════════════════════════════════════════════════════════════

import { useState, useRef, useCallback } from 'react';
import useSWR                 from 'swr';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import {
  Download, RefreshCw, Loader2, TrendingUp, TrendingDown,
  Minus, AlertTriangle, Users, Clock, CheckCircle, AlertCircle,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface KpiValue {
  value:    number;
  delta:    number;
  unit:     string;
  label:    string;
  baseline: number;
}

interface KpiData {
  month:      string;
  generatedAt: string;
  kpi: {
    attendanceRate:  KpiValue;
    turnoverRate:    KpiValue;
    totalHours:      KpiValue;
    dataErrors:      KpiValue;
    unconfirmedOT:   KpiValue;
  };
  summary: {
    totalRecords:     number;
    presentRecords:   number;
    absentRecords:    number;
    lateRecords:      number;
    pendingCheckout:  number;
    activeEmployees:  number;
    onLeaveEmployees: number;
  };
  weeklyChart: Array<{
    week:       string;
    attendance: number;
    lateRate:   number;
    avgHours:   number;
  }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// SWR Fetcher
// ─────────────────────────────────────────────────────────────────────────────
const fetcher = (url: string) => fetch(url).then(r => {
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json() as Promise<KpiData>;
});

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
export default function ExecutiveDashboard() {
  const today     = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' });
  const [month, setMonth] = useState(today.slice(0, 7));
  const [exporting, setExporting] = useState(false);

  // Ref tới vùng cần in (ẩn nav/buttons khi capture)
  const printRef = useRef<HTMLDivElement>(null);

  // ── SWR: cache 5 phút, revalidate khi focus ────────────────────────────────
  const swrKey = `/api/hr/reports/kpi?month=${month}`;
  const { data, isLoading, error, mutate } = useSWR<KpiData>(swrKey, fetcher, {
    revalidateOnFocus:   false,
    dedupingInterval:    300_000,  // 5 phút
    refreshInterval:     0,        // Không auto-refresh (BGĐ xem report tĩnh)
  });

  // ─────────────────────────────────────────────────────────────────────────
  // XUẤT PDF: html2canvas + jsPDF
  //
  // GIẢI QUYẾT VẤN ĐỀ PIXEL DENSITY (Self-review):
  //   - Màn hình Retina: devicePixelRatio = 2 hoặc 3
  //   - html2canvas mặc định scale=1 → canvas nhỏ → jsPDF phóng to → MỜ
  //
  //   Giải pháp:
  //   1. Đặt scale = devicePixelRatio * 2 trong html2canvas
  //      → Canvas có độ phân giải = 2× hoặc 3× so với CSS pixel
  //   2. Khi vẽ vào jsPDF: dùng kích thước CSS (không phải canvas pixel)
  //      → imgWidth  = a4Width  (mm)
  //      → imgHeight = (canvas.height / canvas.width) * a4Width (giữ tỷ lệ)
  //   3. Dùng imageType 'JPEG' với quality=0.95 (nhỏ hơn PNG, đủ nét)
  //
  //   Kết quả: File PDF sắc nét trên màn hình 4K, không vỡ pixel ✅
  // ─────────────────────────────────────────────────────────────────────────
  const exportPDF = useCallback(async () => {
    if (!printRef.current) return;
    setExporting(true);

    try {
      // Import dynamic để tránh SSR bundle issue (html2canvas dùng window)
      const [html2canvasModule, jsPDFModule] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);
      const html2canvas = html2canvasModule.default;
      const { jsPDF }   = jsPDFModule;

      // ── Bước 1: Chụp DOM thành Canvas với scale cao ──────────────────────
      const deviceScale = window.devicePixelRatio || 1;
      const captureScale = deviceScale * 2;  // 2x trên màn thường, 4x trên Retina

      const canvas = await html2canvas(printRef.current, {
        scale:            captureScale,
        useCORS:          true,
        allowTaint:       true,
        backgroundColor:  '#ffffff',
        logging:          false,
        // Ẩn các element không cần in (nút bấm, nav)
        ignoreElements: (el) => {
          return el.hasAttribute('data-no-print');
        },
      });

      // ── Bước 2: Tạo jsPDF với kích thước A4 ─────────────────────────────
      const pdf     = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const a4W     = 210;   // mm
      const a4H     = 297;   // mm
      const margin  = 10;    // mm (lề 4 phía)
      const usableW = a4W - margin * 2;

      // Tính chiều cao tương ứng để giữ tỷ lệ canvas
      const canvasAspect = canvas.height / canvas.width;
      const imgH         = usableW * canvasAspect;

      const imgData = canvas.toDataURL('image/jpeg', 0.95);  // 95% JPEG quality

      // ── Bước 3: Phân trang nếu nội dung cao hơn 1 trang A4 ───────────────
      const usableH    = a4H - margin * 2;
      const totalPages = Math.ceil(imgH / usableH);

      for (let page = 0; page < totalPages; page++) {
        if (page > 0) pdf.addPage();

        // Dịch ảnh lên trên theo từng trang (clip từ canvas)
        const yOffset = -(page * usableH);

        pdf.addImage(
          imgData, 'JPEG',
          margin,           // x
          margin + yOffset, // y (âm = dịch lên = xem phần tiếp theo)
          usableW,          // width (mm)
          imgH,             // height (mm) — full image height, pdf clip naturally
          '',               // alias
          'FAST'            // compression
        );
      }

      // ── Bước 4: Header metadata ───────────────────────────────────────────
      pdf.setProperties({
        title:    `HomePro Manager — Báo cáo KPI ${month}`,
        subject:  'Báo cáo chấm công tổng hợp',
        author:   'HomePro Manager System',
        creator:  'ExecutiveDashboard',
      });

      // ── Bước 5: Download ─────────────────────────────────────────────────
      pdf.save(`KPI_Report_${month.replace('-', '_')}_${Date.now()}.pdf`);

    } catch (err) {
      console.error('[PDF Export]', err);
      alert('Xuất PDF thất bại. Vui lòng thử lại.');
    } finally {
      setExporting(false);
    }
  }, [month]);

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── Toolbar (data-no-print → ẩn trong PDF) ── */}
      <div
        data-no-print="true"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}
      >
        <div>
          <h2 style={{ fontWeight: 900, fontSize: 22, marginBottom: 2 }}>📊 Báo cáo KPI Cấp Cao</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>Dữ liệu tổng hợp cho Ban Giám đốc</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="month"
            value={month}
            onChange={e => setMonth(e.target.value)}
            className="form-input"
            style={{ fontSize: 13 }}
          />
          <button className="btn btn-ghost btn-sm" onClick={() => mutate()}>
            <RefreshCw size={14} />
          </button>
          <button
            className="btn btn-primary"
            onClick={exportPDF}
            disabled={exporting || !data}
            style={{ minWidth: 130 }}
          >
            {exporting
              ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Đang xuất...</>
              : <><Download size={14} /> Xuất PDF</>
            }
          </button>
        </div>
      </div>

      {/* ── Loading ── */}
      {isLoading && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--color-text-muted)' }}>
          <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', marginBottom: 12 }} />
          <p style={{ fontSize: 13 }}>Đang tổng hợp KPI từ database...</p>
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div style={{
          background: '#EF444415', border: '1px solid #EF444430',
          borderRadius: 12, padding: 20, display: 'flex', gap: 12,
        }}>
          <AlertTriangle size={22} style={{ color: '#EF4444', flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 700, color: '#EF4444', marginBottom: 4 }}>Không thể tải dữ liệu KPI</div>
            <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{error.message}</div>
          </div>
        </div>
      )}

      {/* ══════════════════ PRINTABLE AREA ══════════════════ */}
      {data && (
        <div ref={printRef} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Report Header (chỉ hiển thị trong PDF) */}
          <div className="print-only" style={{
            display: 'none',   // Ẩn on-screen, @media print sẽ hiện
            marginBottom: 8, borderBottom: '2px solid #1E293B', paddingBottom: 12,
          }}>
            <h1 style={{ fontWeight: 900, fontSize: 20 }}>HomePro Manager — Báo cáo KPI</h1>
            <p style={{ fontSize: 12, color: '#6B7280' }}>
              Tháng: {data.month} &nbsp;|&nbsp;
              Xuất lúc: {new Date(data.generatedAt).toLocaleString('vi-VN')}
            </p>
          </div>

          {/* ── KPI Metric Cards ── */}
          <section>
            <SectionTitle icon="🎯" title="Chỉ số KPI Tháng" subtitle={`So sánh với tháng ${getPrevMonthLabel(month)}`} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))', gap: 12 }}>
              <KpiCard kpi={data.kpi.attendanceRate} icon={<CheckCircle size={20} />} color="#10B981" />
              <KpiCard kpi={data.kpi.turnoverRate}   icon={<Users size={20} />}        color="#8B5CF6" invertDelta />
              <KpiCard kpi={data.kpi.totalHours}     icon={<Clock size={20} />}         color="#2563EB" />
              <KpiCard kpi={data.kpi.dataErrors}     icon={<AlertCircle size={20} />}   color="#EF4444" invertDelta />
              <KpiCard kpi={data.kpi.unconfirmedOT}  icon={<AlertTriangle size={20} />} color="#F59E0B" invertDelta />
            </div>
          </section>

          {/* ── Summary row ── */}
          <section>
            <SectionTitle icon="📋" title="Tóm tắt tháng" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 8 }}>
              {[
                { label: 'Tổng bản ghi',    value: data.summary.totalRecords,     color: '#6B7280' },
                { label: 'Có mặt',           value: data.summary.presentRecords,   color: '#10B981' },
                { label: 'Vắng mặt',         value: data.summary.absentRecords,    color: '#EF4444' },
                { label: 'Đi muộn',          value: data.summary.lateRecords,      color: '#F59E0B' },
                { label: 'Chưa clock-out',   value: data.summary.pendingCheckout,  color: '#F59E0B' },
                { label: 'NV đang làm',      value: data.summary.activeEmployees,  color: '#2563EB' },
                { label: 'Đang nghỉ phép',   value: data.summary.onLeaveEmployees, color: '#8B5CF6' },
              ].map(item => (
                <div key={item.label} style={{
                  background: `${item.color}10`, border: `1px solid ${item.color}25`,
                  borderRadius: 10, padding: '10px 14px', textAlign: 'center',
                }}>
                  <div style={{ fontWeight: 800, fontSize: 22, color: item.color }}>{item.value.toLocaleString('vi-VN')}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>{item.label}</div>
                </div>
              ))}
            </div>
          </section>

          {/* ── Line Chart ── */}
          <section style={{ pageBreakInside: 'avoid' }}>
            <SectionTitle
              icon="📈"
              title="Tỷ lệ chuyên cần theo tuần"
              subtitle="8 tuần gần nhất · Đường xanh = Chuyên cần (%) · Đường vàng = Đi muộn (%)"
            />
            <div style={{
              background: 'var(--color-surface)',
              border:     '1px solid var(--color-border)',
              borderRadius: 14, padding: '20px 12px 12px',
            }}>
              {data.weeklyChart.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={data.weeklyChart} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,100,100,0.15)" />
                    <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="pct" domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                    <YAxis yAxisId="h"   orientation="right" domain={[0, 10]} tick={{ fontSize: 11 }} unit="h" />
                    <Tooltip
                      contentStyle={{
                        background:   'var(--color-surface)',
                        border:       '1px solid var(--color-border)',
                        borderRadius: 8, fontSize: 12,
                      }}
                      formatter={(value: unknown, name: unknown) => {
                        const v = typeof value === 'number' ? value : 0;
                        const n = String(name);
                        const labels: Record<string, string> = {
                          attendance: 'Chuyên cần',
                          lateRate:   'Đi muộn',
                          avgHours:   'Giờ TB/ngày',
                        };
                        return [`${v}${n === 'avgHours' ? 'h' : '%'}`, labels[n] ?? n] as [string, string];
                      }}
                    />
                    <Legend
                      formatter={(value) => {
                        const map: Record<string, string> = {
                          attendance: '✅ Chuyên cần (%)',
                          lateRate:   '⚠️ Đi muộn (%)',
                          avgHours:   '🕐 Giờ TB/ngày',
                        };
                        return map[String(value)] ?? value;
                      }}
                    />
                    <ReferenceLine yAxisId="pct" y={90} stroke="#10B98140" strokeDasharray="6 3" label={{ value: 'Mục tiêu 90%', fontSize: 10 }} />
                    <Line yAxisId="pct" type="monotone" dataKey="attendance" stroke="#10B981" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    <Line yAxisId="pct" type="monotone" dataKey="lateRate"   stroke="#F59E0B" strokeWidth={2}   dot={{ r: 3 }} strokeDasharray="5 3" />
                    <Line yAxisId="h"   type="monotone" dataKey="avgHours"   stroke="#2563EB" strokeWidth={2}   dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-text-muted)', fontSize: 13 }}>
                  Chưa có đủ dữ liệu chấm công để vẽ biểu đồ theo tuần.
                </div>
              )}
            </div>
          </section>

          {/* ── Footer report (chỉ trong PDF) ── */}
          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 12, fontSize: 11, color: 'var(--color-text-muted)', display: 'flex', justifyContent: 'space-between' }}>
            <span>HomePro Manager — Báo cáo tự động</span>
            <span>Xuất lúc: {new Date(data.generatedAt).toLocaleString('vi-VN')}</span>
          </div>

        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Print styles — ẩn toolbar và nút bấm khi in */
        @media print {
          [data-no-print] { display: none !important; }
          .print-only     { display: block !important; }
          body            { background: #fff !important; }
        }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// KpiCard — Hiển thị 1 chỉ số với delta mũi tên
// ─────────────────────────────────────────────────────────────────────────────
function KpiCard({ kpi, icon, color, invertDelta = false }: {
  kpi:         KpiValue;
  icon:        React.ReactNode;
  color:       string;
  invertDelta?: boolean;
}) {
  const delta = kpi.delta;
  // invertDelta: với chỉ số "càng thấp càng tốt" (turnover, errors)
  // → delta dương = xấu đi → hiển thị đỏ/xuống
  const isGood    = invertDelta ? delta <= 0 : delta >= 0;
  const isNeutral = delta === 0;

  const deltaColor = isNeutral ? '#6B7280' : isGood ? '#10B981' : '#EF4444';
  const DeltaIcon  = isNeutral ? Minus : isGood ? TrendingUp : TrendingDown;

  return (
    <div style={{
      background:   'var(--color-surface)',
      border:       `1px solid ${color}30`,
      borderRadius: 14,
      padding:      '18px 16px',
      pageBreakInside: 'avoid',
      borderTop:    `3px solid ${color}`,
    }}>
      {/* Icon + Label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <div style={{
          width: 34, height: 34, borderRadius: '50%',
          background: `${color}15`, color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          {icon}
        </div>
        <span style={{ fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 600 }}>
          {kpi.label}
        </span>
      </div>

      {/* Value */}
      <div style={{ fontSize: 30, fontWeight: 900, color, lineHeight: 1, marginBottom: 8 }}>
        {kpi.value.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-muted)', marginLeft: 4 }}>
          {kpi.unit}
        </span>
      </div>

      {/* Delta */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: deltaColor }}>
        <DeltaIcon size={14} />
        <span style={{ fontWeight: 700 }}>
          {delta > 0 ? '+' : ''}{delta.toFixed(1)}{kpi.unit}
        </span>
        <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>
          vs. tháng trước ({kpi.baseline.toFixed(1)}{kpi.unit})
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SectionTitle
// ─────────────────────────────────────────────────────────────────────────────
function SectionTitle({ icon, title, subtitle }: { icon: string; title: string; subtitle?: string }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <h3 style={{ fontWeight: 800, fontSize: 15, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span>{icon}</span> {title}
      </h3>
      {subtitle && <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 3 }}>{subtitle}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function getPrevMonthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number);
  const prevM  = m === 1 ? 12 : m - 1;
  const prevY  = m === 1 ? y - 1 : y;
  return `${String(prevM).padStart(2, '0')}/${prevY}`;
}
