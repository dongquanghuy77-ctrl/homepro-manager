'use client';

import React, { useState } from 'react';
import { Mail, Lock, User, Phone, CheckSquare, Square, Trophy, Gift, Award, Settings, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

type AuthState = 'LOGIN' | 'REGISTER' | 'WELCOME';

export default function StationAuthUI() {
  const router = useRouter();
  const [authState, setAuthState] = useState<AuthState>('LOGIN');
  const [rememberMe, setRememberMe] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  // Gamification Glow Colors
  const colors = {
    login: '#8b5cf6', // Purple
    register: '#10b981', // Green
    welcome: '#3b82f6', // Blue
  };

  const currentGlow = authState === 'LOGIN' ? colors.login : authState === 'REGISTER' ? colors.register : colors.welcome;

  const handleAction = () => {
    if (authState === 'LOGIN' || authState === 'REGISTER') {
      setAuthState('WELCOME');
    } else {
      router.push('/pwr/station');
    }
  };

  return (
    <div style={{ 
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999, overflowY: 'auto',
      minHeight: '100vh', 
      background: '#09090e', 
      backgroundImage: 'radial-gradient(circle at center, #13131f 0%, #05050a 100%)',
      color: '#fff', 
      fontFamily: 'system-ui, -apple-system, sans-serif',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 20
    }}>
      
      {/* Header text */}
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: '0 0 8px 0', background: 'linear-gradient(90deg, #8b5cf6, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          THẺ ĐĂNG KÝ, ĐĂNG NHẬP
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <div style={{ height: 1, width: 40, background: 'rgba(255,255,255,0.2)' }} />
          <span style={{ color: '#9ca3af', fontSize: 14, letterSpacing: 2 }}>TRẠM LÀM VIỆC - GAME HÓA</span>
          <div style={{ height: 1, width: 40, background: 'rgba(255,255,255,0.2)' }} />
        </div>
      </div>

      {/* Main Card */}
      <div style={{
        background: 'rgba(15,15,25,0.6)',
        border: `1px solid ${currentGlow}40`,
        borderRadius: 24,
        padding: 32,
        width: '100%', maxWidth: 400,
        boxShadow: `0 0 40px ${currentGlow}20, inset 0 0 20px ${currentGlow}10`,
        transition: 'all 0.5s ease'
      }}>
        
        {/* Card Header & Icon */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ 
            width: 64, height: 64, margin: '0 auto 16px', borderRadius: 16,
            background: `rgba(255,255,255,0.03)`, border: `1px solid ${currentGlow}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 0 20px ${currentGlow}40`
          }}>
            <FactoryIcon color={currentGlow} />
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 600, margin: '0 0 8px 0' }}>Trạm Làm Việc</h2>
          <p style={{ color: '#6b7280', fontSize: 13, margin: 0 }}>
            {authState === 'LOGIN' ? 'Hệ thống điều khiển máy trạm' : 
             authState === 'REGISTER' ? 'Tạo tài khoản để bắt đầu' : 
             'Đăng nhập để tiếp tục hành trình'}
          </p>
        </div>

        {/* Tab Switcher (Login / Register) */}
        {(authState === 'LOGIN' || authState === 'REGISTER') && (
          <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', borderRadius: 12, pading: 4, marginBottom: 24, border: '1px solid rgba(255,255,255,0.05)' }}>
            <button 
              onClick={() => setAuthState('LOGIN')}
              style={{ flex: 1, padding: '12px 0', borderRadius: 10, border: 'none', 
                background: authState === 'LOGIN' ? 'rgba(139,92,246,0.1)' : 'transparent', 
                color: authState === 'LOGIN' ? '#fff' : '#6b7280', 
                fontWeight: authState === 'LOGIN' ? 600 : 400,
                cursor: 'pointer', transition: 'all 0.2s'
              }}>Đăng nhập</button>
            <button 
              onClick={() => setAuthState('REGISTER')}
              style={{ flex: 1, padding: '12px 0', borderRadius: 10, border: 'none', 
                background: authState === 'REGISTER' ? 'rgba(16,185,129,0.1)' : 'transparent', 
                color: authState === 'REGISTER' ? '#fff' : '#6b7280', 
                fontWeight: authState === 'REGISTER' ? 600 : 400,
                cursor: 'pointer', transition: 'all 0.2s'
              }}>Đăng ký</button>
          </div>
        )}

        {/* LOGIN FORM */}
        {authState === 'LOGIN' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ position: 'relative' }}>
              <Mail size={18} color="#6b7280" style={{ position: 'absolute', left: 16, top: 16 }} />
              <input type="text" placeholder="Email hoặc số điện thoại" style={inputStyle} />
            </div>
            <div style={{ position: 'relative' }}>
              <Lock size={18} color="#6b7280" style={{ position: 'absolute', left: 16, top: 16 }} />
              <input type="password" placeholder="Mật khẩu" style={inputStyle} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={() => setRememberMe(!rememberMe)}>
                {rememberMe ? <CheckSquare size={16} color={colors.login} /> : <Square size={16} color="#6b7280" />}
                <span style={{ color: '#d1d5db' }}>Ghi nhớ đăng nhập</span>
              </div>
              <span style={{ color: colors.login, cursor: 'pointer' }}>Quên mật khẩu?</span>
            </div>
            
            <button onClick={handleAction} style={{ ...btnStyle, background: colors.login, boxShadow: `0 8px 24px ${colors.login}40`, marginTop: 8 }}>
              ĐĂNG NHẬP <ChevronRight size={18} />
            </button>

            {/* Gamification Banner */}
            <div style={{ marginTop: 24, background: 'rgba(139,92,246,0.05)', border: `1px solid ${colors.login}30`, borderRadius: 16, padding: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ background: 'rgba(139,92,246,0.1)', padding: 12, borderRadius: 12 }}>
                <Trophy size={24} color="#fbbf24" />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#e5e7eb', marginBottom: 4 }}>Hoàn thành nhiệm vụ để nhận XP</div>
                <div style={{ fontSize: 11, color: '#9ca3af' }}>Đăng nhập mỗi ngày để nhận thưởng!</div>
              </div>
            </div>
          </div>
        )}

        {/* REGISTER FORM */}
        {authState === 'REGISTER' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ position: 'relative' }}>
              <User size={18} color="#6b7280" style={{ position: 'absolute', left: 16, top: 16 }} />
              <input type="text" placeholder="Họ và tên" style={inputStyle} />
            </div>
            <div style={{ position: 'relative' }}>
              <Mail size={18} color="#6b7280" style={{ position: 'absolute', left: 16, top: 16 }} />
              <input type="email" placeholder="Email" style={inputStyle} />
            </div>
            <div style={{ position: 'relative' }}>
              <Phone size={18} color="#6b7280" style={{ position: 'absolute', left: 16, top: 16 }} />
              <input type="text" placeholder="Số điện thoại (tùy chọn)" style={inputStyle} />
            </div>
            <div style={{ position: 'relative' }}>
              <Lock size={18} color="#6b7280" style={{ position: 'absolute', left: 16, top: 16 }} />
              <input type="password" placeholder="Mật khẩu" style={inputStyle} />
            </div>
            <div style={{ position: 'relative' }}>
              <Lock size={18} color="#6b7280" style={{ position: 'absolute', left: 16, top: 16 }} />
              <input type="password" placeholder="Xác nhận mật khẩu" style={inputStyle} />
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }} onClick={() => setAgreeTerms(!agreeTerms)}>
              {agreeTerms ? <CheckSquare size={16} color={colors.register} /> : <Square size={16} color="#6b7280" />}
              <span style={{ color: '#d1d5db' }}>Tôi đồng ý với <span style={{ color: colors.register }}>Điều khoản sử dụng</span></span>
            </div>

            <button onClick={handleAction} style={{ ...btnStyle, background: colors.register, boxShadow: `0 8px 24px ${colors.register}40`, marginTop: 8 }}>
              TẠO TÀI KHOẢN <ChevronRight size={18} />
            </button>

            {/* Level Up Banner */}
            <div style={{ marginTop: 16, background: 'rgba(16,185,129,0.05)', border: `1px solid ${colors.register}30`, borderRadius: 16, padding: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ background: 'rgba(16,185,129,0.1)', padding: 12, borderRadius: 12, color: colors.register, fontWeight: 900, textAlign: 'center', lineHeight: 1.1 }}>
                LEVEL<br/>UP!
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#e5e7eb', marginBottom: 4 }}>Tạo tài khoản để lên Level</div>
                <div style={{ fontSize: 11, color: '#9ca3af' }}>Nhận 50 XP khi đăng ký thành công!</div>
              </div>
              <Gift size={24} color="#fbbf24" />
            </div>
          </div>
        )}

        {/* WELCOME SCREEN */}
        {authState === 'WELCOME' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            
            {/* Hexagon Avatar */}
            <div style={{ position: 'relative', width: 120, height: 120, marginBottom: 40 }}>
              <div style={{ 
                position: 'absolute', inset: 0, 
                clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                background: `linear-gradient(135deg, ${colors.welcome}, #1e3a8a)`,
                padding: 4
              }}>
                <div style={{
                  width: '100%', height: '100%',
                  clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                  background: 'url("https://i.pravatar.cc/150?u=a042581f4e29026704d") center/cover'
                }} />
              </div>
              {/* Level Badge */}
              <div style={{
                position: 'absolute', bottom: -12, left: -12,
                width: 40, height: 40, background: '#1e3a8a', border: `2px solid ${colors.welcome}`,
                borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, fontWeight: 800, color: '#fff', boxShadow: `0 0 15px ${colors.welcome}80`
              }}>
                12
              </div>
            </div>

            {/* XP Bar */}
            <div style={{ width: '100%', marginBottom: 32 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 8, fontWeight: 600 }}>
                <span style={{ color: colors.welcome, letterSpacing: 1 }}>LEVEL</span>
                <span style={{ color: '#9ca3af' }}>1250 / 2000 XP</span>
              </div>
              <div style={{ width: '100%', height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: '62.5%', height: '100%', background: colors.welcome, boxShadow: `0 0 10px ${colors.welcome}` }} />
              </div>
            </div>

            {/* Feature List */}
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 32 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13, color: '#d1d5db' }}>
                <Settings size={18} color={colors.login} /> Quản lý máy trạm hiệu quả
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13, color: '#d1d5db' }}>
                <Award size={18} color={colors.login} /> Hoàn thành nhiệm vụ nhận XP
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13, color: '#d1d5db' }}>
                <Gift size={18} color={colors.login} /> Mở khóa thành tích và phần thưởng
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13, color: '#d1d5db' }}>
                <Trophy size={18} color={colors.login} /> Leo hạng bảng xếp hạng
              </div>
            </div>

            <button onClick={handleAction} style={{ ...btnStyle, background: colors.welcome, boxShadow: `0 8px 24px ${colors.welcome}40` }}>
              ĐĂNG NHẬP NGAY <ChevronRight size={18} />
            </button>
            <div style={{ marginTop: 16, fontSize: 13, color: '#9ca3af' }}>
              Chưa có tài khoản? <span style={{ color: colors.welcome, cursor: 'pointer' }} onClick={() => setAuthState('REGISTER')}>Đăng ký ngay</span>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%', 
  background: 'rgba(0,0,0,0.4)', 
  border: '1px solid rgba(255,255,255,0.1)', 
  color: '#fff', 
  padding: '16px 16px 16px 48px', 
  fontSize: 14, 
  borderRadius: 12,
  outline: 'none',
};

const btnStyle = {
  width: '100%', 
  padding: 16, 
  color: '#fff', 
  fontWeight: 'bold', 
  fontSize: 15, 
  border: 'none', 
  borderRadius: 12, 
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  transition: 'transform 0.1s'
};

function FactoryIcon({ color }: { color: string }) {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/>
      <path d="M17 18h1"/>
      <path d="M12 18h1"/>
      <path d="M7 18h1"/>
    </svg>
  )
}
