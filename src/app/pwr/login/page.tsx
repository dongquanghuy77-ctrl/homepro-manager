'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, User, ArrowRight } from 'lucide-react';

export default function PwrAdminLogin() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: username, password }),
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error || 'Tài khoản hoặc mật khẩu không chính xác.');
      } else {
        router.push('/pwr'); // Redirect to PWR Dashboard
      }
    } catch (err) {
      setError('Đã xảy ra lỗi kết nối, vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: 400, background: '#fff', padding: 40, borderRadius: 16, boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}>
        
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 64, height: 64, background: '#1e40af', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Lock color="#fff" size={32} />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: 0 }}>Quản Trị Hệ Thống</h1>
          <p style={{ color: '#6b7280', fontSize: 14, marginTop: 8 }}>Module Trạm Làm Việc (PWR)</p>
        </div>

        {error && (
          <div style={{ background: '#fef2f2', color: '#ef4444', padding: 12, borderRadius: 8, fontSize: 14, marginBottom: 20, border: '1px solid #fecaca' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Tên đăng nhập (SĐT)</label>
            <div style={{ position: 'relative' }}>
              <User size={18} color="#9ca3af" style={{ position: 'absolute', left: 12, top: 11 }} />
              <input 
                type="text" 
                value={username}
                onChange={e => setUsername(e.target.value)}
                style={{ width: '100%', padding: '10px 10px 10px 40px', borderRadius: 8, border: '1px solid #d1d5db', outline: 'none', fontSize: 15 }}
                placeholder="Nhập số điện thoại..."
              />
            </div>
          </div>
          
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Mật khẩu</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} color="#9ca3af" style={{ position: 'absolute', left: 12, top: 11 }} />
              <input 
                type="password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{ width: '100%', padding: '10px 10px 10px 40px', borderRadius: 8, border: '1px solid #d1d5db', outline: 'none', fontSize: 15 }}
                placeholder="Nhập mật khẩu..."
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={isLoading}
            style={{ 
              marginTop: 8, width: '100%', padding: 12, background: '#1e40af', color: '#fff', 
              border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 15, cursor: isLoading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.2s'
            }}
          >
            {isLoading ? 'ĐANG XỬ LÝ...' : 'ĐĂNG NHẬP'} {!isLoading && <ArrowRight size={18} />}
          </button>
        </form>
        
      </div>
    </div>
  );
}
