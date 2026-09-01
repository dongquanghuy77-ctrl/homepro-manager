'use client';

import React, { useState, useRef } from 'react';
import { Camera, Image as ImageIcon, ShieldAlert, LogIn, UserPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function StationAuthUI() {
  const router = useRouter();
  const [workerCode, setWorkerCode] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [selectedFaction, setSelectedFaction] = useState('CNC');
  const [inviteCode, setInviteCode] = useState('');
  
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleNumpadClick = (num: string) => {
    if (pinCode.length < 6) setPinCode(p => p + num);
  };
  const handleClear = () => setPinCode('');
  
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const url = URL.createObjectURL(e.target.files[0]);
      setAvatarPreview(url);
    }
  };

  const handleLogin = async () => {
    if (pinCode.length < 4) return alert('PIN phải từ 4-6 số');
    // Mock API
    alert('BEEP! Đăng nhập thành công: ' + workerCode);
    router.push('/pwr/station');
  };

  const handleRegister = async () => {
    if (inviteCode !== 'XUONGHP2026') return alert('Lỗi: Mã xưởng không hợp lệ! Hành vi tạo tài khoản bị từ chối.');
    if (!avatarPreview) return alert('Vui lòng chọn hoặc chụp ảnh đại diện!');
    
    alert('TẠO NHÂN VẬT THÀNH CÔNG! Chào mừng gia nhập phái ' + selectedFaction);
    router.push('/pwr/station');
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #09090b 0%, #18181b 100%)', 
      color: '#fff', 
      fontFamily: 'monospace',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 20
    }}>
      {/* Khung Viền Gamified */}
      <div style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 24,
        padding: 32,
        width: '100%', maxWidth: 420,
        boxShadow: '0 0 40px rgba(0,0,0,0.8), inset 0 0 20px rgba(255,255,255,0.02)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{ fontSize: 24, color: '#38bdf8', textShadow: '0 0 10px rgba(56,189,248,0.5)', margin: '0 0 8px 0' }}>
            {isRegistering ? 'TẠO NHÂN VẬT (NEW PLAYER)' : 'ĐĂNG NHẬP TRẠM (LOGIN)'}
          </h1>
          <p style={{ color: '#a1a1aa', fontSize: 14, margin: 0 }}>HOMEPRO STATION OS v5.0</p>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', marginBottom: 8, color: '#9ca3af', fontSize: 12 }}>MÃ THỢ (PLAYER ID)</label>
          <input 
            type="text" 
            value={workerCode}
            onChange={e => setWorkerCode(e.target.value.toUpperCase())}
            placeholder="VD: T01"
            style={{ 
              width: '100%', background: '#000', border: '1px solid #3f3f46', 
              color: '#fff', padding: 16, fontSize: 20, textAlign: 'center', borderRadius: 12,
              letterSpacing: 4
            }} 
          />
        </div>

        {!isRegistering ? (
          <>
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', marginBottom: 8, color: '#9ca3af', fontSize: 12, textAlign: 'center' }}>MÃ PIN (4-6 SỐ)</label>
              <div style={{ fontSize: 32, textAlign: 'center', letterSpacing: 12, height: 40 }}>
                {pinCode.replace(/./g, '●')}
              </div>
            </div>

            {/* Numpad Khổng Lồ */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                <button 
                  key={num} 
                  onClick={() => handleNumpadClick(String(num))}
                  style={{ background: '#27272a', border: 'none', color: '#fff', padding: 20, fontSize: 24, borderRadius: 12, cursor: 'pointer' }}
                >
                  {num}
                </button>
              ))}
              <button onClick={handleClear} style={{ background: '#ef4444', border: 'none', color: '#fff', padding: 20, fontSize: 16, borderRadius: 12, cursor: 'pointer' }}>XÓA</button>
              <button onClick={() => handleNumpadClick('0')} style={{ background: '#27272a', border: 'none', color: '#fff', padding: 20, fontSize: 24, borderRadius: 12, cursor: 'pointer' }}>0</button>
              <button onClick={() => setIsRegistering(true)} style={{ background: '#3b82f6', border: 'none', color: '#fff', padding: 20, fontSize: 14, borderRadius: 12, cursor: 'pointer' }}>MỚI</button>
            </div>

            <button onClick={handleLogin} style={{ width: '100%', padding: 20, background: '#10b981', color: '#000', fontWeight: 'bold', fontSize: 18, border: 'none', borderRadius: 12, cursor: 'pointer', boxShadow: '0 0 20px rgba(16,185,129,0.4)' }}>
              VÀO TRẠM <LogIn size={20} style={{ display: 'inline', verticalAlign: 'middle', marginLeft: 8 }}/>
            </button>
          </>
        ) : (
          <>
            {/* Form Đăng Ký */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
              <button 
                onClick={() => setSelectedFaction('CNC')}
                style={{ flex: 1, padding: 12, border: \`2px solid \${selectedFaction === 'CNC' ? '#3b82f6' : '#27272a'}\`, background: selectedFaction === 'CNC' ? 'rgba(59,130,246,0.1)' : '#000', color: selectedFaction === 'CNC' ? '#3b82f6' : '#fff', borderRadius: 12, cursor: 'pointer' }}
              >
                TỔ CNC
              </button>
              <button 
                onClick={() => setSelectedFaction('DAN_CANH')}
                style={{ flex: 1, padding: 12, border: \`2px solid \${selectedFaction === 'DAN_CANH' ? '#f59e0b' : '#27272a'}\`, background: selectedFaction === 'DAN_CANH' ? 'rgba(245,158,11,0.1)' : '#000', color: selectedFaction === 'DAN_CANH' ? '#f59e0b' : '#fff', borderRadius: 12, cursor: 'pointer' }}
              >
                TỔ DÁN
              </button>
            </div>

            {/* Avatar Selector */}
            <div style={{ marginBottom: 20, textAlign: 'center' }}>
              <div style={{ 
                width: 100, height: 100, borderRadius: 50, border: '2px dashed #52525b', 
                margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden', background: '#000'
              }}>
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <UserPlus size={32} color="#52525b" />
                )}
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                <button onClick={() => cameraInputRef.current?.click()} style={{ padding: '8px 12px', background: '#27272a', border: 'none', color: '#fff', borderRadius: 8, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                  <Camera size={14}/> Camera
                </button>
                <button onClick={() => fileInputRef.current?.click()} style={{ padding: '8px 12px', background: '#27272a', border: 'none', color: '#fff', borderRadius: 8, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                  <ImageIcon size={14}/> Thư viện
                </button>
              </div>
              {/* Hidden Inputs */}
              <input type="file" accept="image/*" capture="user" ref={cameraInputRef} style={{ display: 'none' }} onChange={handleImageSelect} />
              <input type="file" accept="image/*" ref={fileInputRef} style={{ display: 'none' }} onChange={handleImageSelect} />
            </div>

            <div style={{ marginBottom: 24 }}>
              <input 
                type="text" 
                value={inviteCode}
                onChange={e => setInviteCode(e.target.value.toUpperCase())}
                placeholder="MÃ XƯỞNG BÍ MẬT"
                style={{ 
                  width: '100%', background: '#000', border: '1px solid #ef4444', 
                  color: '#ef4444', padding: 12, fontSize: 14, textAlign: 'center', borderRadius: 8
                }} 
              />
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setIsRegistering(false)} style={{ flex: 1, padding: 16, background: '#27272a', color: '#fff', border: 'none', borderRadius: 12, cursor: 'pointer' }}>QUAY LẠI</button>
              <button onClick={handleRegister} style={{ flex: 2, padding: 16, background: '#38bdf8', color: '#000', fontWeight: 'bold', fontSize: 16, border: 'none', borderRadius: 12, cursor: 'pointer', boxShadow: '0 0 20px rgba(56,189,248,0.4)' }}>
                TẠO NHÂN VẬT
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
