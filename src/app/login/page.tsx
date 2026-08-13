'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { LogIn, Shield, User, Lock, AlertCircle, CheckCircle2, Eye, EyeOff, Mail, Phone, KeyRound } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState<string[]>(Array(6).fill(''));
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);

  // References for OTP fields to control focus programmatically
  const pinRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  const demoAccounts = [
    { role: 'Quản trị viên', user: 'huy.dong', pass: '123456', badge: '👑 Admin (ĐỒNG QUANG HUY)', desc: 'Toàn quyền hệ thống & phân quyền' },
    { role: 'Quản lý xưởng', user: 'quan.mai', pass: '123456', badge: '👔 Manager (MAI QUỐC QUÂN)', desc: 'Dự án, công việc, duyệt vật tư' },
    { role: 'Giám sát công trình', user: 'duy.le', pass: '123456', badge: '👷 Supervisor (LÊ TRUNG DUY)', desc: 'Nhật ký, chấm công thợ, tiến độ, đề xuất vật tư' },
    { role: 'Thợ (Đăng nhập PIN)', user: '0901234567', pin: '123456', badge: '🛠️ Worker PIN (TRẦN THANH PHÚC)', desc: 'Đăng nhập nhanh bằng số điện thoại + PIN 6 số' },
    { role: 'Ban Giám Đốc / Xem', user: 'viewer', pass: '123456', badge: '👁️ Viewer (Ban Giám Đốc)', desc: 'Xem tiến độ & báo cáo read-only' },
  ];

  // Tự động phân tích loại đăng nhập từ input của người dùng
  const cleanInput = identifier.trim();
  let authType: 'PASSWORD' | 'PIN' = 'PASSWORD';
  if (cleanInput.length > 0) {
    if (cleanInput.includes('@')) {
      authType = 'PASSWORD';
    } else if (/^\+?\d+$/.test(cleanInput.replace(/[\s\.-]/g, ''))) {
      authType = 'PIN';
    } else {
      authType = 'PASSWORD'; // Username thông thường -> Password
    }
  }

  // Sync OTP array when PIN gets modified directly (e.g. from demo accounts fill)
  const fullPinString = pin.join('');

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!cleanInput) {
      setError('Vui lòng nhập Email, Số điện thoại hoặc Tên đăng nhập');
      return;
    }

    let payload: any = { identifier: cleanInput };

    if (authType === 'PIN') {
      const pinCode = pin.join('');
      if (pinCode.length < 6) {
        setError('Vui lòng nhập đủ 6 chữ số mã PIN');
        return;
      }
      payload.pin = pinCode;
    } else {
      if (!password) {
        setError('Vui lòng nhập mật khẩu');
        return;
      }
      payload.password = password;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Đăng nhập thất bại');
      }

      // Điều hướng tới Attendance Gate (Server-side middleware sẽ chặn nếu bypass)
      router.push('/attendance-gate');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Lỗi kết nối máy chủ');
    } finally {
      setLoading(false);
    }
  }

  // Tự điền tài khoản thử nghiệm
  const fillAccount = (acc: typeof demoAccounts[0] & { pin?: string }) => {
    setIdentifier(acc.user);
    setError('');
    if (acc.pin) {
      setPin(acc.pin.split(''));
      setPassword('');
    } else {
      setPassword(acc.pass || '');
      setPin(Array(6).fill(''));
    }
  };

  // Điều khiển khi gõ mã PIN (auto focus ô tiếp theo)
  const handlePinChange = (value: string, index: number) => {
    // Chỉ nhận ký tự số
    const cleanVal = value.replace(/\D/g, '');
    if (!cleanVal) {
      const newPin = [...pin];
      newPin[index] = '';
      setPin(newPin);
      return;
    }

    // Nhận ký tự cuối cùng gõ vào
    const char = cleanVal[cleanVal.length - 1];
    const newPin = [...pin];
    newPin[index] = char;
    setPin(newPin);

    // Focus tiếp theo nếu không phải ô cuối
    if (index < 5) {
      pinRefs[index + 1].current?.focus();
    }
  };

  // Điều khiển khi nhấn xóa Backspace trong ô PIN
  const handlePinKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace') {
      if (!pin[index] && index > 0) {
        const newPin = [...pin];
        newPin[index - 1] = '';
        setPin(newPin);
        pinRefs[index - 1].current?.focus();
      }
    }
  };

  // Cho phép dán mã PIN 6 số
  const handlePinPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim().replace(/\D/g, '');
    if (pastedData.length >= 6) {
      const pinChars = pastedData.slice(0, 6).split('');
      setPin(pinChars);
      pinRefs[5].current?.focus();
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #090D16 0%, #0F172A 50%, #1E293B 100%)',
      padding: '24px 16px',
      fontFamily: '"Outfit", "Inter", sans-serif',
    }}>
      <div style={{
        width: '100%',
        maxWidth: 440,
        background: 'rgba(15, 23, 42, 0.8)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: 24,
        padding: '36px 32px',
        boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.7)',
        transition: 'all 0.3s ease',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 60,
            height: 60,
            borderRadius: 18,
            background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
            boxShadow: '0 8px 24px rgba(37, 99, 235, 0.3)',
            marginBottom: 16,
          }}>
            <Shield size={30} color="#fff" />
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#F8FAFC', margin: 0, letterSpacing: '-0.025em' }}>
            HomePro Manager
          </h1>
          <p style={{ fontSize: 13, color: '#94A3B8', marginTop: 6, fontWeight: 400 }}>
            Hệ thống quản lý nội thất & nhân sự xưởng
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
            padding: '12px 16px',
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            borderRadius: 12,
            color: '#FCA5A5',
            fontSize: 13,
            marginBottom: 24,
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
            <span style={{ lineHeight: '1.4' }}>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin}>
          {/* O nhap duy nhat ban dau */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#94A3B8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Email, SĐT hoặc Tên đăng nhập
            </label>
            <div style={{ position: 'relative' }}>
              {authType === 'PIN' ? (
                <Phone size={16} style={{ position: 'absolute', left: 14, top: 14, color: '#3B82F6' }} />
              ) : cleanInput.includes('@') ? (
                <Mail size={16} style={{ position: 'absolute', left: 14, top: 14, color: '#10B981' }} />
              ) : (
                <User size={16} style={{ position: 'absolute', left: 14, top: 14, color: '#64748B' }} />
              )}
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Nhập email, số điện thoại hoặc username"
                style={{
                  width: '100%',
                  padding: '12px 14px 12px 42px',
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: 12,
                  color: '#F8FAFC',
                  fontSize: 14,
                  outline: 'none',
                  transition: 'border-color 0.2s ease',
                }}
              />
            </div>
          </div>

          {/* Logic hien thi dong (Dynamic Inputs) */}
          {cleanInput.length > 0 && (
            authType === 'PIN' ? (
              // LUONG 1: PIN login cho Kho/San xuat (OTP style)
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#3B82F6', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Nhập mã PIN đăng nhập (6 số)
                </label>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  {pin.map((digit, index) => (
                    <input
                      key={index}
                      ref={pinRefs[index]}
                      type="text"
                      maxLength={6} // cho phep paste
                      pattern="[0-9]*"
                      inputMode="numeric"
                      value={digit}
                      onChange={(e) => handlePinChange(e.target.value, index)}
                      onKeyDown={(e) => handlePinKeyDown(e, index)}
                      onPaste={handlePinPaste}
                      style={{
                        width: '46px',
                        height: '48px',
                        background: 'rgba(15, 23, 42, 0.7)',
                        border: digit ? '2px solid #2563EB' : '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: 10,
                        color: '#F8FAFC',
                        fontSize: 20,
                        fontWeight: '700',
                        textAlign: 'center',
                        outline: 'none',
                        transition: 'all 0.15s ease',
                        boxShadow: digit ? '0 0 10px rgba(37, 99, 235, 0.25)' : 'none',
                      }}
                    />
                  ))}
                </div>
              </div>
            ) : (
              // LUONG 2: Password login cho Van phong/Admin
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#94A3B8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Mật khẩu tài khoản
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{ position: 'absolute', left: 14, top: 14, color: '#64748B' }} />
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Nhập mật khẩu"
                    style={{
                      width: '100%',
                      padding: '12px 42px 12px 42px',
                      background: 'rgba(15, 23, 42, 0.6)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: 12,
                      color: '#F8FAFC',
                      fontSize: 14,
                      outline: 'none',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    style={{
                      position: 'absolute',
                      right: 14,
                      top: 13,
                      background: 'transparent',
                      border: 'none',
                      color: '#64748B',
                      cursor: 'pointer',
                      padding: 2,
                    }}
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            )
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: 12,
              background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
              color: '#fff',
              fontSize: 15,
              fontWeight: 700,
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: '0 8px 24px rgba(37, 99, 235, 0.25)',
              transition: 'opacity 0.2s',
              opacity: loading ? 0.8 : 1,
            }}
          >
            {loading ? <span style={{ width: 16, height: 16, border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.6s linear infinite' }} /> : <LogIn size={18} />}
            <span>Đăng nhập hệ thống</span>
          </button>
        </form>

        {/* Demo Accounts Panel */}
        <div style={{ marginTop: 24 }}>
          <button
            type="button"
            onClick={() => setShowDemo(!showDemo)}
            style={{
              width: '100%',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              color: '#94A3B8',
              fontSize: 12,
              padding: '8px 12px',
              borderRadius: 8,
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            {showDemo ? '🙈 Ẩn tài khoản thử nghiệm' : '🔑 Hiện tài khoản thử nghiệm (Demo Accounts)'}
          </button>

          {showDemo && (
            <div style={{
              marginTop: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              maxHeight: 180,
              overflowY: 'auto',
              padding: 4,
              border: '1px solid rgba(255, 255, 255, 0.05)',
              borderRadius: 8,
              background: 'rgba(0,0,0,0.2)',
            }}>
              {demoAccounts.map((acc, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => fillAccount(acc)}
                  style={{
                    textAlign: 'left',
                    padding: '8px 10px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    borderRadius: 6,
                    color: '#CBD5E1',
                    fontSize: 11,
                    cursor: 'pointer',
                  }}
                >
                  <strong style={{ color: '#2563EB' }}>{acc.role}</strong>: {acc.badge}
                  <div style={{ color: '#64748B', fontSize: 10, marginTop: 2 }}>{acc.desc}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Forgotten Password Notice */}
        <div style={{
          marginTop: 20,
          textAlign: 'center'
        }}>
          <button
            type="button"
            onClick={() => setShowForgotModal(true)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#3B82F6',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            Quên Mật khẩu / mã PIN?
          </button>
        </div>

        {/* Footer info */}
        <div style={{
          marginTop: 20,
          padding: '12px 14px',
          background: 'rgba(255, 255, 255, 0.02)',
          borderRadius: 12,
          border: '1px solid rgba(255, 255, 255, 0.04)',
          fontSize: 12,
          color: '#64748B',
          textAlign: 'center',
          lineHeight: '1.5',
        }}>
          💡 <strong>Mẹo:</strong> Khối văn phòng đăng nhập bằng Email/Password. Khối sản xuất đăng nhập bằng SĐT/PIN 6 số.
        </div>
      </div>

      {showForgotModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(4px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16,
        }}>
          <div style={{
            background: '#0F172A',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 16,
            padding: '24px 28px',
            maxWidth: 400,
            width: '100%',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
            textAlign: 'center',
            fontFamily: '"Outfit", "Inter", sans-serif',
          }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 48,
              height: 48,
              borderRadius: 12,
              background: 'rgba(59, 130, 246, 0.1)',
              color: '#3B82F6',
              marginBottom: 16,
            }}>
              <KeyRound size={24} />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#F8FAFC', margin: '0 0 10px 0' }}>
              Quên Mật khẩu / PIN?
            </h3>
            <p style={{ fontSize: 14, color: '#94A3B8', margin: '0 0 20px 0', lineHeight: '1.5' }}>
              Vui lòng liên hệ bộ phận Hành chính Nhân sự (Hotline: <strong style={{ color: '#F8FAFC' }}>0905 123 456</strong>) để được cấp lại mã truy cập.
            </p>
            <button
              type="button"
              onClick={() => setShowForgotModal(false)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: 8,
                background: '#2563EB',
                color: '#fff',
                fontSize: 14,
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Đồng ý
            </button>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
