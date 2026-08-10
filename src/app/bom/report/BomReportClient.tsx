'use client';
// src/app/bom/report/BomReportClient.tsx — Dashboard ngân sách BOM

import { useState, useEffect } from 'react';
import Link from 'next/link';

type ProjectReport = {
  projectId: number;
  projectCode: string;
  projectName: string;
  status: string;
  contractValue: number;
  targetMaterialCost: number;
  totalBom: number;
  hpProductionTotal: number;
  cdtSupplyTotal: number;
  lineCount: number;
  budgetUsedPct: number | null;
  overBudget: boolean;
  remaining: number | null;
};

function fmt(n: number) { return n.toLocaleString('vi-VN'); }
function fmtB(n: number) {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}  tỷ`;
  if (n >= 1_000_000)     return `${(n / 1_000_000).toFixed(1)} tr`;
  return fmt(n);
}

// Progress bar màu theo %
function BudgetBar({ pct, over }: { pct: number; over: boolean }) {
  const clamped = Math.min(pct, 100);
  const color   = over ? '#ef4444' : pct >= 80 ? '#f59e0b' : '#10b981';
  return (
    <div style={{ position: 'relative', height: 8, background: 'rgba(0,0,0,0.08)', borderRadius: 4, overflow: 'hidden' }}>
      <div style={{ width: `${clamped}%`, height: '100%', background: color,
        borderRadius: 4, transition: 'width 0.5s ease', position: 'relative' }}>
        {over && (
          <div style={{ position: 'absolute', right: 0, top: 0, height: '100%', width: `${Math.min(pct - 100, 50)}%`,
            background: 'rgba(239,68,68,0.4)', borderRadius: '0 4px 4px 0' }} />
        )}
      </div>
    </div>
  );
}

export default function BomReportClient({ initialReport }: { initialReport: ProjectReport[] }) {
  const [report,  setReport]  = useState<ProjectReport[]>(initialReport);
  const [loading, setLoading] = useState(initialReport.length === 0);

  useEffect(() => {
    if (initialReport.length === 0) {
      fetch('/api/bom/report')
        .then(r => r.json())
        .then(d => { setReport(d.report ?? []); setLoading(false); })
        .catch(() => setLoading(false));
    }
  }, []);

  const grandBom    = report.reduce((s, r) => s + r.totalBom, 0);
  const grandTarget = report.reduce((s, r) => s + r.targetMaterialCost, 0);
  const overCount   = report.filter(r => r.overBudget).length;
  const noTargetCount = report.filter(r => r.targetMaterialCost === 0).length;

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
      <div style={{ color: 'var(--color-muted)' }}>Đang tải báo cáo...</div>
    </div>
  );

  return (
    <div style={{ padding: '1.5rem', maxWidth: 1100, margin: '0 auto' }}>
      {/* ─ Header ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>📊 Báo cáo Ngân sách BOM</h1>
          <p style={{ fontSize: 13, color: 'var(--color-muted)', marginTop: 4 }}>
            So sánh tổng BOM thực tế vs ngân sách vật tư mục tiêu từng dự án
          </p>
        </div>
        <Link href="/bom" style={{ textDecoration: 'none' }}>
          <button className="btn btn-ghost">← Quay lại BOM</button>
        </Link>
      </div>

      {/* ─ KPI Cards ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: 'Tổng BOM', value: fmtB(grandBom) + ' VNĐ', icon: '💰', color: '#3b82f6' },
          { label: 'Ngân sách mục tiêu', value: grandTarget > 0 ? fmtB(grandTarget) + ' VNĐ' : 'Chưa đặt', icon: '🎯', color: '#8b5cf6' },
          { label: 'Vượt ngân sách', value: overCount === 0 ? '✅ Không có' : `⚠️ ${overCount} dự án`, icon: '🚨', color: overCount > 0 ? '#ef4444' : '#10b981' },
          { label: 'Chưa đặt ngân sách', value: `${noTargetCount} dự án`, icon: '📝', color: '#f59e0b' },
        ].map(k => (
          <div key={k.label} style={{
            background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            borderRadius: 12, padding: '1rem 1.25rem',
          }}>
            <div style={{ fontSize: 22, marginBottom: 6 }}>{k.icon}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: k.color }}>{k.value}</div>
            <div style={{ fontSize: 12, color: 'var(--color-muted)', marginTop: 2 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* ─ Bảng chi tiết theo dự án ──────────────────────────────────────── */}
      {report.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--color-muted)' }}>
          Chưa có dữ liệu BOM nào.
          <br /><br />
          <Link href="/bom"><button className="btn btn-primary">→ Vào trang BOM để Import</button></Link>
        </div>
      ) : (
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'rgba(0,0,0,0.03)', borderBottom: '1px solid var(--color-border)' }}>
                {['Dự án', 'Trạng thái', 'Tổng BOM', 'Ngân sách MT', 'Đã dùng %', 'Còn lại', 'HomePro SX', 'CĐT cấp', 'Số dòng', ''].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--color-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {report.map(r => (
                <tr key={r.projectId} style={{
                  borderTop: '1px solid var(--color-border)',
                  background: r.overBudget ? 'rgba(239,68,68,0.04)' : 'transparent',
                }}>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ fontWeight: 600 }}>{r.projectCode}</div>
                    <div style={{ fontSize: 11, color: 'var(--color-muted)' }}>{r.projectName}</div>
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{
                      fontSize: 11, padding: '3px 8px', borderRadius: 20, fontWeight: 600,
                      background: r.status === 'ACTIVE' ? 'rgba(16,185,129,0.12)' : 'rgba(156,163,175,0.15)',
                      color: r.status === 'ACTIVE' ? '#10b981' : '#9ca3af',
                    }}>{r.status}</span>
                  </td>
                  <td style={{ padding: '10px 12px', fontWeight: 700, color: '#3b82f6' }}>
                    {fmt(r.totalBom)}
                  </td>
                  <td style={{ padding: '10px 12px', color: r.targetMaterialCost === 0 ? 'var(--color-muted)' : 'inherit' }}>
                    {r.targetMaterialCost === 0 ? '—' : fmt(r.targetMaterialCost)}
                  </td>
                  <td style={{ padding: '10px 12px', minWidth: 140 }}>
                    {r.budgetUsedPct !== null ? (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
                          <span style={{ fontWeight: 600, color: r.overBudget ? '#ef4444' : r.budgetUsedPct >= 80 ? '#f59e0b' : '#10b981' }}>
                            {r.budgetUsedPct}%
                          </span>
                          {r.overBudget && <span style={{ color: '#ef4444', fontSize: 11 }}>⚠️ Vượt ngân sách</span>}
                        </div>
                        <BudgetBar pct={r.budgetUsedPct} over={r.overBudget} />
                      </>
                    ) : (
                      <span style={{ color: 'var(--color-muted)', fontSize: 12 }}>Chưa đặt MT</span>
                    )}
                  </td>
                  <td style={{ padding: '10px 12px', fontWeight: 600,
                    color: r.remaining === null ? 'var(--color-muted)' : r.remaining < 0 ? '#ef4444' : '#10b981' }}>
                    {r.remaining === null ? '—' : (r.remaining < 0 ? '▲ ' : '') + fmt(Math.abs(r.remaining))}
                  </td>
                  <td style={{ padding: '10px 12px', color: '#3b82f6' }}>{fmt(r.hpProductionTotal)}</td>
                  <td style={{ padding: '10px 12px', color: '#9ca3af' }}>{fmt(r.cdtSupplyTotal)}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                    <span style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6',
                      borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 600 }}>
                      {r.lineCount}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <Link href={`/bom?project=${r.projectId}`}>
                      <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 12 }}>Chi tiết →</button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ─ Ghi chú ─────────────────────────────────────────────────────────── */}
      <div style={{ marginTop: '1.5rem', fontSize: 12, color: 'var(--color-muted)', display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
        <span>🟢 &lt; 80% — An toàn</span>
        <span>🟡 80–100% — Sắp đạt ngưỡng</span>
        <span>🔴 &gt; 100% — Vượt ngân sách (Trigger DB sẽ chặn)</span>
        <span>📊 <strong>HomePro SX</strong>: vật tư HomePro sản xuất | <strong>CĐT cấp</strong>: chủ đầu tư cung cấp</span>
      </div>
    </div>
  );
}
