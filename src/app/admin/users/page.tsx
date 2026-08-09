'use client';

import { useState, useEffect } from 'react';
import { Users, UserPlus, Shield, CheckCircle, XCircle, Trash2, Edit, Key, Lock } from 'lucide-react';

interface UserItem {
  id: number;
  username: string;
  name: string;
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
      setFormData({ username: '', password: '', name: '', role: 'SUPERVISOR', phone: '' });
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
      if (res.ok) loadUsers();
    } catch (err) {
      console.error('Toggle active error:', err);
    }
  }

  async function handleDeleteUser(id: number, name: string) {
    if (!confirm(`Bạn có chắc chắn muốn xóa tài khoản ${name}?`)) return;

    try {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
      if (res.ok) loadUsers();
    } catch (err) {
      console.error('Delete user error:', err);
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
                  <th>Vai trò (Role)</th>
                  <th>Số điện thoại</th>
                  <th>Trạng thái</th>
                  <th style={{ textAlign: 'right' }}>Thao tác</th>
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
                <label className="form-label">Mật khẩu *</label>
                <input
                  type="password"
                  className="form-input"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Nhập mật khẩu"
                  required
                />
              </div>

              <div className="form-group mb-4">
                <label className="form-label">Họ và tên *</label>
                <input
                  className="form-input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="vd: Nguyễn Văn Minh"
                  required
                />
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
