"use client";
import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { User, LogOut, Settings, ShieldAlert, X, CheckCircle2, Lock } from 'lucide-react';
import { usePwrStore } from '@/lib/pwr/usePwrStore';
import { signOut, getSession } from 'next-auth/react';

export function ProfileTabUI() {
  const { userName, userAvatar, userLevel } = usePwrStore();
  const [userId, setUserId] = useState('UNKNOWN');
  
  const [qrCode, setQrCode] = useState('INIT_CODE');
  const [timeLeft, setTimeLeft] = useState(30);
  const [showSettings, setShowSettings] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [updating, setUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);

  // Thuật toán sinh mã TOTP Động (Client-side)
  const generateTOTP = (uid) => {
    const currentUserId = uid || userId || 'UNKNOWN';
    // Lấy chu kỳ 30 giây hiện tại (Time Window)
    const timeWindow = Math.floor(Date.now() / 30000);
    // Tính số giây còn lại của chu kỳ
    const remaining = 30 - (Math.floor(Date.now() / 1000) % 30);
    setTimeLeft(remaining);
    
    // Đóng gói Payload và Base64
    const payload = JSON.stringify({ u: currentUserId, t: timeWindow, action: "STATION_AUTH" });
    setQrCode(btoa(payload));
  };

  useEffect(() => {
    let activeId = 'UNKNOWN';
    getSession().then(session => {
      if (session?.user) {
        // NextAuth might not expose id by default, fallback to name/email
        activeId = (session.user as any).id || session.user.name || session.user.email || 'UNKNOWN';
        setUserId(activeId);
        generateTOTP(activeId);
      }
    });
    
    const timer = setInterval(() => {
      generateTOTP(activeId);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleUpdatePassword = async () => {
    if (!newPassword || newPassword.length < 4) {
      alert('Mật khẩu/Mã PIN phải có ít nhất 4 ký tự');
      return;
    }
    setUpdating(true);
    try {
      // Mock API call to update profile
      const res = await fetch('/api/pwr/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword })
      });
      setUpdating(false);
      setUpdateSuccess(true);
      setTimeout(() => {
        setShowSettings(false);
        setUpdateSuccess(false);
        setNewPassword('');
      }, 2000);
    } catch (e) {
      setUpdating(false);
      alert('Lỗi cập nhật');
    }
  };

  return (
    <div style={{ padding: '20px 20px 100px 20px', position: 'relative' }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <img 
          src={userAvatar || ''} 
          alt="Avatar" 
          onError={(e) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=3b82f6&color=fff&bold=true`; }}
          style={{ width: 80, height: 80, borderRadius: '50%', border: '3px solid #374151', objectFit: 'cover', margin: '0 auto 16px' }} 
        />
        <h2 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 4px 0' }}>{userName}</h2>
        <p style={{ color: '#9ca3af', fontSize: 14, margin: 0 }}>Công nhân - Level {userLevel}</p>
      </div>

      <div className="glass-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Mã Định Danh (Thay đổi sau {timeLeft}s)</h3>
        
        <div style={{ 
          padding: 16, background: '#fff', borderRadius: 16, 
          boxShadow: `0 0 20px ${timeLeft < 5 ? 'rgba(239, 68, 68, 0.5)' : 'rgba(59, 130, 246, 0.3)'}`,
          transition: 'box-shadow 0.3s'
        }}>
          <QRCodeSVG value={qrCode} size={180} />
        </div>
        
        <div style={{ marginTop: 16, fontSize: 12, color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 6, textAlign: 'center' }}>
          <ShieldAlert size={14} color="#fbbf24" />
          Tuyệt đối không chụp ảnh màn hình mã này
        </div>
      </div>

      <div className="glass-card" style={{ overflow: 'hidden' }}>
        <button onClick={() => setShowSettings(true)} style={{ width: '100%', padding: 16, display: 'flex', alignItems: 'center', gap: 12, background: 'transparent', border: 'none', color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.05)', textAlign: 'left', cursor: 'pointer' }}>
          <Settings size={20} color="#9ca3af" />
          <span style={{ fontSize: 16, fontWeight: 500 }}>Cài đặt tài khoản</span>
        </button>
        <button onClick={() => signOut({ callbackUrl: '/pwr/station/login' })} style={{ width: '100%', padding: 16, display: 'flex', alignItems: 'center', gap: 12, background: 'transparent', border: 'none', color: '#ef4444', textAlign: 'left', cursor: 'pointer' }}>
          <LogOut size={20} />
          <span style={{ fontSize: 16, fontWeight: 500 }}>Đăng xuất (Xóa Session)</span>
        </button>
      </div>

      {/* Cài đặt Modal */}
      {showSettings && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' }}>
          <div className="glass-card" style={{ width: '90%', maxWidth: 400, padding: 24, position: 'relative' }}>
            <button onClick={() => setShowSettings(false)} style={{ position: 'absolute', top: 16, right: 16, background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer' }}>
              <X size={24} />
            </button>
            <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>Cài đặt tài khoản</h3>
            
            {updateSuccess ? (
              <div style={{ textAlign: 'center', padding: '20px 0', color: '#10b981' }}>
                <CheckCircle2 size={48} style={{ margin: '0 auto 16px' }} />
                <div style={{ fontWeight: 600 }}>Cập nhật thành công!</div>
              </div>
            ) : (
              <div>
                <label style={{ display: 'block', marginBottom: 8, fontSize: 14, color: '#9ca3af' }}>Đổi Mã PIN (Mật khẩu)</label>
                <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '0 12px', marginBottom: 24 }}>
                  <Lock size={18} color="#9ca3af" />
                  <input 
                    type="password" 
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Nhập mã PIN mới..."
                    style={{ background: 'transparent', border: 'none', color: '#fff', padding: '12px', width: '100%', outline: 'none' }}
                  />
                </div>
                <button 
                  onClick={handleUpdatePassword}
                  disabled={updating}
                  style={{ width: '100%', padding: 14, background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}
                >
                  {updating ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
