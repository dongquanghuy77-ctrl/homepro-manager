'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Users, UserPlus, Phone, MapPin, Mail, Search, Trash2, Edit2, FolderOpen } from 'lucide-react';

interface CustomerItem {
  id: number;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  customerType?: string;
  createdAt?: string;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadCustomers();
  }, []);

  async function loadCustomers() {
    setLoading(true);
    try {
      const res = await fetch('/api/crm/customers');
      const data = await res.json();
      if (Array.isArray(data)) setCustomers(data);
    } catch (err) {
      console.error('Failed to load customers:', err);
    } finally {
      setLoading(false);
    }
  }

  const filteredCustomers = customers.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.phone && c.phone.includes(q)) ||
      (c.address && c.address.toLowerCase().includes(q))
    );
  });

  async function handleCreateCustomer(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/crm/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setShowAddModal(false);
        setFormData({ name: '', phone: '', email: '', address: '', notes: '' });
        loadCustomers();
      }
    } catch (err) {
      console.error('Failed to create customer:', err);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteCustomer(id: number, name: string) {
    if (!confirm(`Bạn có chắc muốn XÓA khách hàng "${name}"?`)) return;
    try {
      const res = await fetch(`/api/crm/customers/${id}`, { method: 'DELETE' });
      if (res.ok) loadCustomers();
    } catch (err) {
      console.error('Failed to delete customer:', err);
    }
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Users className="text-primary" size={24} />
            Quản lý Khách hàng (CRM)
          </h1>
          <p className="page-subtitle">
            Danh bạ lưu trữ thông tin chủ đầu tư, số điện thoại, địa chỉ công trình và yêu cầu thi công.
          </p>
        </div>

        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <UserPlus size={16} /> Thêm Khách Hàng Mới
        </button>
      </div>

      {/* Search Bar */}
      <div className="card mb-6" style={{ padding: '14px 18px' }}>
        <div className="flex items-center gap-3">
          <Search size={18} className="text-muted" />
          <input
            className="form-input"
            style={{ border: 'none', background: 'transparent', padding: 0, fontSize: 14 }}
            placeholder="Tìm theo Tên khách hàng, Số điện thoại hoặc Địa chỉ công trình..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Customer List Grid */}
      {loading ? (
        <div className="p-6 text-center text-muted">Đang tải danh sách khách hàng...</div>
      ) : filteredCustomers.length === 0 ? (
        <div className="empty-state">
          <Users size={40} className="text-muted mb-2" />
          <p>Chưa có thông tin khách hàng nào.</p>
        </div>
      ) : (
        <div className="grid-3 mb-6">
          {filteredCustomers.map((c) => (
            <div key={c.id} className="card flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Link href={`/crm/customers/${c.id}`} className="flex items-center gap-2 group cursor-pointer hover:opacity-80">
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
                        color: '#fff',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 16,
                      }}
                    >
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="card-title group-hover:text-primary transition-colors" style={{ fontSize: 15 }}>{c.name}</div>
                      <div className="card-subtitle" style={{ fontSize: 11 }}>Khách hàng {c.customerType === 'ENTERPRISE' ? 'Doanh nghiệp' : 'cá nhân'}</div>
                    </div>
                  </Link>

                  <button
                    className="btn btn-danger btn-sm"
                    style={{ padding: '4px 6px' }}
                    onClick={() => handleDeleteCustomer(c.id, c.name)}
                    title="Xóa khách hàng"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                <div className="flex flex-col gap-2 mb-4" style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                  {c.phone && (
                    <div className="flex items-center gap-2">
                      <Phone size={14} className="text-primary" />
                      <a href={`tel:${c.phone}`} style={{ color: '#60A5FA', textDecoration: 'none' }}>
                        {c.phone}
                      </a>
                    </div>
                  )}
                  {c.email && (
                    <div className="flex items-center gap-2">
                      <Mail size={14} className="text-muted" />
                      <span>{c.email}</span>
                    </div>
                  )}
                  {c.address && (
                    <div className="flex items-center gap-2">
                      <MapPin size={14} className="text-muted" />
                      <span>{c.address}</span>
                    </div>
                  )}
                </div>

                {c.notes && (
                  <div
                    style={{
                      background: 'var(--color-surface-2)',
                      padding: '8px 10px',
                      borderRadius: 8,
                      fontSize: 12,
                      color: 'var(--color-text-secondary)',
                    }}
                  >
                    📝 {c.notes}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="modal-backdrop">
          <div className="modal" style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <div className="modal-title">Thêm Khách hàng mới</div>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>×</button>
            </div>

            <form onSubmit={handleCreateCustomer} className="modal-body">
              <div className="form-group mb-4">
                <label className="form-label">Họ và Tên Khách hàng *</label>
                <input
                  className="form-input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="vd: ANH NGUYỄN VĂN HÒA (Biệt thự Thảo Điền)"
                  required
                />
              </div>

              <div className="grid-2 mb-4">
                <div className="form-group">
                  <label className="form-label">Số Điện Thoại</label>
                  <input
                    className="form-input"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="vd: 0908 123 456"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    className="form-input"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="khachhang@gmail.com"
                  />
                </div>
              </div>

              <div className="form-group mb-4">
                <label className="form-label">Địa chỉ công trình / Nhà riêng</label>
                <input
                  className="form-input"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="vd: Số 12 Đường 45, P. Thảo Điền, Q.2"
                />
              </div>

              <div className="form-group mb-4">
                <label className="form-label">Ghi chú nhu cầu thi công</label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Yêu cầu riêng về chất liệu gỗ An Cường, tiến độ bàn giao..."
                />
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAddModal(false)}
                  disabled={submitting}
                >
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? <span className="spinner" /> : <UserPlus size={16} />}
                  Lưu Khách Hàng
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
