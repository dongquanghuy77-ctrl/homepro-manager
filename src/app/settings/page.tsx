'use client';

import { useState, useEffect } from 'react';
import { Settings, Save, Building2, SaveIcon, CreditCard, CheckCircle2, ShieldCheck, KeyRound, Clock, Plus, Trash2, Calendar, AlertCircle } from 'lucide-react';

interface Delegation {
  id: number;
  delegatorId: number;
  delegateId: number;
  scope: string[];
  departmentIds: number[];
  startAt: string;
  endAt: string;
  reason: string | null;
  isActive: boolean;
  revokedAt: string | null;
  createdAt: string;
  delegateName: string;
  delegateCode: string | null;
}

interface Department {
  id: number;
  code: string;
  name: string;
}

interface Supervisor {
  id: number;
  name: string;
  employeeCode: string | null;
  role: string;
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'SYSTEM' | 'DELEGATION'>('DELEGATION');
  const [currentUser, setCurrentUser] = useState<{ id: number; role: string } | null>(null);

  // System Settings Form State
  const [systemData, setSystemData] = useState({
    company_name: 'XƯỞNG NỘI THẤT HOMEPRO',
    hotline: '0905 123 456',
    address: 'Khu công nghiệp / Xưởng thi công HomePro',
    bank_account: 'Vietcombank - 9999888866 - DONG QUANG HUY',
    min_stock_alert: '10',
  });
  const [systemLoading, setSystemLoading] = useState(true);
  const [systemSaving, setSystemSaving] = useState(false);
  const [systemSuccessMsg, setSystemSuccessMsg] = useState('');

  // Delegation States
  const [delegations, setDelegations] = useState<Delegation[]>([]);
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [delegationLoading, setDelegationLoading] = useState(false);

  // New Delegation Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedDelegateId, setSelectedDelegateId] = useState('');
  const [selectedDepts, setSelectedDepts] = useState<number[]>([]);
  const [selectedScopes, setSelectedScopes] = useState<string[]>(['APPROVE_ATTENDANCE']);
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [reason, setReason] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  useEffect(() => {
    loadUser();
  }, []);

