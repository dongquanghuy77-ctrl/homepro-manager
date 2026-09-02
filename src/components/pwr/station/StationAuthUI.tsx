'use client';

import React, { useState, useEffect } from 'react';
import { Mail, Lock, User, Phone, CheckSquare, Square, Trophy, Gift, Award, Settings, ChevronRight, Eye, QrCode, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { signIn, useSession, getSession } from 'next-auth/react';
import { QRCodeSVG } from 'qrcode.react';

type AuthState = 'LOGIN' | 'REGISTER' | 'REGISTER_SUCCESS' | 'WELCOME' | 'FORGOT';

export default function StationAuthUI() {
  const router = useRouter();
  const { data: session, update } = useSession();

  const getInitials = (name: string) => {
    if (!name) return '??';
    const words = name.trim().split(' ').filter(Boolean);
    if (words.length >= 2) return (words[0][0] + words[words.length - 1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const [userProfile, setUserProfile] = useState<{ id: number; name: string; role: string; username: string; phone: string | null } | null>(null);
  const [authState, setAuthState] = useState<AuthState>('LOGIN');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  
  // Register States
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [showTerms, setShowTerms] = useState(false);

  // Forgot Password States
  const [resetToken, setResetToken] = useState('');
  const [resetStatus, setResetStatus] = useState<'PENDING' | 'APPROVED' | 'EXPIRED' | ''>('');
  const [tempPin, setTempPin] = useState('');

  // Polling for forgot password
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resetToken && resetStatus !== 'APPROVED') {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/pwr/auth/forgot-password?token=${resetToken}`);
          const data = await res.json();
          if (data.status === 'APPROVED') {
            setResetStatus('APPROVED');
            setTempPin(data.tempPin);
            clearInterval(interval);
          } else if (data.status === 'EXPIRED') {
            setResetStatus('EXPIRED');
            clearInterval(interval);
          }
        } catch (e) {
          // ignore
        }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [resetToken, resetStatus]);

  const handleRequestReset = async () => {
    if (!phone) return;
    try {
      const res = await fetch('/api/pwr/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'REQUEST', phone })
      });
      const data = await res.json();
      if (data.token) {
        setResetToken(data.token);
        setResetStatus('PENDING');
      }
    } catch (e) {
      // error
    }
  };

  const colors = {
    login: '#a855f7', 
    loginBg: '#4c1d95',
    register: '#10b981', 
    welcome: '#3b82f6',
  };

  const currentGlow = authState === 'LOGIN' ? colors.login : authState === 'REGISTER' ? colors.register : colors.welcome;

  const handleAction = async () => {
    setAuthError('');
    setAuthSuccess('');
    if (authState === 'LOGIN') {
      if (!phone || !password) {
        setAuthError('Vui lòng nhập tài khoản và mật khẩu');
        return;
      }
      setIsSubmitting(true);
      const res = await signIn('credentials', {
        redirect: false,
        username: phone,
        password: password,
      });
      setIsSubmitting(false);
      
      if (res?.error) {
        setAuthError(`Lỗi: ${res.error} (Mã: ${res?.status})`);
      } else {
        // getSession() gọi thẳng /api/auth/session để lấy name thực từ DB
        const freshSession = await getSession();
        if (freshSession?.user?.name) {
          setUserProfile({
            id: 0,
            username: phone,
            name: freshSession.user.name,
            role: (freshSession.user as any)?.role || 'WORKER',
            phone: phone,
          });
        }
        setAuthState('WELCOME');
      }
    } else if (authState === 'REGISTER') {
      if (!regName || !regUsername || !regPassword) {
        setAuthError('Vui lòng điền các trường bắt buộc (Họ tên, SĐT/User, Mật khẩu)');
        return;
      }
      if (regPassword !== regConfirmPassword) {
        setAuthError('Mật khẩu xác nhận không khớp');
        return;
      }
      if (!agreeTerms) {
        setAuthError('Bạn phải đồng ý với Điều khoản sử dụng');
        return;
      }

      setIsSubmitting(true);
      try {
        const res = await fetch('/api/pwr/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: regName,
            email: regEmail,
            username: regUsername,
            password: regPassword
          })
        });
        const data = await res.json();
        if (data.error) {
          setAuthError(data.error);
          setIsSubmitting(false);
        } else {
          // Redirect to REGISTER_SUCCESS screen
          setPhone(regUsername); // Pre-fill username for later login
          setPassword('');
          
          // Clear register fields
          setRegName('');
          setRegEmail('');
          setRegUsername('');
          setRegPassword('');
          setRegConfirmPassword('');
          setAgreeTerms(false);
          
          setIsSubmitting(false);
          setAuthState('REGISTER_SUCCESS');
        }
      } catch (err) {
        setAuthError('Lỗi kết nối. Vui lòng thử lại.');
        setIsSubmitting(false);
      }
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
            {authError && <div style={{ color: '#ef4444', fontSize: 13, background: 'rgba(239,68,68,0.1)', padding: 10, borderRadius: 8, border: '1px solid rgba(239,68,68,0.2)' }}>{authError}</div>}
            {authSuccess && <div style={{ color: '#10b981', fontSize: 13, background: 'rgba(16,185,129,0.1)', padding: 10, borderRadius: 8, border: '1px solid rgba(16,185,129,0.2)' }}>{authSuccess}</div>}
            <div style={{ position: 'relative' }}>
              <Mail size={18} color="#9ca3af" style={{ position: 'absolute', left: 16, top: 16 }} />
              <input type="text" placeholder="Email hoặc số điện thoại" style={inputStyle} value={phone} onChange={e => setPhone(e.target.value)} />
            </div>
            <div style={{ position: 'relative' }}>
              <Lock size={18} color="#9ca3af" style={{ position: 'absolute', left: 16, top: 16 }} />
              <input type={showPassword ? "text" : "password"} placeholder="Mật khẩu" style={inputStyle} value={password} onChange={e => setPassword(e.target.value)} />
              <Eye size={18} color="#6b7280" style={{ position: 'absolute', right: 16, top: 16, cursor: 'pointer' }} onClick={() => setShowPassword(!showPassword)} />
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
              <span 
                style={{ color: colors.login, fontWeight: 500, cursor: 'pointer' }}
                onClick={() => setAuthState('FORGOT')}
              >
                Quên mật khẩu?
              </span>
            </div>
            
            <button onClick={handleAction} disabled={isSubmitting} style={{ ...btnStyle, background: `linear-gradient(90deg, ${colors.loginBg}, ${colors.login})`, boxShadow: `0 8px 25px rgba(168,85,247,0.4)` }}>
              {isSubmitting ? 'ĐANG ĐĂNG NHẬP...' : 'ĐĂNG NHẬP'} <ChevronRight size={20} strokeWidth={3} />
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
            {authError && <div style={{ color: '#ef4444', fontSize: 13, background: 'rgba(239,68,68,0.1)', padding: 10, borderRadius: 8 }}>{authError}</div>}
            <div style={{ position: 'relative' }}>
              <User size={18} color="#9ca3af" style={{ position: 'absolute', left: 16, top: 16 }} />
              <input type="text" placeholder="Họ và tên" style={inputStyle} value={regName} onChange={e => setRegName(e.target.value)} />
            </div>
            <div style={{ position: 'relative' }}>
              <Mail size={18} color="#9ca3af" style={{ position: 'absolute', left: 16, top: 16 }} />
              <input type="email" placeholder="Email" style={inputStyle} value={regEmail} onChange={e => setRegEmail(e.target.value)} />
            </div>
            <div style={{ position: 'relative' }}>
              <Phone size={18} color="#9ca3af" style={{ position: 'absolute', left: 16, top: 16 }} />
              <input type="text" placeholder="huy.dong" style={inputStyle} value={regUsername} onChange={e => setRegUsername(e.target.value)} />
            </div>
            <div style={{ position: 'relative' }}>
              <Lock size={18} color="#9ca3af" style={{ position: 'absolute', left: 16, top: 16 }} />
              <input type={showPassword ? "text" : "password"} placeholder="Mật khẩu" style={inputStyle} value={regPassword} onChange={e => setRegPassword(e.target.value)} />
              <Eye size={18} color="#6b7280" style={{ position: 'absolute', right: 16, top: 16, cursor: 'pointer' }} onClick={() => setShowPassword(!showPassword)} />
            </div>
            <div style={{ position: 'relative' }}>
              <Lock size={18} color="#9ca3af" style={{ position: 'absolute', left: 16, top: 16 }} />
              <input type={showPassword ? "text" : "password"} placeholder="Xác nhận mật khẩu" style={inputStyle} value={regConfirmPassword} onChange={e => setRegConfirmPassword(e.target.value)} />
              <Eye size={18} color="#6b7280" style={{ position: 'absolute', right: 16, top: 16, cursor: 'pointer' }} onClick={() => setShowPassword(!showPassword)} />
            </div>
            
            <div 
              style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', marginTop: 4, marginBottom: 8 }} 
              onClick={() => {
                if (!agreeTerms) {
                  setShowTerms(true); // Force open terms if not agreed
                } else {
                  setAgreeTerms(false); // Allow unchecking freely
                }
              }}
            >
              {agreeTerms ? (
                <div style={{ width: 18, height: 18, background: colors.register, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CheckSquare size={14} color="#fff" strokeWidth={3} />
                </div>
              ) : (
                <Square size={18} color="#6b7280" />
              )}
              <span style={{ color: '#e5e7eb', fontWeight: 500 }}>
                Tôi đồng ý với <span 
                  style={{ color: colors.register, cursor: 'pointer', textDecoration: 'underline' }}
                  onClick={(e) => { e.stopPropagation(); setShowTerms(true); }}
                >
                  Điều khoản sử dụng
                </span>
              </span>
            </div>

            <button 
              onClick={handleAction} 
              disabled={isSubmitting || !agreeTerms} 
              style={{ 
                ...btnStyle, 
                background: (!agreeTerms) ? '#374151' : `linear-gradient(90deg, #064e3b, ${colors.register})`, 
                boxShadow: (!agreeTerms) ? 'none' : `0 8px 25px rgba(16,185,129,0.4)`,
                color: (!agreeTerms) ? '#9ca3af' : '#fff',
                cursor: (!agreeTerms) ? 'not-allowed' : 'pointer'
              }}
            >
              {isSubmitting ? 'ĐANG TẠO...' : 'TẠO TÀI KHOẢN'} <ChevronRight size={20} strokeWidth={3} />
            </button>

            {/* Level Up Banner */}
            <div style={{ 
              marginTop: 16, background: 'rgba(5, 15, 12, 0.8)', border: `1px solid rgba(16,185,129,0.3)`, 
              borderRadius: 16, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 16, 
              boxShadow: 'inset 0 0 30px rgba(16,185,129,0.1), 0 8px 30px rgba(0,0,0,0.6)',
              position: 'relative', overflow: 'hidden'
            }}>
              
              {/* Outer Glow */}
              <div style={{ position: 'absolute', top: -30, left: -30, width: 100, height: 100, background: 'radial-gradient(circle, rgba(16,185,129,0.2) 0%, transparent 70%)', zIndex: 0 }} />

              {/* Glassy Octagon SVG */}
              <div style={{ position: 'relative', width: 64, height: 64, flexShrink: 0, zIndex: 1, filter: 'drop-shadow(0 0 8px rgba(16,185,129,0.5))' }}>
                <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
                  <polygon points="30,5 70,5 95,30 95,70 70,95 30,95 5,70 5,30" fill="rgba(6,78,59,0.8)" stroke="#34d399" strokeWidth="2.5" />
                  <polygon points="30,5 70,5 95,30 95,70 70,95 30,95 5,70 5,30" fill="url(#regOctoGrad)" opacity="0.6" />
                  <defs>
                    <linearGradient id="regOctoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
                      <stop offset="40%" stopColor="#ffffff" stopOpacity="0" />
                      <stop offset="100%" stopColor="#000000" stopOpacity="0.5" />
                    </linearGradient>
                  </defs>
                  <text x="50" y="44" fill="#34d399" fontSize="21" fontWeight="900" fontFamily="system-ui, sans-serif" textAnchor="middle" style={{ textShadow: '0 0 10px #34d399' }}>LEVEL</text>
                  <text x="50" y="72" fill="#34d399" fontSize="21" fontWeight="900" fontFamily="system-ui, sans-serif" textAnchor="middle" style={{ textShadow: '0 0 10px #34d399' }}>UP!</text>
                </svg>
              </div>

              {/* Content */}
              <div style={{ flex: 1, zIndex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#34d399', marginBottom: 6, textShadow: '0 0 10px rgba(52,211,153,0.3)' }}>
                  Tạo tài khoản để lên Level
                </div>
                <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 12 }}>
                  Nhận 50 XP khi đăng ký thành công!
                </div>
                {/* Glowing Progress Bar */}
                <div style={{ width: '100%', height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden', display: 'flex' }}>
                  <div style={{ 
                    width: '80%', height: '100%', 
                    background: `linear-gradient(90deg, #10b981 0%, #34d399 100%)`, 
                    borderRadius: 3,
                    boxShadow: '0 0 10px #34d399' 
                  }} />
                  <div style={{ width: '20%', height: '100%', background: '#78350f' }} />
                </div>
              </div>

              {/* Glowing Gift Icon */}
              <div style={{ flexShrink: 0, zIndex: 1, marginLeft: 4, filter: 'drop-shadow(0 0 8px rgba(245,158,11,0.6))' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="#fbbf24">
                  <rect x="4" y="9" width="16" height="4" rx="1" fill="#f59e0b" />
                  <rect x="5" y="13" width="14" height="9" rx="1" fill="#d97706" />
                  <path d="M12 9v13" stroke="#b45309" strokeWidth="2" />
                  <path d="M12 9c-2-3-5-3-5-1s3 3 5 1z" fill="#fcd34d" stroke="#b45309" strokeWidth="1.5" />
                  <path d="M12 9c2-3 5-3 5-1s-3 3-5 1z" fill="#fcd34d" stroke="#b45309" strokeWidth="1.5" />
                </svg>
              </div>

            </div>
          </div>
        )}

        {/* REGISTER SUCCESS SCREEN */}
        {authState === 'REGISTER_SUCCESS' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '20px 0' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24, boxShadow: '0 0 30px rgba(16,185,129,0.2)' }}>
              <CheckSquare size={40} color={colors.register} />
            </div>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: '#fff', marginBottom: 12 }}>Tạo Tài Khoản Thành Công!</h2>
            <p style={{ color: '#9ca3af', fontSize: 15, marginBottom: 32, lineHeight: 1.5 }}>
              Tài khoản của bạn đã được thiết lập thành công. Vui lòng đăng nhập để bắt đầu trải nghiệm hệ thống Trạm Làm Việc.
            </p>
            <button 
              onClick={() => {
                setAuthSuccess('Đăng ký thành công! Vui lòng đăng nhập.');
                setAuthState('LOGIN');
              }} 
              style={{ ...btnStyle, background: `linear-gradient(90deg, #064e3b, ${colors.register})`, boxShadow: `0 8px 25px rgba(16,185,129,0.4)` }}
            >
              ĐĂNG NHẬP NGAY <ChevronRight size={20} strokeWidth={3} />
            </button>
          </div>
        )}

                  {/* WELCOME / TEAM SELECTION SCREEN */}
          {authState === 'WELCOME' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ fontSize: 13, color: colors.welcome, fontWeight: 700, letterSpacing: 2, marginBottom: 8, textTransform: 'uppercase' }}>
                XÁC NHẬN TỔ ĐỘI
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 32, textAlign: 'center' }}>
                Chào mừng trở lại,<br/>{userProfile?.name || session?.user?.name || 'Đang tải...'}!
              </div>

              {/* Dynamic Avatar & Level (Simulated Real Data) */}
              <div style={{ position: 'relative', marginBottom: 40 }}>
                {/* Fallback Initials Avatar */}
                <div style={{ 
                  width: 100, height: 110, background: '#111', 
                  clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: `2px solid ${colors.welcome}`,
                  boxShadow: `0 0 30px ${colors.welcome}40`,
                  fontSize: 32, fontWeight: 800, color: colors.welcome
                }}>
                  {userProfile?.name ? getInitials(userProfile.name) : (userProfile?.role === 'PWR_ADMIN' || (!userProfile && phone === '0866903420')) ? 'AD' : '??'}
                </div>
                {/* Level Badge */}
                <div style={{
                  position: 'absolute', bottom: -10, left: -10,
                  width: 48, height: 48, background: '#1e3a8a', border: `3px solid ${colors.welcome}`,
                  borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20, fontWeight: 900, color: '#fff', boxShadow: `0 0 20px ${colors.welcome}`
                }}>
                  {(userProfile?.role === 'PWR_ADMIN' || (!userProfile && phone === '0866903420')) ? '99' : '1'}
                </div>
              </div>

              {/* XP Bar (Simulated Real Data) */}
              {(userProfile?.role !== 'PWR_ADMIN' && !((!userProfile) && phone === '0866903420')) && (
                <div style={{ width: '100%', marginBottom: 32 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8, fontWeight: 700 }}>
                    <span style={{ color: colors.welcome, letterSpacing: 2 }}>LEVEL</span>
                    <span style={{ color: '#d1d5db' }}>0 / 100 XP</span>
                  </div>
                  <div style={{ width: '100%', height: 8, background: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: '0%', height: '100%', background: colors.welcome, boxShadow: `0 0 15px ${colors.welcome}` }} />
                  </div>
                </div>
              )}

              {/* Role / Team Selection */}
              {(userProfile?.role === 'PWR_ADMIN' || (!userProfile && phone === '0866903420')) ? (
                <div style={{ width: '100%', padding: 20, background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: 16, marginBottom: 32, textAlign: 'center' }}>
                  <div style={{ color: '#ef4444', fontWeight: 800, fontSize: 18, marginBottom: 8 }}>VAI TRÒ QUẢN TRỊ VIÊN (ADMIN)</div>
                  <div style={{ fontSize: 13, color: '#fca5a5' }}>Bạn có toàn quyền truy cập hệ thống. Hãy chuyển đến Bảng điều khiển Quản trị.</div>
                </div>
              ) : (
                <div style={{ width: '100%', marginBottom: 32 }}>
                  <div style={{ fontSize: 14, color: '#9ca3af', marginBottom: 16, textAlign: 'center' }}>Vui lòng chọn Tổ Đội (Ca làm việc):</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {['Tổ Cắt', 'Tổ Dán', 'Tổ Khoan'].map((team) => (
                      <button 
                        key={team}
                        onClick={() => {
                          localStorage.setItem('pwr_selected_team', team);
                          router.push('/pwr/station/dashboard');
                        }}
                        style={{
                          width: '100%', padding: 16, borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)',
                          background: 'rgba(255,255,255,0.03)', color: '#fff', fontSize: 15, fontWeight: 600,
                          cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                        }}
                      >
                        {team} <ChevronRight size={18} color="#9ca3af" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button 
                onClick={() => {
                  if ((userProfile?.role === 'PWR_ADMIN' || (!userProfile && phone === '0866903420'))) {
                    router.push('/pwr');
                  } else {
                    const savedTeam = localStorage.getItem('pwr_selected_team');
                    if (savedTeam) {
                      router.push('/pwr/station/dashboard');
                    } else {
                      setAuthError('Vui lòng chọn 1 Tổ đội ở trên để tiếp tục!');
                    }
                  }
                }} 
                style={{ ...btnStyle, background: (userProfile?.role === 'PWR_ADMIN' || (!userProfile && phone === '0866903420')) ? 'linear-gradient(90deg, #991b1b, #ef4444)' : `linear-gradient(90deg, #1e3a8a, ${colors.welcome})`, boxShadow: (userProfile?.role === 'PWR_ADMIN' || (!userProfile && phone === '0866903420')) ? '0 8px 25px rgba(239,68,68,0.5)' : `0 8px 25px rgba(59,130,246,0.5)` }}
              >
                {(userProfile?.role === 'PWR_ADMIN' || (!userProfile && phone === '0866903420')) ? 'ĐẾN TRANG QUẢN TRỊ ADMIN' : 'VÀO TRẠM LÀM VIỆC'} <ChevronRight size={20} strokeWidth={3} />
              </button>
            </div>
          )}
{/* FORGOT PASSWORD SCREEN */}
        {authState === 'FORGOT' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ alignSelf: 'flex-start', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, color: '#9ca3af', marginBottom: 24, fontSize: 14 }} onClick={() => setAuthState('LOGIN')}>
              <ArrowLeft size={16} /> Quay lại đăng nhập
            </div>

            {resetStatus === '' && (
              <div style={{ width: '100%' }}>
                <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Khôi phục mật khẩu</div>
                <div style={{ fontSize: 13, color: '#aaa', marginBottom: 24 }}>Nhập số điện thoại để tạo mã QR duyệt từ Tổ trưởng.</div>
                
                <div style={{ position: 'relative', marginBottom: 20 }}>
                  <Phone size={18} color="#9ca3af" style={{ position: 'absolute', left: 16, top: 16 }} />
                  <input type="text" placeholder="Số điện thoại của bạn" style={inputStyle} value={phone} onChange={e => setPhone(e.target.value)} />
                </div>

                <button onClick={handleRequestReset} style={{ ...btnStyle, background: `linear-gradient(90deg, #10b981, #059669)`, boxShadow: `0 8px 25px rgba(16,185,129,0.3)` }}>
                  <QrCode size={20} /> TẠO MÃ QR
                </button>
              </div>
            )}

            {resetStatus === 'PENDING' && (
              <div style={{ width: '100%', textAlign: 'center', padding: '20px 0' }}>
                <div style={{ background: '#fff', padding: 16, borderRadius: 16, display: 'inline-block', marginBottom: 20 }}>
                  <QRCodeSVG 
                    value={`${typeof window !== 'undefined' ? window.location.origin : ''}/pwr/station/approve-reset?token=${resetToken}`}
                    size={200}
                  />
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#f59e0b', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                  </span>
                  Đang chờ Tổ trưởng duyệt...
                </div>
                <div style={{ fontSize: 13, color: '#aaa' }}>Vui lòng gọi Tổ trưởng ca đến quét mã QR này để cấp lại mã PIN cho bạn.</div>
              </div>
            )}

            {resetStatus === 'EXPIRED' && (
              <div style={{ width: '100%', textAlign: 'center', padding: '20px 0' }}>
                <div style={{ color: '#ef4444', fontSize: 16, fontWeight: 'bold', marginBottom: 8 }}>Mã QR đã hết hạn!</div>
                <button onClick={() => setResetStatus('')} style={{ ...btnStyle, background: '#333' }}>
                  TẠO LẠI MÃ MỚI
                </button>
              </div>
            )}

            {resetStatus === 'APPROVED' && (
              <div style={{ width: '100%', textAlign: 'center', padding: '20px 0' }}>
                <div style={{ width: 64, height: 64, background: 'rgba(16,185,129,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <CheckSquare size={32} color="#10b981" />
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#10b981', marginBottom: 8 }}>Yêu cầu đã được duyệt!</div>
                <div style={{ fontSize: 14, color: '#aaa', marginBottom: 20 }}>Mã PIN tạm thời của bạn là:</div>
                <div style={{ fontSize: 36, fontWeight: 900, letterSpacing: 4, background: '#111', padding: '12px 0', borderRadius: 12, border: '1px dashed #333', marginBottom: 24 }}>
                  {tempPin}
                </div>
                <button onClick={() => { setAuthState('LOGIN'); setResetStatus(''); }} style={{ ...btnStyle, background: `linear-gradient(90deg, #10b981, #059669)` }}>
                  ĐĂNG NHẬP NGAY
                </button>
              </div>
            )}
          </div>
        )}

      </div>
    </div>

    {/* TERMS OF USE MODAL */}
    {showTerms && (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 50,
        background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
      }}>
        <div style={{
          background: '#111', border: '1px solid #333', borderRadius: 24, padding: 32,
          maxWidth: 500, width: '100%', color: '#fff', maxHeight: '80vh', overflowY: 'auto'
        }}>
          <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 20, color: '#10b981' }}>Nội Quy & Điều Khoản Sử Dụng</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontSize: 14, color: '#d1d5db', lineHeight: 1.6 }}>
            <div>
              <strong style={{ color: '#fff' }}>1. Tính trung thực & Trách nhiệm cá nhân</strong><br/>
              Tài khoản này gắn liền với định danh, bảng chấm công và KPI của bạn. Nghiêm cấm mọi hành vi mượn tài khoản, thao tác hộ, hoặc khai báo khống khối lượng công việc.
            </div>
            
            <div>
              <strong style={{ color: '#fff' }}>2. Bảo mật Thông tin</strong><br/>
              Bạn tự chịu trách nhiệm bảo mật Mã PIN / Mật khẩu của mình. Mọi thao tác phát sinh từ tài khoản của bạn sẽ được tính là do chính bạn thực hiện.
            </div>

            <div>
              <strong style={{ color: '#fff' }}>3. Ý thức bảo vệ Thiết bị chung</strong><br/>
              iPad/Kiosk tại trạm làm việc là tài sản của công ty. Chỉ được phép sử dụng cho mục đích công việc. Cấm tuyệt đối việc sử dụng để giải trí, lướt web cá nhân, hoặc có hành vi cố tình phá hoại thiết bị.
            </div>

            <div>
              <strong style={{ color: '#fff' }}>4. Quy định về Điểm thưởng (Gamification)</strong><br/>
              Hệ thống Điểm kinh nghiệm (XP) và Cấp độ (Level) là công cụ đánh giá năng lực minh bạch. Điểm thưởng chỉ có hiệu lực sau khi Quản đốc duyệt. Mọi hành vi gian lận (spam XP) sẽ dẫn đến việc hủy toàn bộ điểm và xử lý kỷ luật.
            </div>
          </div>

          <button 
            onClick={() => {
              setAgreeTerms(true);
              setShowTerms(false);
            }}
            style={{ 
              width: '100%', padding: 16, marginTop: 24, background: '#10b981', color: '#fff', 
              fontWeight: 700, borderRadius: 12, border: 'none', cursor: 'pointer' 
            }}
          >
            TÔI ĐÃ HIỂU VÀ ĐỒNG Ý
          </button>
        </div>
      </div>
    )}
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
