'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { ShieldCheck, ShieldAlert, KeyRound, Loader2 } from 'lucide-react';

export default function ApproveResetPage() {
  const searchParams = useSearchParams();
  const token = searchParams?.get('token');
  
  const [status, setStatus] = useState<'LOADING' | 'READY' | 'APPROVED' | 'ERROR'>('LOADING');
  const [data, setData] = useState<any>(null);
  const [tempPin, setTempPin] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('ERROR');
      return;
    }
    // Fetch request details
    fetch(`/api/pwr/auth/forgot-password?token=${token}`)
      .then(res => res.json())
      .then(resData => {
        if (resData.status === 'EXPIRED' || resData.error) {
          setStatus('ERROR');
        } else if (resData.status === 'APPROVED') {
          setStatus('APPROVED');
          setTempPin(resData.tempPin);
          setData(resData);
        } else {
          setData(resData);
          setStatus('READY');
        }
      })
      .catch(() => setStatus('ERROR'));
  }, [token]);

  const handleApprove = async () => {
    try {
      setStatus('LOADING');
      const res = await fetch('/api/pwr/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'APPROVE', token })
      });
      const result = await res.json();
      
      if (result.success) {
        setTempPin(result.tempPin);
        setStatus('APPROVED');
      } else {
        setStatus('ERROR');
      }
    } catch (e) {
      setStatus('ERROR');
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#050505', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: 'system-ui' }}>
      <div style={{ background: '#111', border: '1px solid #333', padding: 32, borderRadius: 24, maxWidth: 400, width: '100%', textAlign: 'center' }}>
        
        {status === 'LOADING' && (
          <div style={{ padding: 40 }}>
            <Loader2 size={48} className="animate-spin mx-auto text-purple-500 mb-4" />
            <div style={{ color: '#aaa' }}>Đang tải dữ liệu...</div>
          </div>
        )}

        {status === 'ERROR' && (
          <div style={{ padding: 20 }}>
            <ShieldAlert size={64} className="mx-auto text-red-500 mb-4" />
            <h2 style={{ fontSize: 24, fontWeight: 'bold', color: '#f87171', marginBottom: 12 }}>Yêu cầu không hợp lệ</h2>
            <p style={{ color: '#aaa' }}>Mã QR đã hết hạn hoặc không tồn tại. Vui lòng yêu cầu nhân viên tạo lại mã QR mới trên máy trạm.</p>
          </div>
        )}

        {status === 'READY' && data && (
          <div>
            <div style={{ width: 80, height: 80, background: 'rgba(168,85,247,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <ShieldCheck size={40} className="text-purple-500" />
            </div>
            <h2 style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 8 }}>Duyệt cấp lại Mật khẩu</h2>
            <p style={{ color: '#aaa', marginBottom: 24 }}>
              Nhân viên có số điện thoại <strong style={{ color: '#fff', fontSize: 18 }}>{data.phone}</strong> đang yêu cầu cấp lại mật khẩu.
            </p>
            <button 
              onClick={handleApprove}
              style={{ width: '100%', padding: '16px', background: '#a855f7', color: '#fff', fontWeight: 'bold', borderRadius: 12, fontSize: 16 }}
            >
              DUYỆT & CẤP MÃ PIN
            </button>
          </div>
        )}

        {status === 'APPROVED' && (
          <div>
            <div style={{ width: 80, height: 80, background: 'rgba(16,185,129,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <KeyRound size={40} className="text-emerald-500" />
            </div>
            <h2 style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 8, color: '#34d399' }}>Đã cấp mã PIN</h2>
            <p style={{ color: '#aaa', marginBottom: 24 }}>
              Hãy đọc mã PIN tạm thời này cho nhân viên. Họ sẽ dùng mã này để đăng nhập và bắt buộc đổi mật khẩu mới.
            </p>
            <div style={{ fontSize: 48, fontWeight: 900, letterSpacing: 8, color: '#fff', background: '#222', padding: 20, borderRadius: 16, border: '1px dashed #555' }}>
              {tempPin}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
