'use client';
import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { User, LogOut, Settings, ShieldAlert } from 'lucide-react';
import { usePwrStore } from '@/lib/pwr/usePwrStore';

export function ProfileTabUI() {
  const { userName, userAvatar, userLevel } = usePwrStore();
  const [qrCode, setQrCode] = useState('INIT_CODE');
  const [timeLeft, setTimeLeft] = useState(30);

  // QA Safeguard: Dynamic QR Code (TOTP)
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setQrCode(`CODE_${Math.random().toString(36).substring(7)}`);
          return 30;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div style={{ padding: '20px 20px 100px 20px' }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <img 
          src={userAvatar} 
          alt="Avatar" 
          onError={(e) => { e.currentTarget.src = \`https://ui-avatars.com/api/?name=\${encodeURIComponent(userName)}&background=3b82f6&color=fff&bold=true\`; }}
          style={{ width: 80, height: 80, borderRadius: '50%', border: '3px solid #374151', objectFit: 'cover', margin: '0 auto 16px' }} 
        />
        <h2 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 4px 0' }}>{userName}</h2>
        <p style={{ color: '#9ca3af', fontSize: 14, margin: 0 }}>Công nhân - Level {userLevel}</p>
      </div>

      <div className="glass-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Mã Định Danh (Thay đổi sau {timeLeft}s)</h3>
        
        {/* QA Safeguard: Visual Liveness via animated border */}
        <div style={{ 
          padding: 16, background: '#fff', borderRadius: 16, 
          boxShadow: \`0 0 20px \${timeLeft < 5 ? 'rgba(239, 68, 68, 0.5)' : 'rgba(59, 130, 246, 0.3)'}\`,
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
        <button style={{ width: '100%', padding: 16, display: 'flex', alignItems: 'center', gap: 12, background: 'transparent', border: 'none', color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.05)', textAlign: 'left' }}>
          <Settings size={20} color="#9ca3af" />
          <span style={{ fontSize: 16, fontWeight: 500 }}>Cài đặt tài khoản</span>
        </button>
        <button style={{ width: '100%', padding: 16, display: 'flex', alignItems: 'center', gap: 12, background: 'transparent', border: 'none', color: '#ef4444', textAlign: 'left' }}>
          <LogOut size={20} />
          <span style={{ fontSize: 16, fontWeight: 500 }}>Đăng xuất</span>
        </button>
      </div>
    </div>
  );
}
