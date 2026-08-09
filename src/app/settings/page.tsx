'use client';

import { useState, useEffect } from 'react';
import { Settings, Save, Building2, Phone, MapPin, CreditCard, CheckCircle2, ShieldCheck } from 'lucide-react';

export default function SettingsPage() {
  const [formData, setFormData] = useState({
    company_name: 'XƯỞNG NỘI THẤT HOMEPRO',
    hotline: '0905 123 456',
    address: 'Khu công nghiệp / Xưởng thi công HomePro',
    bank_account: 'Vietcombank - 9999888866 - DONG QUANG HUY',
    min_stock_alert: '10',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data && typeof data === 'object') {
        setFormData((prev) => ({
          ...prev,
          ...data,
        }));
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setSuccessMsg('⚙️ Đã cập nhật thông tin cấu hình xưởng thành công!');
        setTimeout(() => setSuccessMsg(''), 3000);
      }
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-container" style={{ maxWidth: 800 }}>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Settings className="text-primary" size={24} />
            Cài đặt Hệ thống Xưởng
          </h1>
          <p className="page-subtitle">
            Cấu hình tên doanh nghiệp, số điện thoại liên hệ, địa chỉ xưởng và tài khoản ngân hàng nhận thanh toán.
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="alert alert-success mb-6 flex items-center gap-2">
          <CheckCircle2 size={18} />
          {successMsg}
        </div>
      )}

      {loading ? (
        <div className="p-6 text-center text-muted">Đang tải cấu hình hệ thống...</div>
      ) : (
        <form onSubmit={handleSubmit}>
          {/* Company Profile Card */}
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
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  placeholder="vd: XƯỞNG NỘI THẤT HOMEPRO"
                  required
                />
              </div>

              <div className="grid-2 mb-4">
                <div className="form-group">
                  <label className="form-label">Số Điện Thoại Hotline / Zalo *</label>
                  <input
                    className="form-input"
                    value={formData.hotline}
                    onChange={(e) => setFormData({ ...formData, hotline: e.target.value })}
                    placeholder="vd: 0905 123 456"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Định mức Tồn kho Tối thiểu (Cảnh báo)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.min_stock_alert}
                    onChange={(e) => setFormData({ ...formData, min_stock_alert: e.target.value })}
                    placeholder="vd: 10"
                  />
                </div>
              </div>

              <div className="form-group mb-4">
                <label className="form-label">Địa chỉ Xưởng Thi Công / Văn Phòng</label>
                <input
                  className="form-input"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="vd: Đường số 3, KCN Tân Bình, TPHCM"
                />
              </div>

              <div className="form-group mb-4">
                <label className="form-label">Thông tin Tài khoản Ngân hàng Thanh toán</label>
                <input
                  className="form-input"
                  value={formData.bank_account}
                  onChange={(e) => setFormData({ ...formData, bank_account: e.target.value })}
                  placeholder="vd: Vietcombank - 9999888866 - DONG QUANG HUY"
                />
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex justify-end gap-3">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <span className="spinner" /> : <Save size={16} />}
              Lưu Cấu Hình
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