  async function loadUser() {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (data && data.user) {
        setCurrentUser(data.user);
        // Default to SYSTEM settings if admin, else DELEGATION
        if (data.user.role === 'ADMIN') {
          setActiveTab('SYSTEM');
          loadSystemSettings();
        } else {
          setActiveTab('DELEGATION');
        }

        if (data.user.role === 'ADMIN' || data.user.role === 'MANAGER') {
          loadDelegationData();
        }
      }
    } catch (err) {
      console.error('Failed to load user info:', err);
    }
  }

  async function loadSystemSettings() {
    setSystemLoading(true);
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data && typeof data === 'object') {
        setSystemData((prev) => ({ ...prev, ...data }));
      }
    } catch (err) {
      console.error('Failed to load system settings:', err);
    } finally {
      setSystemLoading(false);
    }
  }

  async function loadDelegationData() {
    setDelegationLoading(true);
    try {
      // 1. Fetch current delegations
      const resDel = await fetch('/api/delegations');
      const dataDel = await resDel.json();
      if (Array.isArray(dataDel)) setDelegations(dataDel);

      // 2. Fetch accessible departments for delegation scope
      const resDept = await fetch('/api/me/accessible-departments');
      const dataDept = await resDept.json();
      if (Array.isArray(dataDept)) setDepartments(dataDept);

      // 3. Fetch supervisors list
      const resSup = await fetch('/api/hr/employees?role=SUPERVISOR');
      const dataSup = await resSup.json();
      if (Array.isArray(dataSup)) {
        setSupervisors(dataSup.filter((emp: any) => emp.active !== false));
      }
    } catch (err) {
      console.error('Failed to load delegation data:', err);
    } finally {
      setDelegationLoading(false);
    }
  }

  async function handleSystemSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSystemSaving(true);
    setSystemSuccessMsg('');

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(systemData),
      });
      if (res.ok) {
        setSystemSuccessMsg('⚙️ Đã lưu thông tin cấu hình xưởng thành công!');
        setTimeout(() => setSystemSuccessMsg(''), 3000);
      }
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setSystemSaving(false);
    }
  }

  async function handleCreateDelegation(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!selectedDelegateId) {
      setFormError('Vui lòng chọn người được ủy quyền (Tổ phó/Supervisor)');
      return;
    }
    if (selectedDepts.length === 0) {
      setFormError('Vui lòng chọn ít nhất một tổ/phòng ban để ủy quyền');
      return;
    }
    if (selectedScopes.length === 0) {
      setFormError('Vui lòng chọn ít nhất một quyền hạn ủy quyền');
      return;
    }
    if (!startAt || !endAt) {
      setFormError('Vui lòng chọn đầy đủ thời gian bắt đầu và kết thúc');
      return;
    }
    if (new Date(startAt) >= new Date(endAt)) {
      setFormError('Thời gian kết thúc phải sau thời gian bắt đầu');
      return;
    }

    setDelegationLoading(true);
    try {
      const res = await fetch('/api/delegations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          delegateId: parseInt(selectedDelegateId, 10),
          scope: selectedScopes,
          departmentIds: selectedDepts,
          startAt: new Date(startAt).toISOString(),
          endAt: new Date(endAt).toISOString(),
          reason,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Tạo ủy quyền thất bại');

      setFormSuccess('🔑 Đã tạo ủy quyền duyệt công thành công!');
      // Reset form
      setSelectedDelegateId('');
      setSelectedDepts([]);
      setSelectedScopes(['APPROVE_ATTENDANCE']);
      setStartAt('');
      setEndAt('');
      setReason('');
      setShowAddForm(false);

      // Reload list
      loadDelegationData();
    } catch (err: any) {
      setFormError(err.message || 'Lỗi không xác định');
    } finally {
      setDelegationLoading(false);
    }
  }

  async function handleRevokeDelegation(id: number) {
    if (!confirm('Bạn có chắc chắn muốn thu hồi ủy quyền này sớm hơn thời hạn?')) return;
    setDelegationLoading(true);
    try {
      const res = await fetch(`/api/delegations?id=${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Thu hồi thất bại');
      }
      loadDelegationData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setDelegationLoading(false);
    }
  }

  const handleDeptCheckbox = (deptId: number, checked: boolean) => {
    if (checked) {
      setSelectedDepts([...selectedDepts, deptId]);
    } else {
      setSelectedDepts(selectedDepts.filter((id) => id !== deptId));
    }
  };

  const handleScopeCheckbox = (scopeName: string, checked: boolean) => {
    if (checked) {
      setSelectedScopes([...selectedScopes, scopeName]);
    } else {
      setSelectedScopes(selectedScopes.filter((s) => s !== scopeName));
    }
  };

  const getScopeLabel = (scope: string) => {
    switch (scope) {
      case 'APPROVE_ATTENDANCE': return 'Duyệt chấm công';
      case 'APPROVE_LEAVE': return 'Duyệt phép nghỉ';
      case 'APPROVE_OT': return 'Duyệt tăng ca';
      case 'VIEW_TEAM_PAYROLL': return 'Xem bảng lương tổ';
      default: return scope;
    }
  };

  const isManagerOrAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER';

  return (
    <div className="page-container" style={{ maxWidth: 900 }}>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Settings className="text-primary" size={24} />
            Cấu hình & Thiết lập tài khoản
          </h1>
          <p className="page-subtitle">
            Quản lý cấu hình xưởng sản xuất và thiết lập ủy quyền duyệt công tạm thời cho cấp dưới.
          </p>
        </div>
      </div>

      {/* Navigation tabs */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        marginBottom: 24,
        gap: 16
      }}>
        {currentUser?.role === 'ADMIN' && (
          <button
            onClick={() => setActiveTab('SYSTEM')}
            style={{
              padding: '12px 8px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'SYSTEM' ? '2px solid var(--color-primary, #3B82F6)' : 'none',
              color: activeTab === 'SYSTEM' ? 'var(--color-primary, #3B82F6)' : '#64748B',
              fontWeight: 600,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            ⚙️ Cấu hình Hệ thống
          </button>
        )}
        {isManagerOrAdmin && (
          <button
            onClick={() => setActiveTab('DELEGATION')}
            style={{
              padding: '12px 8px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'DELEGATION' ? '2px solid var(--color-primary, #3B82F6)' : 'none',
              color: activeTab === 'DELEGATION' ? 'var(--color-primary, #3B82F6)' : '#64748B',
              fontWeight: 600,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            🔑 Ủy quyền duyệt công
          </button>
        )}
      </div>

      {/* TAB 1: SYSTEM SETTINGS */}
      {activeTab === 'SYSTEM' && currentUser?.role === 'ADMIN' && (
        <>
          {systemSuccessMsg && (
            <div className="alert alert-success mb-6 flex items-center gap-2">
              <CheckCircle2 size={18} />
              {systemSuccessMsg}
            </div>
          )}

          {systemLoading ? (
            <div className="p-6 text-center text-muted">Đang tải cấu hình hệ thống...</div>
          ) : (
            <form onSubmit={handleSystemSubmit}>
              <div className="card mb-6">
                <div className="card-header">
                  <div className="card-title flex items-center gap-2">
                    <Building2 size={18} className="text-primary" />
                    Thông tin Doanh nghiệp / Xưởng Nội Thất
                  </div>
                </div>

                <div className="card-body">
                  <div className="form-group mb-4">
                    <label className="form-label">Tên Xưởng / Thương Hiệu *</label>
                    <input
                      className="form-input"
                      value={systemData.company_name}
                      onChange={(e) => setSystemData({ ...systemData, company_name: e.target.value })}
                      placeholder="vd: XƯỞNG NỘI THẤT HOMEPRO"
                      required
                    />
                  </div>

                  <div className="grid-2 mb-4">
                    <div className="form-group">
                      <label className="form-label">Số Điện Thoại Hotline / Zalo *</label>
                      <input
                        className="form-input"
                        value={systemData.hotline}
                        onChange={(e) => setSystemData({ ...systemData, hotline: e.target.value })}
                        placeholder="vd: 0905 123 456"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Định mức Tồn kho Tối thiểu (Cảnh báo)</label>
                      <input
                        type="number"
                        className="form-input"
                        value={systemData.min_stock_alert}
                        onChange={(e) => setSystemData({ ...systemData, min_stock_alert: e.target.value })}
                        placeholder="vd: 10"
                      />
                    </div>
                  </div>

                  <div className="form-group mb-4">
                    <label className="form-label">Địa chỉ Xưởng Thi Công / Văn Phòng</label>
                    <input
                      className="form-input"
                      value={systemData.address}
                      onChange={(e) => setSystemData({ ...systemData, address: e.target.value })}
                      placeholder="vd: Đường số 3, KCN Tân Bình, TPHCM"
                    />
                  </div>

                  <div className="form-group mb-4">
                    <label className="form-label">Thông tin Tài khoản Ngân hàng Thanh toán</label>
                    <input
                      className="form-input"
                      value={systemData.bank_account}
                      onChange={(e) => setSystemData({ ...systemData, bank_account: e.target.value })}
                      placeholder="vd: Vietcombank - 9999888866 - DONG QUANG HUY"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button type="submit" className="btn btn-primary" disabled={systemSaving}>
                  {systemSaving ? <span className="spinner" /> : <Save size={16} />}
                  Lưu Cấu Hình
                </button>
              </div>
            </form>
          )}
        </>
      )}

      {/* TAB 2: DELEGATION */}
      {activeTab === 'DELEGATION' && isManagerOrAdmin && (
        <div>
          {/* Action header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#F8FAFC', margin: 0 }}>
              Danh sách ủy quyền của bạn
            </h2>
            {!showAddForm && (
              <button
                type="button"
                className="btn btn-primary btn-sm flex items-center gap-1"
                onClick={() => setShowAddForm(true)}
              >
                <Plus size={14} /> Thêm ủy quyền mới
              </button>
            )}
          </div>

          {/* Form Create Delegation */}
          {showAddForm && (
            <div className="card mb-6" style={{ border: '1px solid rgba(59, 130, 246, 0.25)' }}>
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="card-title flex items-center gap-2">
                  <KeyRound size={18} className="text-primary" />
                  Thiết lập ủy quyền tạm thời
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setShowAddForm(false)}
                >
                  ✕ Đóng
                </button>
              </div>

              <div className="card-body">
                {formError && (
                  <div className="alert alert-danger mb-4 flex items-center gap-2" style={{ fontSize: 13 }}>
                    <AlertCircle size={16} />
                    {formError}
                  </div>
                )}
                {formSuccess && (
                  <div className="alert alert-success mb-4 flex items-center gap-2" style={{ fontSize: 13 }}>
                    <CheckCircle2 size={16} />
                    {formSuccess}
                  </div>
                )}

                <form onSubmit={handleCreateDelegation}>
                  <div className="form-group mb-4">
                    <label className="form-label">Người được ủy quyền (Tổ phó / Supervisor) *</label>
                    <select
                      className="form-select"
                      value={selectedDelegateId}
                      onChange={(e) => setSelectedDelegateId(e.target.value)}
                      required
                    >
                      <option value="">-- Chọn Tổ phó --</option>
                      {supervisors.map((sup) => (
                        <option key={sup.id} value={sup.id}>
                          {sup.name} ({sup.employeeCode || 'Không có mã'})
                        </option>
                      ))}
                    </select>
                    <p style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>
                      💡 Chỉ hiển thị những nhân sự có vai trò là **SUPERVISOR** đang hoạt động.
                    </p>
                  </div>

                  <div className="form-group mb-4">
                    <label className="form-label">Chọn Tổ/Phòng ban được ủy quyền *</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 6 }}>
                      {departments.map((dept) => (
                        <label key={dept.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#F8FAFC', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={selectedDepts.includes(dept.id)}
                            onChange={(e) => handleDeptCheckbox(dept.id, e.target.checked)}
                          />
                          {dept.name}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="form-group mb-4">
                    <label className="form-label">Quyền hạn ủy quyền *</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 6 }}>
                      {['APPROVE_ATTENDANCE', 'APPROVE_LEAVE', 'APPROVE_OT', 'VIEW_TEAM_PAYROLL'].map((s) => (
                        <label key={s} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#F8FAFC', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={selectedScopes.includes(s)}
                            onChange={(e) => handleScopeCheckbox(s, e.target.checked)}
                          />
                          {getScopeLabel(s)}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="grid-2 mb-4">
                    <div className="form-group">
                      <label className="form-label">Thời gian bắt đầu *</label>
                      <input
                        type="datetime-local"
                        className="form-input"
                        value={startAt}
                        onChange={(e) => setStartAt(e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Thời gian kết thúc *</label>
                      <input
                        type="datetime-local"
                        className="form-input"
                        value={endAt}
                        onChange={(e) => setEndAt(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group mb-6">
                    <label className="form-label">Lý do ủy quyền</label>
                    <input
                      type="text"
                      className="form-input"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="vd: Đi công tác Hà Nội 3 ngày..."
                    />
                  </div>

                  <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setShowAddForm(false)}
                    >
                      Hủy bỏ
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={delegationLoading}
                    >
                      {delegationLoading ? 'Đang lưu...' : 'Tạo ủy quyền'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Delegations List Table */}
          <div className="card">
            {delegationLoading && delegations.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: '#64748B' }}>
                Đang tải dữ liệu ủy quyền...
              </div>
            ) : delegations.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: '#64748B' }}>
                <Clock size={36} style={{ opacity: 0.3, marginBottom: 8 }} />
                <div>Bạn chưa tạo ủy quyền nào.</div>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Tổ phó nhận quyền</th>
                      <th>Phòng ban</th>
                      <th>Quyền hạn</th>
                      <th>Thời hạn</th>
                      <th>Trạng thái</th>
                      <th style={{ textAlign: 'center' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {delegations.map((del) => {
                      const now = new Date();
                      const start = new Date(del.startAt);
                      const end = new Date(del.endAt);
                      const isExpired = now > end;
                      const isLive = del.isActive && !isExpired && now >= start;
                      const isFuture = del.isActive && now < start;

                      return (
                        <tr key={del.id}>
                          <td>
                            <div style={{ fontWeight: 600 }}>{del.delegateName}</div>
                            {del.reason && (
                              <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                                💬 {del.reason}
                              </div>
                            )}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                              {del.departmentIds.map((deptId) => {
                                const found = departments.find((d) => d.id === deptId);
                                return (
                                  <span key={deptId} className="badge" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3B82F6', fontSize: 10 }}>
                                    {found ? found.name : `Dept #${deptId}`}
                                  </span>
                                );
                              })}
                            </div>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                              {del.scope.map((s) => (
                                <span key={s} className="badge" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10B981', fontSize: 10 }}>
                                  {getScopeLabel(s)}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td style={{ fontSize: 12, color: '#CBD5E1', lineHeight: '1.4' }}>
                            <div>Từ: {new Date(del.startAt).toLocaleString('vi-VN')}</div>
                            <div>Đến: {new Date(del.endAt).toLocaleString('vi-VN')}</div>
                          </td>
                          <td>
                            {isLive ? (
                              <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10B981' }}>
                                Đang hoạt động
                              </span>
                            ) : isFuture ? (
                              <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B' }}>
                                Sắp diễn ra
                              </span>
                            ) : (
                              <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#EF4444' }}>
                                {isExpired ? 'Hết hạn' : 'Đã thu hồi'}
                              </span>
                            )}
                          </td>
                          <td>
                            <div style={{ display: 'flex', justifyContent: 'center' }}>
                              {del.isActive && !isExpired && (
                                <button
                                  type="button"
                                  className="btn btn-ghost btn-sm"
                                  title="Thu hồi ủy quyền ngay lập tức"
                                  onClick={() => handleRevokeDelegation(del.id)}
                                  style={{ color: '#EF4444' }}
                                >
                                  <Trash2 size={14} /> Thu hồi
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
        </div>
      )}
    </div>
  );
}
