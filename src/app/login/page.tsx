'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogIn, Shield, User, Lock, AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDemo, setShowDemo] = useState(false);

  const demoAccounts = [
    { role: 'Quản trị viên', user: 'huy.dong', pass: '123456', badge: '👑 Admin (ĐỒNG QUANG HUY)', desc: 'Toàn quyền hệ thống & phân quyền' },
    { role: 'Quản lý xưởng', user: 'quan.mai', pass: '123456', badge: '👔 Manager (MAI QUỐC QUÂN)', desc: 'Dự án, công việc, duyệt vật tư' },
    { role: 'Giám sát công trình', user: 'duy.le', pass: '123456', badge: '👷 Supervisor (LÊ TRUNG DUY)', desc: 'Nhật ký, chấm công thợ, tiến độ, đề xuất vật tư' },
    { role: 'Công nhân thi công', user: 'phuc.tran', pass: '123456', badge: '🛠️ Worker (TRẦN THANH PHÚC)', desc: 'Báo cáo hàng ngày trên mobile' },
    { role: 'Ban Giám Đốc / Xem', user: 'viewer', pass: '123456', badge: '👁️ Viewer (Ban Giám Đốc)', desc: 'Xem tiến độ & báo cáo read-only' },
  ];

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!username || !password) {
      setError('Vui lòng nhập Tên đăng nhập và Mật khẩu');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Đăng nhập thất bại');
      }

      // Redirect based on role
      if (data.user.role === 'WORKER') {
        router.push('/nhan-vien');
      } else {
        router.push('/');
      }
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Lỗi kết nối máy chủ');
    } finally {
      setLoading(false);
    }
  }

  function fillAccount(user: string, pass: string) {
    setUsername(user);
    setPassword(pass);
    setError('');
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #090D16 0%, #0F172A 50%, #1E293B 100%)',
      padding: '24px 16px',
    }}>
      <div style={{
        width: '100%',
        maxWidth: 440,
        background: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: 20,
        padding: '32px 28px',
        boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 56,
            height: 56,
            borderRadius: 16,
            background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
            boxShadow: '0 8px 24px rgba(59, 130, 246, 0.4)',
            marginBottom: 12,
          }}>
            <Shield size={28} color="#fff" />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#F8FAFC', margin: 0 }}>HomePro Manager</h1>
          <p style={{ fontSize: 13, color: '#94A3B8', marginTop: 4 }}>Phần mềm quản lý xưởng nội thất & công trình</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 14px',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 10,
            color: '#FCA5A5',
            fontSize: 13,
            marginBottom: 20,
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#CBD5E1', marginBottom: 6 }}>
              Tên đăng nhập / Mã NV
            </label>
            <div style={{ position: 'relative' }}>
              <User size={16} style={{ position: 'absolute', left: 12, top: 12, color: '#64748B' }} />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Nhập tên đăng nhập (vd: admin, supervisor...)"
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 38px',
                  background: '#0F172A',
                  border: '1px solid #334155',
                  borderRadius: 10,
                  color: '#F8FAFC',
                  fontSize: 14,
                  outline: 'none',
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#CBD5E1', marginBottom: 6 }}>
              Mật khẩu
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: 12, top: 12, color: '#64748B' }} />
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu"
                style={{
                  width: '100%',
                  padding: '10px 40px 10px 38px',
                  background: '#0F172A',
                  border: '1px solid #334155',
                  borderRadius: 10,
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
                  right: 12,
                  top: 11,
                  background: 'transparent',
                  border: 'none',
                  color: '#64748B',
                  cursor: 'pointer',
                  padding: 2,
                  display: 'flex',
                  alignItems: 'center',
                }}
                title={showPass ? 'Ẩn mật khẩu' : 'Xem mật khẩu'}
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: 10,
              background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
              color: '#fff',
              fontSize: 15,
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: '0 4px 16px rgba(59, 130, 246, 0.3)',
            }}
          >
            {loading ? <span className="spinner" /> : <LogIn size={18} />}
            <span>Đăng nhập hệ thống</span>
          </button>
        </form>

        {/* Forgotten Password Notice */}
        <div style={{
          marginTop: 24,
          padding: '12px 14px',
          background: 'rgba(255, 255, 255, 0.04)',
          borderRadius: 10,
          border: '1px solid rgba(255, 255, 255, 0.08)',
          fontSize: 12,
          color: '#94A3B8',
          textAlign: 'center',
          lineHeight: '1.5',
        }}>
          💡 <strong>Quên mật khẩu?</strong> Vui lòng liên hệ Admin hoặc Quản lý xưởng để được hỗ trợ cấp lại mật khẩu.
        </div>
      </div>
    </div>
  );
}
