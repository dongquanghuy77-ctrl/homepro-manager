'use client';

import React, { useState } from 'react';
import { Mail, Lock, User, Phone, CheckSquare, Square, Trophy, Gift, Award, Settings, ChevronRight, Eye } from 'lucide-react';
import { useRouter } from 'next/navigation';

type AuthState = 'LOGIN' | 'REGISTER' | 'WELCOME';

export default function StationAuthUI() {
  const router = useRouter();
  const [authState, setAuthState] = useState<AuthState>('LOGIN');
  const [rememberMe, setRememberMe] = useState(true);
  const [agreeTerms, setAgreeTerms] = useState(false);

  const colors = {
    login: '#a855f7', 
    loginBg: '#4c1d95',
    register: '#10b981', 
    welcome: '#3b82f6',
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
      minHeight: '100vh', 
      background: '#05050a', 
      backgroundImage: 'url("https://www.transparenttextures.com/patterns/stardust.png"), radial-gradient(circle at top, #1a103c 0%, #05050a 100%)',
      color: '#fff', 
      fontFamily: 'system-ui, -apple-system, sans-serif',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start',
      padding: '40px 20px',
      overflowY: 'auto'
    }}>
      
      {/* Header text */}
      <div style={{ textAlign: 'center', marginBottom: 30 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 8px 0', color: '#a855f7', textShadow: '0 0 15px rgba(168, 85, 247, 0.6)', textTransform: 'uppercase', letterSpacing: 1 }}>
          Thẻ Đăng Ký, Đăng Nhập
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <div style={{ height: 1, width: 30, background: 'rgba(255,255,255,0.2)' }} />
          <span style={{ color: '#9ca3af', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase' }}>Trạm Làm Việc - Game Hóa</span>
          <div style={{ height: 1, width: 30, background: 'rgba(255,255,255,0.2)' }} />
        </div>
      </div>

      {/* Main Card */}
      <div style={{
        background: 'rgba(10, 10, 18, 0.8)',
        border: `1px solid ${currentGlow}60`,
        borderRadius: 24,
        padding: '32px 24px',
        width: '100%', maxWidth: 400,
        boxShadow: `0 0 50px ${currentGlow}30, inset 0 0 20px ${currentGlow}20`,
        backdropFilter: 'blur(20px)',
        transition: 'all 0.5s ease'
      }}>
        
        {/* Card Header & Icon */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ 
            width: 72, height: 72, margin: '0 auto 16px', borderRadius: 20,
            background: `rgba(255,255,255,0.02)`, border: `2px solid ${currentGlow}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 0 25px ${currentGlow}80, inset 0 0 15px ${currentGlow}50`
          }}>
            <FactoryIcon color={currentGlow} />
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 6px 0', letterSpacing: 0.5 }}>Trạm Làm Việc</h2>
          <p style={{ color: '#9ca3af', fontSize: 13, margin: 0 }}>
            {authState === 'LOGIN' ? 'Hệ thống điều khiển máy trạm' : 
             authState === 'REGISTER' ? 'Tạo tài khoản để bắt đầu' : 
             'Đăng nhập để tiếp tục hành trình'}
          </p>
        </div>

        {/* Tab Switcher */}
        {(authState === 'LOGIN' || authState === 'REGISTER') && (
          <div style={{ display: 'flex', background: 'rgba(0,0,0,0.5)', borderRadius: 14, padding: 4, marginBottom: 28, border: '1px solid rgba(255,255,255,0.05)' }}>
            <button 
              onClick={() => setAuthState('LOGIN')}
              style={{ flex: 1, padding: '12px 0', borderRadius: 12, border: 'none', 
                background: authState === 'LOGIN' ? `linear-gradient(180deg, rgba(168,85,247,0.2) 0%, rgba(76,29,149,0.4) 100%)` : 'transparent', 
                color: authState === 'LOGIN' ? '#fff' : '#6b7280', 
                fontWeight: authState === 'LOGIN' ? 700 : 500,
                boxShadow: authState === 'LOGIN' ? '0 2px 10px rgba(168,85,247,0.3)' : 'none',
                borderBottom: authState === 'LOGIN' ? `2px solid ${colors.login}` : '2px solid transparent',
                cursor: 'pointer', transition: 'all 0.2s'
              }}>Đăng nhập</button>
            <button 
              onClick={() => setAuthState('REGISTER')}
              style={{ flex: 1, padding: '12px 0', borderRadius: 12, border: 'none', 
                background: authState === 'REGISTER' ? `linear-gradient(180deg, rgba(16,185,129,0.2) 0%, rgba(6,78,59,0.4) 100%)` : 'transparent', 
                color: authState === 'REGISTER' ? '#fff' : '#6b7280', 
                fontWeight: authState === 'REGISTER' ? 700 : 500,
                boxShadow: authState === 'REGISTER' ? '0 2px 10px rgba(16,185,129,0.3)' : 'none',
                borderBottom: authState === 'REGISTER' ? `2px solid ${colors.register}` : '2px solid transparent',
                cursor: 'pointer', transition: 'all 0.2s'
              }}>Đăng ký</button>
          </div>
        )}

        {/* LOGIN FORM */}
        {authState === 'LOGIN' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ position: 'relative' }}>
              <Mail size={18} color="#9ca3af" style={{ position: 'absolute', left: 16, top: 16 }} />
              <input type="text" placeholder="Email hoặc số điện thoại" style={inputStyle} />
            </div>
            <div style={{ position: 'relative' }}>
              <Lock size={18} color="#9ca3af" style={{ position: 'absolute', left: 16, top: 16 }} />
              <input type="password" placeholder="Mật khẩu" style={inputStyle} />
              <Eye size={18} color="#6b7280" style={{ position: 'absolute', right: 16, top: 16, cursor: 'pointer' }} />
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, marginTop: 4, marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={() => setRememberMe(!rememberMe)}>
                {rememberMe ? (
                  <div style={{ width: 18, height: 18, background: colors.login, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CheckSquare size={14} color="#fff" strokeWidth={3} />
                  </div>
                ) : (
                  <Square size={18} color="#6b7280" />
                )}
                <span style={{ color: '#e5e7eb', fontWeight: 500 }}>Ghi nhớ đăng nhập</span>
              </div>
              <span style={{ color: colors.login, fontWeight: 500, cursor: 'pointer' }}>Quên mật khẩu?</span>
            </div>
            
            <button onClick={handleAction} style={{ ...btnStyle, background: `linear-gradient(90deg, ${colors.loginBg}, ${colors.login})`, boxShadow: `0 8px 25px rgba(168,85,247,0.4)` }}>
              ĐĂNG NHẬP <ChevronRight size={20} strokeWidth={3} />
            </button>

            {/* Social Logins */}
            <div style={{ marginTop: 24, textAlign: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
                <span style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1 }}>HOẶC ĐĂNG NHẬP VỚI</span>
                <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                {['G', 'f', '🍎', 'M'].map((icon, i) => (
                  <button key={i} style={{ 
                    flex: 1, height: 48, background: 'rgba(255,255,255,0.03)', 
                    border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 20, color: '#fff', cursor: 'pointer'
                  }}>
                    {i === 0 ? <img src="https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg" width={20} alt="G" /> :
                     i === 1 ? <span style={{ color: '#3b5998', fontWeight: 'bold', fontSize: 24 }}>f</span> :
                     i === 2 ? <span></span> :
                     <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, width: 16, height: 16 }}>
                       <div style={{ background: '#f25022' }}/><div style={{ background: '#7fba00' }}/>
                       <div style={{ background: '#00a4ef' }}/><div style={{ background: '#ffb900' }}/>
                     </div>}
                  </button>
                ))}
              </div>
            </div>

            {/* Gamification Banner */}
            <div style={{ marginTop: 24, background: 'rgba(10, 10, 18, 0.8)', border: `2px solid ${colors.login}60`, borderRadius: 16, padding: 16, display: 'flex', alignItems: 'center', gap: 16, position: 'relative', overflow: 'hidden', boxShadow: `0 0 20px ${colors.login}20` }}>
              <div style={{ position: 'absolute', bottom: 0, left: 0, height: 4, width: '100%', background: `linear-gradient(90deg, ${colors.login}, transparent)` }} />
              <div style={{ background: `linear-gradient(135deg, ${colors.login}, ${colors.loginBg})`, padding: 12, borderRadius: 12, border: `1px solid ${colors.login}`, boxShadow: `0 0 15px ${colors.login}80` }}>
                <Trophy size={24} color="#fbbf24" fill="#fbbf24" />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: colors.login, marginBottom: 4 }}>Hoàn thành nhiệm vụ để nhận XP</div>
                <div style={{ fontSize: 12, color: '#9ca3af' }}>Đăng nhập mỗi ngày để nhận thưởng!</div>
              </div>
            </div>
          </div>
        )}

        {/* REGISTER FORM */}
        {authState === 'REGISTER' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ position: 'relative' }}>
              <User size={18} color="#9ca3af" style={{ position: 'absolute', left: 16, top: 16 }} />
              <input type="text" placeholder="Họ và tên" style={inputStyle} />
            </div>
            <div style={{ position: 'relative' }}>
              <Mail size={18} color="#9ca3af" style={{ position: 'absolute', left: 16, top: 16 }} />
              <input type="email" placeholder="Email" style={inputStyle} />
            </div>
            <div style={{ position: 'relative' }}>
              <Phone size={18} color="#9ca3af" style={{ position: 'absolute', left: 16, top: 16 }} />
              <input type="text" placeholder="Số điện thoại (tùy chọn)" style={inputStyle} />
            </div>
            <div style={{ position: 'relative' }}>
              <Lock size={18} color="#9ca3af" style={{ position: 'absolute', left: 16, top: 16 }} />
              <input type="password" placeholder="Mật khẩu" style={inputStyle} />
              <Eye size={18} color="#6b7280" style={{ position: 'absolute', right: 16, top: 16, cursor: 'pointer' }} />
            </div>
            <div style={{ position: 'relative' }}>
              <Lock size={18} color="#9ca3af" style={{ position: 'absolute', left: 16, top: 16 }} />
              <input type="password" placeholder="Xác nhận mật khẩu" style={inputStyle} />
              <Eye size={18} color="#6b7280" style={{ position: 'absolute', right: 16, top: 16, cursor: 'pointer' }} />
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', marginTop: 4, marginBottom: 8 }} onClick={() => setAgreeTerms(!agreeTerms)}>
              {agreeTerms ? (
                <div style={{ width: 18, height: 18, background: colors.register, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CheckSquare size={14} color="#fff" strokeWidth={3} />
                </div>
              ) : (
                <Square size={18} color="#6b7280" />
              )}
              <span style={{ color: '#e5e7eb', fontWeight: 500 }}>Tôi đồng ý với <span style={{ color: colors.register }}>Điều khoản sử dụng</span></span>
            </div>

            <button onClick={handleAction} style={{ ...btnStyle, background: `linear-gradient(90deg, #064e3b, ${colors.register})`, boxShadow: `0 8px 25px rgba(16,185,129,0.4)` }}>
              TẠO TÀI KHOẢN <ChevronRight size={20} strokeWidth={3} />
            </button>

            {/* Level Up Banner */}
            <div style={{ marginTop: 16, background: 'rgba(10, 10, 18, 0.8)', border: `2px solid ${colors.register}60`, borderRadius: 16, padding: 16, display: 'flex', alignItems: 'center', gap: 16, position: 'relative', overflow: 'hidden', boxShadow: `0 0 20px ${colors.register}20` }}>
              <div style={{ position: 'absolute', bottom: 0, left: 0, height: 4, width: '100%', background: `linear-gradient(90deg, ${colors.register}, transparent)` }} />
              <div style={{ background: `linear-gradient(135deg, ${colors.register}, #064e3b)`, padding: '8px 12px', borderRadius: 12, border: `1px solid ${colors.register}`, color: '#fff', fontWeight: 900, textAlign: 'center', lineHeight: 1.1, boxShadow: `0 0 15px ${colors.register}80` }}>
                LEVEL<br/>UP!
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: colors.register, marginBottom: 4 }}>Tạo tài khoản để lên Level</div>
                <div style={{ fontSize: 12, color: '#9ca3af' }}>Nhận 50 XP khi đăng ký!</div>
              </div>
              <Gift size={24} color="#fbbf24" fill="#fbbf24" />
            </div>
          </div>
        )}

        {/* WELCOME SCREEN */}
        {authState === 'WELCOME' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            
            {/* Hexagon Avatar */}
            <div style={{ position: 'relative', width: 140, height: 140, marginBottom: 40 }}>
              <div style={{ 
                position: 'absolute', inset: 0, 
                clipPath: 'polygon(50% 0%, 93.3% 25%, 93.3% 75%, 50% 100%, 6.7% 75%, 6.7% 25%)',
                background: `linear-gradient(135deg, ${colors.welcome}, #1e3a8a, #a855f7)`,
                padding: 4,
                boxShadow: `0 0 30px ${colors.welcome}`
              }}>
                <div style={{
                  width: '100%', height: '100%',
                  clipPath: 'polygon(50% 0%, 93.3% 25%, 93.3% 75%, 50% 100%, 6.7% 75%, 6.7% 25%)',
                  background: 'url("https://i.pravatar.cc/150?u=a042581f4e29026704d") center/cover'
                }} />
              </div>
              {/* Level Badge */}
              <div style={{
                position: 'absolute', bottom: -10, left: -10,
                width: 48, height: 48, background: '#1e3a8a', border: `3px solid ${colors.welcome}`,
                borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, fontWeight: 900, color: '#fff', boxShadow: `0 0 20px ${colors.welcome}`
              }}>
                12
              </div>
            </div>

            {/* XP Bar */}
            <div style={{ width: '100%', marginBottom: 32 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8, fontWeight: 700 }}>
                <span style={{ color: colors.welcome, letterSpacing: 2 }}>LEVEL</span>
                <span style={{ color: '#d1d5db' }}>1250 / 2000 XP</span>
              </div>
              <div style={{ width: '100%', height: 8, background: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ width: '62.5%', height: '100%', background: colors.welcome, boxShadow: `0 0 15px ${colors.welcome}` }} />
              </div>
            </div>

            {/* Feature List */}
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 32 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 14, color: '#e5e7eb', fontWeight: 500 }}>
                <Settings size={20} color={colors.login} /> Quản lý máy trạm hiệu quả
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 14, color: '#e5e7eb', fontWeight: 500 }}>
                <Award size={20} color={colors.login} /> Hoàn thành nhiệm vụ nhận XP
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 14, color: '#e5e7eb', fontWeight: 500 }}>
                <Gift size={20} color={colors.login} /> Mở khóa thành tích và phần thưởng
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 14, color: '#e5e7eb', fontWeight: 500 }}>
                <Trophy size={20} color={colors.login} /> Leo hạng bảng xếp hạng
              </div>
            </div>

            <button onClick={handleAction} style={{ ...btnStyle, background: `linear-gradient(90deg, #1e3a8a, ${colors.welcome})`, boxShadow: `0 8px 25px rgba(59,130,246,0.5)` }}>
              ĐĂNG NHẬP NGAY <ChevronRight size={20} strokeWidth={3} />
            </button>
            <div style={{ marginTop: 24, fontSize: 14, color: '#9ca3af' }}>
              Chưa có tài khoản? <span style={{ color: colors.welcome, cursor: 'pointer', fontWeight: 600 }} onClick={() => setAuthState('REGISTER')}>Đăng ký ngay</span>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%', 
  background: 'rgba(20, 20, 28, 0.8)', 
  border: '1px solid rgba(255,255,255,0.08)', 
  color: '#fff', 
  padding: '16px 16px 16px 44px', 
  fontSize: 15, 
  borderRadius: 14,
  outline: 'none',
  boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.5)'
};

const btnStyle = {
  width: '100%', 
  padding: '16px', 
  color: '#fff', 
  fontWeight: '800', 
  fontSize: 16, 
  border: 'none', 
  borderRadius: 14, 
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
};

function FactoryIcon({ color }: { color: string }) {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/>
      <path d="M17 18h1"/>
      <path d="M12 18h1"/>
      <path d="M7 18h1"/>
    </svg>
  )
}
