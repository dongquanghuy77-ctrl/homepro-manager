'use client';

import { useState } from 'react';

export default function HRReportsPage() {
  const [loading, setLoading] = useState(false);

  const handleExport = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const query = new URLSearchParams();
    query.append('format', 'csv');
    
    const startDate = formData.get('startDate') as string;
    const endDate = formData.get('endDate') as string;
    const department = formData.get('department') as string;

    if (startDate) query.append('startDate', startDate);
    if (endDate) query.append('endDate', endDate);
    if (department) query.append('department', department);

    try {
      window.open(`/api/hr/reports?${query.toString()}`, '_blank');
    } catch (err) {
      console.error('Export failed', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Báo cáo nhân sự</h1>
          <p className="page-subtitle">Xuất báo cáo chấm công, làm thêm giờ và nghỉ phép</p>
        </div>
      </div>

      <div className="card">
        <h2 className="card-title mb-4">Bộ lọc báo cáo</h2>
        <form onSubmit={handleExport} className="grid-4 gap-4">
          <div className="form-group">
            <label className="form-label">Từ ngày</label>
            <input type="date" name="startDate" className="form-input" required />
          </div>
          <div className="form-group">
            <label className="form-label">Đến ngày</label>
            <input type="date" name="endDate" className="form-input" required />
          </div>
          <div className="form-group">
            <label className="form-label">Bộ phận</label>
            <select name="department" className="form-select">
              <option value="">Tất cả</option>
              <option value="IT">IT</option>
              <option value="HR">HR</option>
              <option value="SALES">Sales</option>
            </select>
          </div>
          <div className="form-group" style={{ justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Đang xử lý...' : 'Xuất CSV'}
            </button>
          </div>
        </form>
      </div>
      
      <div className="card mt-6">
        <div className="empty-state">
          <div className="empty-state-text">Vui lòng chọn điều kiện và bấm "Xuất CSV" để tải báo cáo</div>
        </div>
      </div>
    </div>
  );
}
