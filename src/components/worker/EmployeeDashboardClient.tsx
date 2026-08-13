'use client';

// src/components/worker/EmployeeDashboardClient.tsx
// Trang chu All-in-one danh cho Cong nhan (Mobile-first)
// Chuc nang: Cham cong GPS, Xem quy phep, Xem lich su, Gui yeu cau nghi phep/tang ca, Bao cao cong viec hang ngay

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  MapPin, Calendar, Clock, LogOut, FileText, Send, User, 
  ChevronRight, CheckCircle2, AlertTriangle, Check, Briefcase, PlusCircle, History
} from 'lucide-react';
import DailyInputClient from './DailyInputClient';
import PwaInstallPrompt from './PwaInstallPrompt';

// ─── NATIVE INDEXEDDB HELPER FOR OFFLINE ATTENDANCE ──────────────────────────
const openOfflineDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return reject('SSR Environment');
    const request = window.indexedDB.open('HomeProOfflineDB', 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('attendance_logs')) {
        db.createObjectStore('attendance_logs', { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const saveOfflineRecord = async (record: { clientTimestamp: string; type: 'IN' | 'OUT'; location: string }) => {
  const db = await openOfflineDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction('attendance_logs', 'readwrite');
    const store = tx.objectStore('attendance_logs');
    const request = store.add(record);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

const getOfflineRecords = async (): Promise<Array<{ id?: number; clientTimestamp: string; type: 'IN' | 'OUT'; location: string }>> => {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('attendance_logs', 'readonly');
    const store = tx.objectStore('attendance_logs');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const clearOfflineRecords = async () => {
  const db = await openOfflineDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction('attendance_logs', 'readwrite');
    const store = tx.objectStore('attendance_logs');
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

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
  canEditAttendance?: boolean;
}

export default function EmployeeDashboardClient({
  session,
  todayRecord: initialTodayRecord,
  leaveBalances,
  attendanceHistory,
  projects,
  canEditAttendance = false,
}: EmployeeDashboardClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'HOME' | 'REPORT' | 'REQUESTS'>('HOME');
  
  // GPS Attendance state
  const [todayRecord, setTodayRecord] = useState(initialTodayRecord);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState('');
  const [gpsSuccess, setGpsSuccess] = useState('');
  const [coordsStr, setCoordsStr] = useState('');

  // States for PWA install helper (A2HS)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPwaPrompt, setShowPwaPrompt] = useState(false);

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

  // Edit Attendance Form State
  const [showEditAttModal, setShowEditAttModal] = useState(false);
  const [editCheckIn, setEditCheckIn] = useState('');
  const [editCheckOut, setEditCheckOut] = useState('');
  const [editReason, setEditReason] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  // Helper to open edit modal
  const openEditAttendance = () => {
    if (!todayRecord?.id || todayRecord.id === -999) return;
    const toLocalTimeStr = (dateStr: string | Date | null) => {
      if (!dateStr) return '';
      const d = new Date(dateStr);
      // Format to YYYY-MM-DDTHH:mm
      return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    };
    setEditCheckIn(toLocalTimeStr(todayRecord.checkIn));
    setEditCheckOut(toLocalTimeStr(todayRecord.checkOut));
    setEditReason('');
    setShowEditAttModal(true);
  };

  async function handleEditAttendanceSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!todayRecord?.id || todayRecord.id === -999) return;
    if (!editReason) {
      alert('Vui lòng nhập lý do điều chỉnh');
      return;
    }
    setEditLoading(true);
    try {
      const checkInISO = editCheckIn ? new Date(editCheckIn).toISOString() : null;
      const checkOutISO = editCheckOut ? new Date(editCheckOut).toISOString() : null;

      const res = await fetch(`/api/hr/attendance/${todayRecord.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checkIn: checkInISO,
          checkOut: checkOutISO,
          correctionReason: editReason,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Cập nhật thất bại');
      
      setTodayRecord(data);
      setShowEditAttModal(false);
      setGpsSuccess('Đã cập nhật giờ công thành công.');
      router.refresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setEditLoading(false);
    }
  }

  // Register PWA Manifest and Service Worker in client context
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Inject Manifest Link dynamically
    let link = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'manifest';
      link.href = '/manifest.json';
      document.head.appendChild(link);
    }

    // 2. Register Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then(
        (reg) => console.log('PWA Service Worker registered successfully:', reg.scope),
        (err) => console.error('PWA Service Worker registration failed:', err)
      );
    }

    // 3. Listen to beforeinstallprompt event for A2HS installation triggers
    const handleBeforeInstallPrompt = (e: Event) => {
      console.log('beforeinstallprompt event fired and captured');
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Background Sync when network returns online
  useEffect(() => {
    async function syncOfflineRecords() {
      try {
        const records = await getOfflineRecords();
        if (records.length === 0) return;

        console.log(`Syncing ${records.length} offline attendance logs...`);
        const res = await fetch('/api/hr/attendance/clock', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ records }),
        });

        if (res.ok) {
          await clearOfflineRecords();
          setGpsSuccess('Đã tự động đồng bộ hóa chấm công ngoại tuyến lên hệ thống!');
          // Fetch today's actual record from API to refresh UI
          const todayRes = await fetch('/api/hr/attendance/today');
          if (todayRes.ok) {
            const todayData = await todayRes.json();
            setTodayRecord(todayData);
          }
          router.refresh();
        }
      } catch (err) {
        console.error('Failed to sync offline logs:', err);
      }
    }

    // Initial check on mount
    syncOfflineRecords();

    // Listen to network transitions
    window.addEventListener('online', syncOfflineRecords);
    return () => {
      window.removeEventListener('online', syncOfflineRecords);
    };
  }, [router]);

  // PWA Prompt trigger helper (UX Delay logic)
  function triggerPwaPrompt() {
    if (typeof window === 'undefined') return;
    const hasSeen = localStorage.getItem('has_seen_pwa_prompt');
    if (hasSeen !== 'true') {
      setTimeout(() => {
        setShowPwaPrompt(true);
        localStorage.setItem('has_seen_pwa_prompt', 'true');
      }, 2000);
    }
  }

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
  async function handleGpsAttendance(type: 'IN' | 'OUT') {
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

        const clockType = type;
        const isCheckOut = clockType === 'OUT';
        const endpoint = isCheckOut 
          ? '/api/hr/attendance/checkout' 
          : '/api/hr/attendance/checkin';

        // ─── OFFLINE MODE: IF OFFLINE, SAVE TO INDEXEDDB ────────────────────────
        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
          try {
            await saveOfflineRecord({
              clientTimestamp: new Date().toISOString(),
              type: clockType,
              location: locationString,
            });

            if (clockType === 'IN') {
              setTodayRecord({
                id: -999, // temporary ID
                checkIn: new Date(),
                checkOut: null,
                status: 'PENDING_SYNC',
                totalHours: 0,
              });
              setGpsSuccess(`Đã ghi nhận Vào Ca Ngoại tuyến lúc ${new Date().toLocaleTimeString('vi-VN')}! Hệ thống sẽ tự động đồng bộ khi khôi phục mạng.`);
            } else {
              setTodayRecord(prev => ({
                ...prev,
                checkOut: new Date(),
                status: 'PENDING_SYNC',
              } as any));
              setGpsSuccess(`Đã ghi nhận Ra Ca Ngoại tuyến lúc ${new Date().toLocaleTimeString('vi-VN')}! Hệ thống sẽ tự động đồng bộ khi khôi phục mạng.`);
            }
            triggerPwaPrompt();
          } catch (err: any) {
            setGpsError('Không thể lưu chấm công ngoại tuyến: ' + err.message);
          } finally {
            setGpsLoading(false);
          }
          return;
        }

        // ─── ONLINE MODE: SEND TO BACKEND DIRECTLY ──────────────────────────────
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
          triggerPwaPrompt();
          router.refresh();
        } catch (err: any) {
          // Fallback to IndexedDB offline storage if fetch request fails (weak signal)
          console.warn('Network request failed, falling back to offline IndexedDB storage:', err);
          try {
            await saveOfflineRecord({
              clientTimestamp: new Date().toISOString(),
              type: clockType,
              location: locationString,
            });

            if (clockType === 'IN') {
              setTodayRecord({
                id: -999,
                checkIn: new Date(),
                checkOut: null,
                status: 'PENDING_SYNC',
                totalHours: 0,
              });
              setGpsSuccess(`Mạng yếu! Đã lưu Vào Ca Ngoại tuyến lúc ${new Date().toLocaleTimeString('vi-VN')}. Bản ghi sẽ tự động đồng bộ khi có kết nối ổn định.`);
            } else {
              setTodayRecord(prev => ({
                ...prev,
                checkOut: new Date(),
                status: 'PENDING_SYNC',
              } as any));
              setGpsSuccess(`Mạng yếu! Đã lưu Ra Ca Ngoại tuyến lúc ${new Date().toLocaleTimeString('vi-VN')}. Bản ghi sẽ tự động đồng bộ khi có kết nối ổn định.`);
            }
            triggerPwaPrompt();
          } catch (offlineErr: any) {
            setGpsError('Lỗi kết nối máy chủ và không thể lưu ngoại tuyến: ' + offlineErr.message);
          }
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
                  color: todayRecord?.checkOut ? '#10B981' : todayRecord?.checkIn ? '#3B82F6' : '#F59E0B'
                }}>
                  {todayRecord?.checkOut ? 'Đã hoàn thành ca' : todayRecord?.checkIn ? 'Đang làm việc' : 'Chưa vào ca'}
                </strong>
              </div>

              {/* 2 Buttons for Explicit State Separation */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                {/* NÚT VÀO CA */}
                <button
                  onClick={() => handleGpsAttendance('IN')}
                  disabled={gpsLoading || !!todayRecord?.checkIn}
                  style={{
                    padding: '20px 10px',
                    borderRadius: 16,
                    background: todayRecord?.checkIn
                      ? '#334155'
                      : 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: todayRecord?.checkIn ? 'none' : '0 8px 20px rgba(16, 185, 129, 0.3)',
                    color: todayRecord?.checkIn ? '#94A3B8' : '#fff',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: gpsLoading || !!todayRecord?.checkIn ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <MapPin size={28} style={{ marginBottom: 8, opacity: todayRecord?.checkIn ? 0.5 : 1 }} />
                  <span style={{ fontSize: 14, fontWeight: 800, letterSpacing: '0.02em' }}>
                    VÀO CA GPS
                  </span>
                </button>

                {/* NÚT RA CA */}
                <button
                  onClick={() => handleGpsAttendance('OUT')}
                  disabled={gpsLoading || !todayRecord?.checkIn || !!todayRecord?.checkOut}
                  style={{
                    padding: '20px 10px',
                    borderRadius: 16,
                    background: !todayRecord?.checkIn || !!todayRecord?.checkOut
                      ? '#334155'
                      : 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: !todayRecord?.checkIn || !!todayRecord?.checkOut ? 'none' : '0 8px 20px rgba(245, 158, 11, 0.3)',
                    color: !todayRecord?.checkIn || !!todayRecord?.checkOut ? '#94A3B8' : '#fff',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: gpsLoading || !todayRecord?.checkIn || !!todayRecord?.checkOut ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <MapPin size={28} style={{ marginBottom: 8, opacity: !todayRecord?.checkIn || !!todayRecord?.checkOut ? 0.5 : 1 }} />
                  <span style={{ fontSize: 14, fontWeight: 800, letterSpacing: '0.02em' }}>
                    RA CA GPS
                  </span>
                </button>
              </div>

              {gpsError && (
                <div className="alert alert-danger" style={{ fontSize: 12, marginTop: 12, padding: '8px 12px', textAlign: 'left' }}>
                  ⚠️ {gpsError}
                </div>
              )}

              {gpsSuccess && (
                <div className="alert alert-success" style={{ fontSize: 12, marginTop: 12, padding: '8px 12px', textAlign: 'left' }}>
                  ✅ {gpsSuccess}
                </div>
              )}

              {coordsStr && (
                <div style={{ fontSize: 10, color: '#64748B', marginTop: 8 }}>
                  Tọa độ GPS: <code>{coordsStr}</code>
                </div>
              )}

              {/* ALWAYS SHOW Shift info display */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 12,
                marginTop: 20,
                borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                paddingTop: 16,
                fontSize: 13,
                position: 'relative'
              }}>
                {canEditAttendance && todayRecord?.id && todayRecord.id !== -999 && (
                  <button
                    onClick={openEditAttendance}
                    style={{
                      position: 'absolute',
                      top: 12,
                      right: 0,
                      background: 'rgba(59, 130, 246, 0.1)',
                      color: '#3B82F6',
                      border: '1px solid rgba(59, 130, 246, 0.2)',
                      padding: '4px 8px',
                      borderRadius: 6,
                      fontSize: 11,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    ✏️ Sửa
                  </button>
                )}
                <div>
                  <div style={{ color: '#94A3B8', fontSize: 11 }}>Giờ vào ca:</div>
                  <div style={{ fontWeight: 700, color: '#F8FAFC', fontSize: 16, marginTop: 4 }}>
                    {formatTime(todayRecord?.checkIn ?? null)}
                  </div>
                </div>
                <div>
                  <div style={{ color: '#94A3B8', fontSize: 11 }}>Giờ ra ca:</div>
                  <div style={{ fontWeight: 700, color: '#F8FAFC', fontSize: 16, marginTop: 4 }}>
                    {formatTime(todayRecord?.checkOut ?? null)}
                  </div>
                </div>
              </div>
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

      {/* Edit Attendance Dialog */}
      {showEditAttModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(4px)',
          zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
        }}>
          <form onSubmit={handleEditAttendanceSubmit} style={{
            background: '#0F172A', border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 16, padding: 24, maxWidth: 380, width: '100%',
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#F8FAFC', marginBottom: 16, textAlign: 'center' }}>
              Chỉnh Sửa Giờ Công
            </h3>

            <div className="grid-2 mb-4">
              <div className="form-group">
                <label className="form-label">Giờ vào ca</label>
                <input type="datetime-local" className="form-input" value={editCheckIn} onChange={(e) => setEditCheckIn(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Giờ ra ca</label>
                <input type="datetime-local" className="form-input" value={editCheckOut} onChange={(e) => setEditCheckOut(e.target.value)} />
              </div>
            </div>

            <div className="form-group mb-6">
              <label className="form-label">Lý do điều chỉnh *</label>
              <textarea
                className="form-input"
                style={{ height: 70, resize: 'none', padding: 8 }}
                placeholder="Nhập lý do điều chỉnh bắt buộc..."
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowEditAttModal(false)} disabled={editLoading}>
                Hủy
              </button>
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={editLoading}>
                {editLoading ? 'Đang lưu...' : 'Lưu thay đổi'}
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

      {/* PWA Install Promotion (Bottom Sheet) */}
      <PwaInstallPrompt
        deferredPrompt={deferredPrompt}
        isOpen={showPwaPrompt}
        onClose={() => setShowPwaPrompt(false)}
      />
    </div>
  );
}
