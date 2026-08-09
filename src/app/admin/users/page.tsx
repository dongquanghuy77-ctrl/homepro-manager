'use client';

import { useState, useEffect } from 'react';
import { Users, UserPlus, Shield, CheckCircle, XCircle, Trash2, Key, Lock, AlertCircle, RefreshCw } from 'lucide-react';

interface UserItem {
  id: number;
  username: string;
  name: string;
  position?: string;
  birthDate?: string;
  role: 'ADMIN' | 'MANAGER' | 'SUPERVISOR' | 'WORKER' | 'VIEWER';
  phone?: string;
  active: boolean;
  createdAt: string;
}

const ROLE_CONFIG = {
  ADMIN: { label: '👑 Admin (Quản trị)', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.15)' },
  MANAGER: { label: '👔 Manager (Quản lý xưởng)', color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.15)' },
  SUPERVISOR: { label: '👷 Supervisor (Giám sát công trình)', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.15)' },
  WORKER: { label: '🛠️ Worker (Công nhân thi công)', color: '#10B981', bg: 'rgba(16, 185, 129, 0.15)' },
  VIEWER: { label: '👁️ Viewer (Ban Giám Đốc)', color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.15)' },
};

export default function UserManagementPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // New user form state
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    name: '',
    position: '',
    birthDate: '',
    role: 'SUPERVISOR' as const,
    phone: '',
  });

  async function loadUsers() {
    setLoading(true);
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      if (res.ok) {
        setUsers(data);
      }
    } catch (err) {
      console.error('Load users error:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Không thể tạo tài khoản');

      setSuccess(`Đã tạo tài khoản thành công cho ${data.name} (${data.role})`);
      setShowAddModal(false);
      setFormData({ username: '', password: '', name: '', position: '', birthDate: '', role: 'SUPERVISOR', phone: '' });
      loadUsers();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleToggleActive(user: UserItem) {
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !user.active }),
      });
      if (res.ok) {
        setSuccess(`Đã ${user.active ? 'khóa' : 'kích hoạt lại'} tài khoản ${user.name}`);
        loadUsers();
      }
    } catch (err) {
      console.error('Toggle active error:', err);
    }
  }

  async function handleResetPassword(user: UserItem) {
    const newPass = prompt(`Nhập mật khẩu mới cho tài khoản ${user.name} (${user.username}):`, '123456');
    if (!newPass || !newPass.trim()) return;

    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPass.trim() }),
      });

      if (res.ok) {
        setSuccess(`🔑 Đã cấp mật khẩu mới "${newPass.trim()}" cho tài khoản ${user.name} (${user.username}). Vui lòng bàn giao mật khẩu này cho nhân viên.`);
        loadUsers();
      } else {
        throw new Error('Lỗi đặt lại mật khẩu');
      }
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleDeleteUser(id: number, name: string) {
    if (!confirm(`Bạn có chắc chắn muốn XÓA tài khoản ${name}?`)) return;

    try {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSuccess(`Đã xóa tài khoản ${name}`);
        loadUsers();
      }
    } catch (err) {
      console.error('Delete user error:', err);
    }
  }

  async function handleSwitchRole(targetUsername: string) {
    try {
      const res = await fetch('/api/auth/switch-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUsername }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi khi chuyển đổi vai trò');
      if (data.user.role === 'WORKER') {
        window.location.href = '/nhan-vien';
      } else {
        window.location.href = '/';
      }
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Shield className="text-primary" size={24} />
            Quản lý Người dùng & Phân quyền
          </h1>
          <p className="page-subtitle">
            Phân quyền 5 cấp độ: Admin, Manager, Giám sát công trình (Supervisor), Thợ (Worker), và Viewer.
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setShowAddModal(true)}
        >
          <UserPlus size={16} /> Thêm tài khoản mới
        </button>
      </div>

      {/* Status Alerts */}
      {success && <div className="alert alert-success mb-6">{success}</div>}
      {error && <div className="alert alert-danger mb-6">{error}</div>}

      {/* Admin Quick Role Switcher Card */}
      <div className="card mb-6" style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
        <div className="card-header" style={{ paddingBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>⚡</span>
            <div>
              <div className="card-title" style={{ fontSize: 15, color: '#38BDF8' }}>Công cụ Admin: Chuyển đổi nhanh Góc nhìn Vai trò</div>
              <div className="card-subtitle" style={{ fontSize: 12 }}>Bấm vào để xem và trải nghiệm hệ thống dưới góc nhìn thực tế của từng vị trí</div>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10, marginTop: 8 }}>
          <button
            className="btn btn-secondary"
            style={{ justifyContent: 'flex-start', background: 'rgba(239, 68, 68, 0.15)', borderColor: 'rgba(239, 68, 68, 0.3)', color: '#FCA5A5' }}
            onClick={() => handleSwitchRole('huy.dong')}
          >
            <span>👑 Admin (HUY)</span>
          </button>
          <button
            className="btn btn-secondary"
            style={{ justifyContent: 'flex-start', background: 'rgba(59, 130, 246, 0.15)', borderColor: 'rgba(59, 130, 246, 0.3)', color: '#93C5FD' }}
            onClick={() => handleSwitchRole('quan.mai')}
          >
            <span>👔 Manager (QUÂN)</span>
          </button>
          <button
            className="btn btn-secondary"
            style={{ justifyContent: 'flex-start', background: 'rgba(245, 158, 11, 0.15)', borderColor: 'rgba(245, 158, 11, 0.3)', color: '#FDE68A' }}
            onClick={() => handleSwitchRole('duy.le')}
          >
            <span>👷 Supervisor (DUY)</span>
          </button>
          <button
            className="btn btn-secondary"
            style={{ justifyContent: 'flex-start', background: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.3)', color: '#A7F3D0' }}
            onClick={() => handleSwitchRole('phuc.tran')}
          >
            <span>🛠️ Worker (PHÚC)</span>
          </button>
          <button
            className="btn btn-secondary"
            style={{ justifyContent: 'flex-start', background: 'rgba(139, 92, 246, 0.15)', borderColor: 'rgba(139, 92, 246, 0.3)', color: '#DDD6FE' }}
            onClick={() => handleSwitchRole('viewer')}
          >
            <span>👁️ Viewer (BGĐ)</span>
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Danh sách tài khoản hệ thống ({users.length})</div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-muted">Đang tải danh sách tài khoản...</div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Mã / Tên đăng nhập</th>
                  <th>Họ và tên</th>
                  <th>Chức vụ thực tế</th>
                  <th>Ngày sinh</th>
                  <th>Vai trò hệ thống</th>
                  <th>Trạng thái</th>
                  <th style={{ textAlign: 'right' }}>Thao tác Admin</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const cfg = ROLE_CONFIG[u.role] || ROLE_CONFIG.WORKER;
                  return (
                    <tr key={u.id}>
                      <td style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
                        {u.username}
                      </td>
                      <td style={{ fontWeight: 600 }}>{u.name}</td>
                      <td>{u.position || '—'}</td>
                      <td style={{ fontSize: 13, fontWeight: 600, color: '#F59E0B' }}>
                        {u.birthDate ? `🎂 ${u.birthDate}` : '—'}
                      </td>
                      <td>
                        <span
                          className="badge"
                          style={{ color: cfg.color, background: cfg.bg, fontWeight: 700 }}
                        >
                          {cfg.label}
                        </span>
                      </td>
                      <td>{u.phone || '—'}</td>
                      <td>
                        {u.active ? (
                          <span className="badge badge-success">Đang hoạt động</span>
                        ) : (
                          <span className="badge badge-danger">Đã khóa</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="flex justify-end gap-2">
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleResetPassword(u)}
                            title="Reset mật khẩu về 123456"
                          >
                            <Key size={14} /> Reset MK
                          </button>

                          <button
                            className={`btn btn-sm ${u.active ? 'btn-secondary' : 'btn-primary'}`}
                            onClick={() => handleToggleActive(u)}
                            title={u.active ? 'Tạm khóa tài khoản' : 'Kích hoạt lại'}
                          >
                            {u.active ? <XCircle size={14} /> : <CheckCircle size={14} />}
                            {u.active ? 'Khóa' : 'Mở'}
                          </button>

                          {u.username !== 'admin' && (
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => handleDeleteUser(u.id, u.name)}
                              title="Xóa tài khoản"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="modal-backdrop">
          <div className="modal" style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <div className="modal-title">Thêm người dùng mới</div>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>×</button>
            </div>

            <form onSubmit={handleAddUser} className="modal-body">
              <div className="form-group mb-4">
                <label className="form-label">Tên đăng nhập / Mã NV *</label>
                <input
                  className="form-input"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="vd: gs_minh, thotruong01"
                  required
                />
              </div>

              <div className="form-group mb-4">
                <label className="form-label">Mật khẩu ban đầu *</label>
                <input
                  type="password"
                  className="form-input"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Nhập mật khẩu (vd: 123456)"
                  required
                />
              </div>

              <div className="form-group mb-4">
                <label className="form-label">Họ và tên *</label>
                <input
                  className="form-input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="vd: NGUYỄN VĂN CƯỜNG"
                  required
                />
              </div>

              <div className="grid-2 mb-4">
                <div className="form-group">
                  <label className="form-label">Chức vụ thực tế</label>
                  <input
                    className="form-input"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    placeholder="vd: Kỹ thuật, Công nhân..."
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Ngày sinh (DD/MM/YYYY)</label>
                  <input
                    className="form-input"
                    value={formData.birthDate}
                    onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                    placeholder="vd: 20/04/1990"
                  />
                </div>
              </div>

              <div className="form-group mb-4">
                <label className="form-label">Vai trò (Role) *</label>
                <select
                  className="form-select"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                >
                  <option value="SUPERVISOR">👷 Giám sát công trình (Supervisor)</option>
                  <option value="MANAGER">👔 Quản lý xưởng (Manager)</option>
                  <option value="WORKER">🛠️ Công nhân thi công (Worker)</option>
                  <option value="VIEWER">👁️ Ban Giám Đốc (Viewer)</option>
                  <option value="ADMIN">👑 Quản trị viên (Admin)</option>
                </select>
              </div>

              <div className="form-group mb-4">
                <label className="form-label">Số điện thoại</label>
                <input
                  className="form-input"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="0912345678"
                />
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAddModal(false)}
                >
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary">
                  Tạo tài khoản
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
