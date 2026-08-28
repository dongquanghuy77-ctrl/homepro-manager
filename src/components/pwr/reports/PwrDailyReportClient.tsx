'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PwrReportTabs from './PwrReportTabs';
import type { DailyReport } from '@/lib/pwr/reporting';
import { PWR_CATEGORY } from '@/lib/pwr/constants';
import { CheckCircle2, AlertCircle, Clock, Key, ChevronLeft, ChevronRight, FileText, Briefcase } from 'lucide-react';

export default function PwrDailyReportClient({ report }: { report: DailyReport }) {
  const router = useRouter();
  const [date, setDate] = useState(report.date);

  function navigate(d: string) {
    setDate(d);
    router.push(`/pwr/reports/daily?date=${d}`);
  }

  function prevDay() {
    const d = new Date(date + 'T00:00:00+07:00');
    d.setUTCDate(d.getUTCDate() - 1);
    navigate(d.toISOString().split('T')[0]);
  }
  function nextDay() {
    const d = new Date(date + 'T00:00:00+07:00');
    d.setUTCDate(d.getUTCDate() + 1);
    navigate(d.toISOString().split('T')[0]);
  }

  // Phân loại logic cho Dashboard
  const doneTasks = report.done;
  const overdueTasks = report.overdue;
  const overrides = report.workLogs.filter(l => l.content.includes('[FORCE_PROCEED]'));
  const incidents = report.workLogs.filter(l => l.logType === 'ISSUE_LOG' && !l.content.includes('[FORCE_PROCEED]'));
  
  // Tạm dùng waitingTasks nếu ko có incidents trong log
  const waitingTasks = report.waiting;

  return (
    <div style={{ padding: '8px 24px 60px', color: 'var(--color-text)', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif' }}>
      <PwrReportTabs />
      
      {/* ─── Header ─── */}
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 24, boxShadow: '0 10px 30px rgba(0,0,0,0.02)', maxWidth: 1000, margin: '0 auto', animation: 'fadeIn 0.4s ease-in-out' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid var(--color-border)' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <FileText size={24} color="#3b82f6" />
              <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: -0.5 }}>Báo Cáo Vận Hành Ngày</h1>
            </div>
            <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: 14 }}>
              Tổng hợp ngày: <strong style={{ color: 'var(--color-text)' }}>{date}</strong>
            </p>
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {/* Quick Stats Badges */}
            <div style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)', padding: '6px 12px', borderRadius: 8, fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
              <CheckCircle2 size={14} /> {doneTasks.length} Hoàn Thành
            </div>
            {(incidents.length > 0 || waitingTasks.length > 0) && (
              <div style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', padding: '6px 12px', borderRadius: 8, fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertCircle size={14} /> {incidents.length + waitingTasks.length} Sự Cố
              </div>
            )}
            
            {/* Date Nav */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 8, borderLeft: '1px solid var(--color-border)', paddingLeft: 16 }}>
              <button onClick={prevDay} style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 6, padding: 6, cursor: 'pointer', color: 'var(--color-text)' }}><ChevronLeft size={16} /></button>
              <input type="date" value={date} onChange={e => navigate(e.target.value)} style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)', borderRadius: 6, padding: '4px 8px', fontSize: 13, fontWeight: 600, outline: 'none' }} />
              <button onClick={nextDay} style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 6, padding: 6, cursor: 'pointer', color: 'var(--color-text)' }}><ChevronRight size={16} /></button>
            </div>
          </div>
        </div>

        {/* ─── Grid 2 cột ─── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          
          {/* CỘT TRÁI */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            
            {/* XÔ 1: THÀNH QUẢ */}
            <div>
              <h2 style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, color: '#10b981', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <CheckCircle2 size={16} /> Thành Quả Nổi Bật ({doneTasks.length})
              </h2>
              <div style={{ background: 'rgba(16,185,129,0.03)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 12, overflow: 'hidden' }}>
                {doneTasks.length === 0 ? (
                  <div style={{ padding: 16, textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 13, fontStyle: 'italic' }}>Không có công việc hoàn thành.</div>
                ) : (
                  doneTasks.map(t => (
                    <div key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderBottom: '1px solid rgba(16,185,129,0.08)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, overflow: 'hidden' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#10b981', opacity: 0.8, width: 32 }}>#{t.id}</span>
                        <Link href={`/pwr/tasks/${t.id}`} style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-text)', textDecoration: 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.title}</Link>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {t.assignedTo && <span style={{ fontSize: 11, fontWeight: 600, background: 'var(--color-bg)', color: 'var(--color-text-muted)', padding: '2px 8px', borderRadius: 99, border: '1px solid var(--color-border)' }}>{t.assignedTo}</span>}
                        {t.completedAt && <span style={{ fontSize: 11, fontWeight: 700, color: '#10b981' }}>{new Date(t.completedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* XÔ 4: OVERRIDES (MASTER KEY) */}
            {(overrides.length > 0) && (
              <div>
                <h2 style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, color: '#8b5cf6', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <Key size={16} /> Ngoại lệ & Vượt rào ({overrides.length})
                </h2>
                <div style={{ background: 'rgba(139,92,246,0.03)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 12, overflow: 'hidden' }}>
                  {overrides.map(l => (
                    <div key={l.id} style={{ padding: 12, borderBottom: '1px solid rgba(139,92,246,0.1)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#8b5cf6', opacity: 0.8 }}>Task #{l.taskId}</span>
                          <span style={{ fontSize: 10, fontWeight: 800, background: '#8b5cf6', color: '#fff', padding: '2px 6px', borderRadius: 4, textTransform: 'uppercase' }}>Master Key</span>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#8b5cf6' }}>{new Date(l.createdAt!).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div style={{ background: 'var(--color-bg)', padding: '8px 10px', borderRadius: 6, fontSize: 12, border: '1px solid var(--color-border)' }}>
                        <div style={{ fontWeight: 700, color: '#8b5cf6', marginBottom: 2 }}>{l.content.split('. Lý do: ')[0]}</div>
                        <div style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>Lý do: {l.content.split('. Lý do: ')[1] || 'Không có'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* CỘT PHẢI */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            
            {/* XÔ 2: SỰ CỐ & ĐIỂM NGHẼN */}
            <div>
              <h2 style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, color: '#ef4444', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <AlertCircle size={16} /> Sự cố & Điểm nghẽn ({incidents.length + waitingTasks.length})
              </h2>
              <div style={{ background: 'rgba(239,68,68,0.03)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 12, overflow: 'hidden' }}>
                {incidents.length === 0 && waitingTasks.length === 0 ? (
                  <div style={{ padding: 16, textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 13, fontStyle: 'italic' }}>Mọi thứ trơn tru.</div>
                ) : (
                  <>
                    {/* Log Sự cố */}
                    {incidents.map(l => (
                      <div key={`inc-${l.id}`} style={{ padding: 12, borderBottom: '1px solid rgba(239,68,68,0.1)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#ef4444' }}>Task #{l.taskId}</span>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#ef4444' }}>{new Date(l.createdAt!).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--color-text)', display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                          <div style={{ fontSize: 11, background: 'var(--color-bg)', border: '1px solid var(--color-border)', padding: '2px 6px', borderRadius: 4, color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>Báo lỗi:</div>
                          <div style={{ fontStyle: 'italic', fontWeight: 500 }}>"{l.content}"</div>
                        </div>
                      </div>
                    ))}
                    {/* Task đang Waiting */}
                    {waitingTasks.map(t => (
                      <div key={`wait-${t.id}`} style={{ padding: 12, borderBottom: '1px solid rgba(239,68,68,0.1)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                          <Link href={`/pwr/tasks/${t.id}`} style={{ fontSize: 13, fontWeight: 600, color: '#ef4444', textDecoration: 'none' }}>#{t.id} {t.title}</Link>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--color-text)', display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                          <div style={{ fontSize: 11, background: 'var(--color-bg)', border: '1px solid var(--color-border)', padding: '2px 6px', borderRadius: 4, color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>Chờ:</div>
                          <div style={{ fontStyle: 'italic', fontWeight: 500 }}>{t.waitingFor || 'Không rõ lý do'}</div>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>

            {/* XÔ 3: TỒN ĐỌNG TRỄ HẠN */}
            <div>
              <h2 style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, color: '#f97316', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Clock size={16} /> Tồn đọng & Trễ hạn ({overdueTasks.length})
              </h2>
              <div style={{ background: 'rgba(249,115,22,0.03)', border: '1px solid rgba(249,115,22,0.15)', borderRadius: 12, overflow: 'hidden' }}>
                {overdueTasks.length === 0 ? (
                  <div style={{ padding: 16, textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 13, fontStyle: 'italic' }}>Không có task trễ hạn.</div>
                ) : (
                  overdueTasks.map(t => (
                    <div key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderBottom: '1px solid rgba(249,115,22,0.1)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, overflow: 'hidden' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#f97316', opacity: 0.8, width: 32 }}>#{t.id}</span>
                        <Link href={`/pwr/tasks/${t.id}`} style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-text)', textDecoration: 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.title}</Link>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 10, fontWeight: 800, background: '#f97316', color: '#fff', padding: '2px 6px', borderRadius: 4, textTransform: 'uppercase' }}>Trễ hạn</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
