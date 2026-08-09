'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogIn, Shield, User, Lock, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDemo, setShowDemo] = useState(false);

  const demoAccounts = [
    { role: 'Quản trị viên', user: 'admin', pass: 'admin123', badge: '👑 Admin', desc: 'Toàn quyền hệ thống & phân quyền' },
    { role: 'Quản lý xưởng', user: 'manager', pass: 'manager123', badge: '👔 Manager', desc: 'Dự án, công việc, duyệt vật tư' },
    { role: 'Giám sát công trình', user: 'supervisor', pass: 'sup123', badge: '👷 Supervisor', desc: 'Nhật ký, chấm công thợ, tiến độ, đề xuất vật tư' },
    { role: 'Công nhân thi công', user: 'worker', pass: 'worker123', badge: '🛠️ Worker', desc: 'Báo cáo hàng ngày trên mobile' },
    { role: 'Ban Giám Đốc / Xem', user: 'viewer', pass: 'viewer123', badge: '👁️ Viewer', desc: 'Xem tiến độ & báo cáo read-only' },
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
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu"
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
          marginTop: 20,
          padding: '10px 12px',
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

        {/* Collapsible Demo Account Selector */}
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #1E293B' }}>
          <button
            type="button"
            onClick={() => setShowDemo(!showDemo)}
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              color: '#64748B',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <span>⚡ Tài khoản mẫu kiểm thử</span>
            <span>{showDemo ? '▲' : '▼'}</span>
          </button>

          {showDemo && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
              {demoAccounts.map((acc) => (
                <button
                  key={acc.user}
                  type="button"
                  onClick={() => fillAccount(acc.user, acc.pass)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: 8,
                    background: username === acc.user ? 'rgba(59, 130, 246, 0.2)' : '#1E293B',
                    border: username === acc.user ? '1px solid #3B82F6' : '1px solid transparent',
                    color: '#E2E8F0',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#F1F5F9' }}>{acc.badge}</div>
                    <div style={{ fontSize: 11, color: '#94A3B8' }}>{acc.desc}</div>
                  </div>
                  <div style={{ fontSize: 11, color: '#38BDF8', fontWeight: 600 }}>
                    {acc.user}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
