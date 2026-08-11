'use client';

// src/components/worker/EmployeeDashboardClient.tsx
// Trang chu All-in-one danh cho Cong nhan (Mobile-first)
// Chuc nang: Cham cong GPS, Xem quy phep, Xem lich su, Gui yeu cau nghi phep/tang ca, Bao cao cong viec hang ngay

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  MapPin, Calendar, Clock, LogOut, FileText, Send, User, 
  ChevronRight, CheckCircle2, AlertTriangle, Check, Briefcase, PlusCircle, History
} from 'lucide-react';
import DailyInputClient from './DailyInputClient';

interface Project {
  id: number;
  name: string;
  code: string;
  manager: string | null;
}

interface LeaveBalance {
  remaining: number;
  leaveTypeName: string;
  leaveTypeCode: string;
}

interface AttendanceLog {
  id: number;
  workDate: string;
  checkIn: Date | string | null;
  checkOut: Date | string | null;
  status: string | null;
  totalHours: number | null;
}

interface EmployeeDashboardClientProps {
  session: { id: number; name: string; username: string; role: string; department?: string | null };
  todayRecord: { id: number; checkIn: string | Date | null; checkOut: string | Date | null; status: string | null; totalHours: number | null } | null;
  leaveBalances: LeaveBalance[];
  attendanceHistory: AttendanceLog[];
  projects: Project[];
}

