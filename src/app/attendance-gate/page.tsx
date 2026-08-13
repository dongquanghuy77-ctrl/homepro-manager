'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, MapPin, CheckCircle } from 'lucide-react';

export default function AttendanceGatePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState<'IDLE' | 'LOCATING' | 'READY' | 'SUCCESS'>('IDLE');
  const [location, setLocation] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  
  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch initial status to see if already checked in
  useEffect(() => {
    fetch('/api/hr/attendance/today')
      .then(res => res.json())
      .then(data => {
        if (data.hasCheckedIn) {
          router.refresh(); // Middleware will redirect them if they are checked in
        }
      })
      .catch(() => {});
  }, [router]);

  const handleCheckIn = async () => {
    setLoading(true);
    setError('');
    setStatus('LOCATING');

    try {
      // Simulate GPS locating (or do real geolocation if required)
      await new Promise(resolve => setTimeout(resolve, 1000));
      setStatus('READY');
      
      const payload = { location: 'Cổng Công ty' }; // Mocked location for now

      const res = await fetch('/api/hr/attendance/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Chấm công thất bại');

      setStatus('SUCCESS');
      
      // Delay to show success message, then middleware handles redirection via refresh
      setTimeout(() => {
        router.refresh();
      }, 1500);

    } catch (err: any) {
      setError(err.message);
      setStatus('IDLE');
    } finally {
      setLoading(false);
    }
  };

  const getDayStr = () => {
    return currentTime.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };
  const getTimeStr = () => {
    return currentTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', padding: '16px' }}>
      <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '400px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>Chấm Công Hôm Nay</h1>
          <p style={{ color: '#64748b', marginTop: '4px' }}>Bắt buộc điểm danh để vào hệ thống</p>
        </div>

        <div style={{ background: '#f1f5f9', borderRadius: '12px', padding: '16px', marginBottom: '24px', textAlign: 'center' }}>
          <div style={{ fontSize: '14px', color: '#475569', marginBottom: '4px' }}>{getDayStr()}</div>
          <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#0f172a', letterSpacing: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <Clock size={28} /> {getTimeStr()}
          </div>
        </div>

        <div style={{ marginBottom: '24px', fontSize: '14px', color: '#475569' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <MapPin size={18} color="#3b82f6" />
            <span>Trạng thái: <strong>{status === 'LOCATING' ? 'Đang xác định vị trí...' : status === 'SUCCESS' ? 'Hoàn tất' : 'Đang chờ chấm công'}</strong></span>
          </div>
        </div>

        {error && (
          <div style={{ padding: '12px', background: '#fef2f2', color: '#ef4444', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>
            {error}
          </div>
        )}

        {status === 'SUCCESS' ? (
          <button 
            disabled
            style={{ width: '100%', padding: '16px', background: '#10b981', color: 'white', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            <CheckCircle size={20} /> CHẤM CÔNG THÀNH CÔNG
          </button>
        ) : (
          <button 
            onClick={handleCheckIn}
            disabled={loading}
            style={{ width: '100%', padding: '16px', background: loading ? '#94a3b8' : '#3b82f6', color: 'white', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer', transition: 'background 0.2s' }}
          >
            {loading ? 'ĐANG XỬ LÝ...' : 'CHẤM CÔNG VÀO'}
          </button>
        )}

        <div style={{ marginTop: '16px', textAlign: 'center' }}>
          <button 
            onClick={() => {
               fetch('/api/auth/logout', { method: 'POST' }).then(() => router.push('/login'));
            }}
            style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '14px', cursor: 'pointer', textDecoration: 'underline' }}
          >
            Đăng xuất
          </button>
        </div>

      </div>
    </div>
  );
}
