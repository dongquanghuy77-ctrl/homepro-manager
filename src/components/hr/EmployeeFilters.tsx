'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import AddEmployeeModal from './AddEmployeeModal';

export default function EmployeeFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const params = new URLSearchParams();
    
    const search = formData.get('search') as string;
    const department = formData.get('department') as string;
    const status = formData.get('status') as string;

    if (search) params.append('search', search);
    if (department) params.append('department', department);
    if (status) params.append('status', status);

    router.push(`/employees?${params.toString()}`);
  };

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-4">
        <h2 className="card-title">Bộ lọc</h2>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>+ Thêm nhân viên</button>
      </div>
      
      <form onSubmit={handleSubmit} className="grid-4">
        <div className="form-group">
          <label className="form-label">Tìm kiếm</label>
          <input type="text" name="search" className="form-input" placeholder="Tên, Mã NV..." defaultValue={searchParams.get('search') || ''} />
        </div>
        <div className="form-group">
          <label className="form-label">Bộ phận</label>
          <select name="department" className="form-select" defaultValue={searchParams.get('department') || ''}>
            <option value="">Tất cả</option>
            <option value="IT">IT</option>
            <option value="HR">HR</option>
            <option value="SALES">Sales</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Trạng thái</label>
          <select name="status" className="form-select" defaultValue={searchParams.get('status') || ''}>
            <option value="">Tất cả</option>
            <option value="ACTIVE">Đang làm việc</option>
            <option value="INACTIVE">Đã nghỉ</option>
          </select>
        </div>
        <div className="form-group" style={{ justifyContent: 'flex-end' }}>
          <button type="submit" className="btn btn-secondary">Tìm kiếm</button>
        </div>
      </form>

      {isModalOpen && <AddEmployeeModal onClose={() => setIsModalOpen(false)} />}
    </div>
  );
}