export default function EmployeeDashboardClient({
  session,
  todayRecord: initialTodayRecord,
  leaveBalances,
  attendanceHistory,
  projects,
}: EmployeeDashboardClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'HOME' | 'REPORT' | 'REQUESTS'>('HOME');
  
  // GPS Attendance state
  const [todayRecord, setTodayRecord] = useState(initialTodayRecord);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState('');
  const [gpsSuccess, setGpsSuccess] = useState('');
  const [coordsStr, setCoordsStr] = useState('');

  // Modals for requests
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showOtModal, setShowOtModal] = useState(false);

  // Leave Form State
  const [leaveType, setLeaveType] = useState('Nghỉ phép năm');
  const [leaveStart, setLeaveStart] = useState('');
  const [leaveEnd, setLeaveEnd] = useState('');
  const [leaveReason, setLeaveReason] = useState('');
  const [leaveLoading, setLeaveLoading] = useState(false);

  // OT Form State
  const [otDate, setOtDate] = useState('');
  const [otStart, setOtStart] = useState('');
  const [otEnd, setOtEnd] = useState('');
  const [otReason, setOtReason] = useState('');
  const [otProjectId, setOtProjectId] = useState('');
  const [otLoading, setOtLoading] = useState(false);

  // Logout trigger
  async function handleLogout() {
    if (!confirm('Bạn có chắc chắn muốn đăng xuất?')) return;
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (err) {
      console.error('Logout error:', err);
    }
  }

  // GPS Attendance Flow
  async function handleGpsAttendance() {
    setGpsLoading(true);
    setGpsError('');
    setGpsSuccess('');
    setCoordsStr('');

    if (!navigator.geolocation) {
      setGpsError('Thiết bị của bạn không hỗ trợ định vị GPS.');
      setGpsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const locationString = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
        setCoordsStr(locationString);

        const isCheckOut = todayRecord?.checkIn && !todayRecord?.checkOut;
        const endpoint = isCheckOut 
          ? '/api/hr/attendance/checkout' 
          : '/api/hr/attendance/checkin';

        try {
          const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ location: locationString }),
          });

          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Chấm công thất bại');

          setTodayRecord(data);
          setGpsSuccess(
            isCheckOut
              ? `Chấm công Ra Ca thành công lúc ${new Date(data.checkOut).toLocaleTimeString('vi-VN')}!`
              : `Chấm công Vào Ca thành công lúc ${new Date(data.checkIn).toLocaleTimeString('vi-VN')}!`
          );
          router.refresh();
        } catch (err: any) {
          setGpsError(err.message || 'Lỗi kết nối máy chủ');
        } finally {
          setGpsLoading(false);
        }
      },
      (error) => {
        console.error('GPS error:', error);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setGpsError('Vui lòng bật định vị GPS và cho phép trình duyệt truy cập vị trí.');
            break;
          case error.POSITION_UNAVAILABLE:
            setGpsError('Không thể xác định vị trí GPS hiện tại.');
            break;
          case error.TIMEOUT:
            setGpsError('Quá thời gian yêu cầu định vị GPS.');
            break;
          default:
            setGpsError('Lỗi định vị vị trí.');
        }
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  // Handle Leave submit
  async function handleLeaveSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!leaveStart || !leaveEnd || !leaveReason) {
      alert('Vui lòng điền đầy đủ thông tin');
      return;
    }
    setLeaveLoading(true);
    try {
      const res = await fetch('/api/hr/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leaveType,
          startDate: leaveStart,
          endDate: leaveEnd,
          reason: leaveReason,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gửi đơn thất bại');
      alert('Đã gửi đơn xin nghỉ phép thành công!');
      setShowLeaveModal(false);
      setLeaveStart('');
      setLeaveEnd('');
      setLeaveReason('');
      router.refresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLeaveLoading(false);
    }
  }

  // Handle OT submit
  async function handleOtSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!otDate || !otStart || !otEnd || !otReason || !otProjectId) {
      alert('Vui lòng điền đầy đủ thông tin');
      return;
    }
    setOtLoading(true);
    try {
      const res = await fetch('/api/hr/overtime', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workDate: otDate,
          startTime: otStart,
          endTime: otEnd,
          reason: otReason,
          projectId: parseInt(otProjectId, 10),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gửi đơn thất bại');
      alert('Đã gửi đơn đăng ký tăng ca thành công!');
      setShowOtModal(false);
      setOtDate('');
      setOtStart('');
      setOtEnd('');
      setOtReason('');
      setOtProjectId('');
      router.refresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setOtLoading(false);
    }
  }

  const formatTime = (isoStr: string | Date | null) => {
    if (!isoStr) return '—';
    return new Date(isoStr).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  };

  const getStatusBadge = (status: string | null) => {
    if (!status) return <span className="badge">Chưa xác định</span>;
    switch (status) {
      case 'PRESENT': return <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10B981' }}>Đúng giờ</span>;
      case 'LATE': return <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B' }}>Đi trễ</span>;
      case 'ABSENT': return <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#EF4444' }}>Vắng mặt</span>;
      default: return <span className="badge">{status}</span>;
    }
  };

  return (
    <div style={{
      maxWidth: 480,
      margin: '0 auto',
      background: '#0F172A',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      color: '#F8FAFC',
      fontFamily: '"Outfit", "Inter", sans-serif',
      boxShadow: '0 0 40px rgba(0, 0, 0, 0.5)',
    }}>
      {/* Top Header */}
      <header style={{
        padding: '16px 20px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: '#1E293B',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 38,
            height: 38,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #3B82F6 0%, #10B981 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: 15,
            color: '#fff',
          }}>
            {session.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#F8FAFC' }}>{session.name}</div>
            <div style={{ fontSize: 11, color: '#94A3B8' }}>
              {session.department ? `${session.department} • ` : ''}Công nhân
            </div>
          </div>
        </div>

        <button
          onClick={handleLogout}
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: 'none',
            borderRadius: 8,
            width: 34,
            height: 34,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#EF4444',
            cursor: 'pointer',
          }}
          title="Đăng xuất"
        >
          <LogOut size={16} />
        </button>
      </header>

      {/* Main Body container */}
      <main style={{ flex: 1, padding: '20px 16px 80px 16px', overflowY: 'auto' }}>
        
        {activeTab === 'HOME' && (
          <div>
            {/* TẦNG 1: HERO SECTION - GPS ATTENDANCE BUTTON */}
            <div className="card mb-6" style={{
              background: 'linear-gradient(180deg, #1E293B 0%, #111827 100%)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              padding: 24,
              borderRadius: 20,
              textAlign: 'center',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
            }}>
              <div style={{ fontSize: 13, color: '#94A3B8', marginBottom: 4 }}>THỜI GIAN HIỆN TẠI</div>
              <div style={{
                fontSize: 22,
                fontWeight: 800,
                color: '#3B82F6',
                fontFamily: 'monospace',
                marginBottom: 16,
              }}>
                {new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'numeric' })}
              </div>

              {/* GPS status display */}
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: 50,
                border: '1px solid rgba(255, 255, 255, 0.05)',
                fontSize: 12,
                color: '#CBD5E1',
                marginBottom: 20,
              }}>
                <MapPin size={12} className="text-primary" />
                <span>Trạng thái: </span>
                <strong style={{
                  color: todayRecord?.checkOut ? '#EF4444' : todayRecord?.checkIn ? '#10B981' : '#F59E0B'
                }}>
                  {todayRecord?.checkOut ? 'Đã ra ca' : todayRecord?.checkIn ? 'Đang làm việc' : 'Chưa vào ca'}
                </strong>
              </div>

              {/* Big Circular GPS Attendance Button */}
              <div style={{ position: 'relative', display: 'inline-block', margin: '0 auto 16px auto' }}>
                <button
                  onClick={handleGpsAttendance}
                  disabled={gpsLoading || !!todayRecord?.checkOut}
                  style={{
                    width: 140,
                    height: 140,
                    borderRadius: '50%',
                    background: todayRecord?.checkOut
                      ? '#475569'
                      : todayRecord?.checkIn
                        ? 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)'
                        : 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                    border: '8px solid rgba(255, 255, 255, 0.05)',
                    boxShadow: todayRecord?.checkOut
                      ? 'none'
                      : todayRecord?.checkIn
                        ? '0 0 20px rgba(245, 158, 11, 0.4)'
                        : '0 0 20px rgba(16, 185, 129, 0.4)',
                    color: '#fff',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: gpsLoading || !!todayRecord?.checkOut ? 'default' : 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <MapPin size={32} style={{ marginBottom: 4 }} />
                  <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: '0.02em' }}>
                    {gpsLoading ? 'ĐANG LẤY VỊ TRÍ' : todayRecord?.checkOut ? 'ĐÃ RA CA' : todayRecord?.checkIn ? 'RA CA GPS' : 'VÀO CA GPS'}
                  </span>
                </button>
              </div>

              {gpsError && (
                <div className="alert alert-danger" style={{ fontSize: 12, marginTop: 12, padding: '8px 12px' }}>
                  ⚠️ {gpsError}
                </div>
              )}

              {gpsSuccess && (
                <div className="alert alert-success" style={{ fontSize: 12, marginTop: 12, padding: '8px 12px' }}>
                  ✅ {gpsSuccess}
                </div>
              )}

              {coordsStr && (
                <div style={{ fontSize: 10, color: '#64748B', marginTop: 8 }}>
                  Tọa độ GPS: <code>{coordsStr}</code>
                </div>
              )}

              {/* Shift info display */}
              {todayRecord?.checkIn && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 12,
                  marginTop: 20,
                  borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                  paddingTop: 16,
                  fontSize: 13
                }}>
                  <div>
                    <div style={{ color: '#64748B', fontSize: 11 }}>GIỜ VÀO CA</div>
                    <div style={{ fontWeight: 700, color: '#F8FAFC', fontSize: 15, marginTop: 2 }}>
                      {formatTime(todayRecord.checkIn)}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: '#64748B', fontSize: 11 }}>GIỜ RA CA</div>
                    <div style={{ fontWeight: 700, color: '#F8FAFC', fontSize: 15, marginTop: 2 }}>
                      {formatTime(todayRecord.checkOut)}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* QUICK ACTIONS BUTTONS */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{
                  padding: '12px 14px',
                  borderRadius: 14,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  fontSize: 13,
                  background: 'rgba(59, 130, 246, 0.1)',
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                  color: '#3B82F6',
                }}
                onClick={() => setShowLeaveModal(true)}
              >
                <PlusCircle size={15} /> Xin Nghỉ Phép
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                style={{
                  padding: '12px 14px',
                  borderRadius: 14,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  fontSize: 13,
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  color: '#10B981',
                }}
                onClick={() => setShowOtModal(true)}
              >
                <PlusCircle size={15} /> Đăng Ký Tăng Ca
              </button>
            </div>

            {/* TẦNG 2: WIDGET SECTION - LEAVE BALANCES */}
            <div className="card mb-6" style={{ padding: 18, borderRadius: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#F8FAFC', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Calendar size={16} className="text-primary" /> Quỹ phép năm {new Date().getFullYear()}
              </h3>
              
              {leaveBalances.length === 0 ? (
                <div style={{ fontSize: 12, color: '#64748B', padding: '10px 0' }}>
                  Không tìm thấy dữ liệu phép năm nay.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                  {leaveBalances.map((bal, idx) => (
                    <div key={idx} style={{
                      padding: 12,
                      background: 'rgba(255, 255, 255, 0.02)',
                      borderRadius: 12,
                      border: '1px solid rgba(255, 255, 255, 0.04)',
                      textAlign: 'center',
                    }}>
                      <div style={{ fontSize: 20, fontWeight: 800, color: bal.remaining > 0 ? '#10B981' : '#EF4444' }}>
                        {bal.remaining} <span style={{ fontSize: 11, fontWeight: 500, color: '#94A3B8' }}>ngày</span>
                      </div>
                      <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {bal.leaveTypeName}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* TẦNG 3: HISTORY SECTION - RECENT ATTENDANCE */}
            <div className="card" style={{ padding: 18, borderRadius: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#F8FAFC', margin: '0 0 14px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                <History size={16} className="text-primary" /> Lịch sử chấm công gần đây
              </h3>

              {attendanceHistory.length === 0 ? (
                <div style={{ fontSize: 12, color: '#64748B', padding: '16px 0', textAlign: 'center' }}>
                  Chưa có dữ liệu chấm công.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {attendanceHistory.map((log) => (
                    <div key={log.id} style={{
                      padding: '12px 14px',
                      background: 'rgba(255, 255, 255, 0.02)',
                      borderRadius: 12,
                      border: '1px solid rgba(255, 255, 255, 0.04)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#F8FAFC' }}>
                          Ngày {formatDate(log.workDate)}
                        </div>
                        <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4, display: 'flex', gap: 8 }}>
                          <span>Vào: <strong style={{ color: '#E2E8F0' }}>{formatTime(log.checkIn)}</strong></span>
                          <span>Ra: <strong style={{ color: '#E2E8F0' }}>{formatTime(log.checkOut)}</strong></span>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        {getStatusBadge(log.status)}
                        {log.totalHours !== null && (
                          <div style={{ fontSize: 10, color: '#64748B', marginTop: 4 }}>
                            {log.totalHours} giờ làm
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        {activeTab === 'REPORT' && (
          <div style={{ background: '#1E293B', borderRadius: 16, padding: '6px 0' }}>
            {/* Header tab content info */}
            <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#3B82F6' }}>BÁO CÁO CÔNG VIỆC HÀNG NGÀY</div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setActiveTab('HOME')}
                style={{ fontSize: 11, color: '#64748B' }}
              >
                Quay lại
              </button>
            </div>
            {/* Render existing DailyInputClient workflow inside tab */}
            <DailyInputClient projects={projects} />
          </div>
        )}
      </main>

      {/* Leave Request Dialog */}
      {showLeaveModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(4px)',
          zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
        }}>
          <form onSubmit={handleLeaveSubmit} style={{
            background: '#0F172A', border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 16, padding: 24, maxWidth: 380, width: '100%',
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#F8FAFC', marginBottom: 16, textAlign: 'center' }}>
              Gửi Yêu Cầu Xin Nghỉ Phép
            </h3>

            <div className="form-group mb-4">
              <label className="form-label">Loại nghỉ phép *</label>
              <select className="form-select" value={leaveType} onChange={(e) => setLeaveType(e.target.value)}>
                <option value="Nghỉ phép năm">Nghỉ phép năm</option>
                <option value="Nghỉ ốm">Nghỉ ốm</option>
                <option value="Nghỉ không lương">Nghỉ không lương</option>
              </select>
            </div>

            <div className="form-group mb-4">
              <label className="form-label">Từ ngày *</label>
              <input type="date" className="form-input" value={leaveStart} onChange={(e) => setLeaveStart(e.target.value)} required />
            </div>

            <div className="form-group mb-4">
              <label className="form-label">Đến ngày *</label>
              <input type="date" className="form-input" value={leaveEnd} onChange={(e) => setLeaveEnd(e.target.value)} required />
            </div>

            <div className="form-group mb-6">
              <label className="form-label">Lý do xin nghỉ *</label>
              <textarea
                className="form-input"
                style={{ height: 70, resize: 'none', padding: 8 }}
                placeholder="Nhập lý do cụ thể..."
                value={leaveReason}
                onChange={(e) => setLeaveReason(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowLeaveModal(false)} disabled={leaveLoading}>
                Hủy
              </button>
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={leaveLoading}>
                {leaveLoading ? 'Đang gửi...' : 'Gửi đơn'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* OT Request Dialog */}
      {showOtModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(4px)',
          zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
        }}>
          <form onSubmit={handleOtSubmit} style={{
            background: '#0F172A', border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 16, padding: 24, maxWidth: 380, width: '100%',
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#F8FAFC', marginBottom: 16, textAlign: 'center' }}>
              Đăng Ký Làm Tăng Ca
            </h3>

            <div className="form-group mb-4">
              <label className="form-label">Dự án công trình *</label>
              <select className="form-select" value={otProjectId} onChange={(e) => setOtProjectId(e.target.value)} required>
                <option value="">-- Chọn công trình --</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group mb-4">
              <label className="form-label">Ngày tăng ca *</label>
              <input type="date" className="form-input" value={otDate} onChange={(e) => setOtDate(e.target.value)} required />
            </div>

            <div className="grid-2 mb-4">
              <div className="form-group">
                <label className="form-label">Giờ bắt đầu *</label>
                <input type="time" className="form-input" value={otStart} onChange={(e) => setOtStart(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Giờ kết thúc *</label>
                <input type="time" className="form-input" value={otEnd} onChange={(e) => setOtEnd(e.target.value)} required />
              </div>
            </div>

            <div className="form-group mb-6">
              <label className="form-label">Lý do tăng ca *</label>
              <input
                type="text"
                className="form-input"
                placeholder="Nhập lý do hoặc nội dung việc..."
                value={otReason}
                onChange={(e) => setOtReason(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowOtModal(false)} disabled={otLoading}>
                Hủy
              </button>
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={otLoading}>
                {otLoading ? 'Đang gửi...' : 'Gửi đơn'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Bottom Navigation Bar */}
      <nav style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 64,
        background: '#1E293B',
        borderTop: '1px solid rgba(255, 255, 255, 0.05)',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        zIndex: 900,
      }}>
        <button
          onClick={() => setActiveTab('HOME')}
          style={{
            background: 'transparent',
            border: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
            color: activeTab === 'HOME' ? '#3B82F6' : '#94A3B8',
            cursor: 'pointer',
            fontSize: 11,
            fontWeight: activeTab === 'HOME' ? 700 : 500,
          }}
        >
          <Clock size={20} />
          <span>Chấm công</span>
        </button>

        <button
          onClick={() => setActiveTab('REPORT')}
          style={{
            background: 'transparent',
            border: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
            color: activeTab === 'REPORT' ? '#3B82F6' : '#94A3B8',
            cursor: 'pointer',
            fontSize: 11,
            fontWeight: activeTab === 'REPORT' ? 700 : 500,
          }}
        >
          <FileText size={20} />
          <span>Báo cáo ngày</span>
        </button>
      </nav>
    </div>
  );
}
