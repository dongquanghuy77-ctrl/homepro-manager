'use client';

import React, { useState } from 'react';
import { Mail, Lock, User, Phone, CheckSquare, Square, Trophy, Gift, Award, Settings, ChevronRight, Eye } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';

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
    <>
    {/* Fixed Background Image for Mobile Compatibility */}
    <div style={{
      position: 'fixed', inset: 0, zIndex: -2,
      background: '#05050a',
      backgroundImage: 'url("/pwr-assets/login-bg.png")',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    }} />
    {/* Darkening Overlay */}
    <div style={{
      position: 'fixed', inset: 0, zIndex: -1,
      background: 'linear-gradient(rgba(5, 5, 10, 0.3), rgba(5, 5, 10, 0.7))',
    }} />

    <div style={{ 
      minHeight: '100vh', 
      color: '#fff', 
      fontFamily: 'system-ui, -apple-system, sans-serif',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '40px 20px',
      overflowY: 'auto',
      position: 'relative',
      zIndex: 1
    }}>
      
      {/* Removed Header Text per user request */}

      {/* Main Card */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(168,85,247,0.22), rgba(88,28,135,0.12))',
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
                
                {/* Google */}
                <div style={octBorder} onClick={() => signIn('google')}>
                  <div style={octInner}>
                    <svg width="22" height="22" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.7 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
                  </div>
                </div>

                {/* Facebook */}
                <div style={octBorder} onClick={() => signIn('facebook')}>
                  <div style={octInner}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="#1877F2"><path d="M15.12 24v-9.52h3.19l.48-3.71h-3.67v-2.37c0-1.07.3-1.81 1.84-1.81h1.96V3.27c-.34-.05-1.5-.15-2.86-.15-2.83 0-4.76 1.73-4.76 4.9v2.75h-3.2v3.71h3.2V24h3.82z"/></svg>
                  </div>
                </div>

                {/* Apple */}
                <div style={octBorder} onClick={() => signIn('apple')}>
                  <div style={octInner}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff"><path d="M17.05 20.28c-.98.95-2.05 1.8-3.08 1.8-.95 0-1.28-.58-2.6-.58-1.32 0-1.7.55-2.6.55-1.02 0-2.18-.9-3.23-1.93-2.1-2.08-3.95-6.03-3.95-9.3 0-4.08 2.5-6.38 5.15-6.38 1.43 0 2.68.83 3.48.83.75 0 2.18-.95 3.75-.95 1.95.05 3.55.93 4.45 2.38-3.85 2.15-3.25 7.4.55 8.93-.85 2.05-1.85 4-2.92 4.65M12.03 4.45c.5-2.23 2.55-3.95 4.75-4.2-.4 2.45-2.7 4.5-5.1 4.38-.05-.05-.05-.13-.05-.18z"/></svg>
                  </div>
                </div>

                {/* Microsoft */}
                <div style={octBorder} onClick={() => signIn('azure-ad')}>
                  <div style={octInner}>
                    <svg width="20" height="20" viewBox="0 0 24 24"><path fill="#f25022" d="M1 1h10.5v10.5H1z"/><path fill="#7fba00" d="M12.5 1H23v10.5H12.5z"/><path fill="#00a4ef" d="M1 12.5h10.5V23H1z"/><path fill="#ffb900" d="M12.5 12.5H23V23H12.5z"/></svg>
                  </div>
                </div>

              </div>
            </div>

            {/* Gamification Banner */}
            <div style={{ marginTop: 24, background: 'rgba(15, 10, 25, 0.6)', border: `1px solid rgba(168,85,247,0.3)`, borderRadius: 16, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, boxShadow: 'inset 0 0 20px rgba(168,85,247,0.05), 0 4px 20px rgba(0,0,0,0.5)' }}>
              
              {/* Octagon Trophy Icon */}
              <div style={{
                width: 60, height: 60, flexShrink: 0,
                background: `linear-gradient(135deg, #a855f7, #4c1d95)`,
                clipPath: octagonClip,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: `0 0 15px rgba(168,85,247,0.5)`
              }}>
                <div style={{
                  width: 56, height: 56,
                  background: '#130c27',
                  clipPath: octagonClip,
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" style={{ filter: 'drop-shadow(0 4px 6px rgba(234,179,8,0.3))' }}>
                    <defs>
                      <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#fef08a" />
                        <stop offset="40%" stopColor="#eab308" />
                        <stop offset="100%" stopColor="#854d0e" />
                      </linearGradient>
                    </defs>
                    <path fill="url(#gold)" d="M21 4h-3V3c0-.55-.45-1-1-1H7c-.55 0-1 .45-1 1v1H3c-1.1 0-2 .9-2 2v3c0 2.41 1.73 4.43 4.02 4.9.43 1.89 1.83 3.4 3.73 4.04V20H5v2h14v-2h-3.75v-2.06c1.9-.64 3.3-2.15 3.73-4.04 2.29-.47 4.02-2.49 4.02-4.9V6c0-1.1-.9-2-2-2zm-16 4V6h1v4.82C4.33 10.3 3 8.78 3 8zm14.18 2.82H19V6h1v2c0 1.22-1.33 2.7-3.82 2.82z"/>
                    <path fill="#713f12" d="M12 7l1.22 2.47 2.73.4-1.98 1.93.47 2.72L12 13.25l-2.44 1.27.47-2.72-1.98-1.93 2.73-.4z"/>
                  </svg>
                </div>
              </div>

              {/* Content */}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#d8b4fe', marginBottom: 6, letterSpacing: 0.2 }}>
                  Hoàn thành nhiệm vụ để nhận XP
                </div>
                <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 12 }}>
                  Đăng nhập mỗi ngày để nhận thưởng!
                </div>
                {/* Internal Progress Bar */}
                <div style={{ width: '100%', height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ 
                    width: '70%', height: '100%', 
                    background: `linear-gradient(90deg, #7c3aed 0%, #c084fc 90%, #f3e8ff 100%)`, 
                    borderRadius: 3,
                    boxShadow: '0 0 10px #c084fc' 
                  }} />
                </div>
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
            <div style={{ marginTop: 16, background: 'rgba(15, 20, 15, 0.6)', border: `1px solid rgba(16,185,129,0.3)`, borderRadius: 16, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, boxShadow: 'inset 0 0 20px rgba(16,185,129,0.05), 0 4px 20px rgba(0,0,0,0.5)' }}>
              
              {/* Octagon Level Icon */}
              <div style={{
                width: 60, height: 60, flexShrink: 0,
                background: `linear-gradient(135deg, #10b981, #064e3b)`,
                clipPath: octagonClip,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: `0 0 15px rgba(16,185,129,0.5)`
              }}>
                <div style={{
                  width: 56, height: 56,
                  background: '#0a1711',
                  clipPath: octagonClip,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#10b981', fontWeight: 900, textAlign: 'center', lineHeight: 1.1,
                  textShadow: '0 2px 10px rgba(16,185,129,0.5)'
                }}>
                  LVL<br/>UP!
                </div>
              </div>

              {/* Content */}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#34d399', marginBottom: 6, letterSpacing: 0.2 }}>
                  Tạo tài khoản để lên Level
                </div>
                <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 12 }}>
                  Nhận ngay 50 XP khởi đầu!
                </div>
                {/* Internal Progress Bar */}
                <div style={{ width: '100%', height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ 
                    width: '30%', height: '100%', 
                    background: `linear-gradient(90deg, #10b981 0%, #34d399 90%, #d1fae5 100%)`, 
                    borderRadius: 3,
                    boxShadow: '0 0 10px #34d399' 
                  }} />
                </div>
              </div>
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
    </>
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

const octagonClip = "polygon(29% 0%, 71% 0%, 100% 29%, 100% 71%, 71% 100%, 29% 100%, 0% 71%, 0% 29%)";

const octBorder = {
  flex: 1, height: 56,
  background: 'linear-gradient(135deg, rgba(255,255,255,0.15), rgba(255,255,255,0.02))',
  clipPath: octagonClip,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer', transition: 'transform 0.15s'
};

const octInner = {
  width: 'calc(100% - 2px)', height: 'calc(100% - 2px)',
  background: '#0a0a12',
  clipPath: octagonClip,
  display: 'flex', alignItems: 'center', justifyContent: 'center'
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
