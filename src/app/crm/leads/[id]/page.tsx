'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Edit, Save, Trash2, ArrowRightCircle, Calendar, Clock, MapPin, Phone, Mail, Building, Briefcase } from 'lucide-react';
import Link from 'next/link';

interface LeadItem {
  id: number;
  code?: string;
  name: string;
  company?: string;
  phone?: string;
  email?: string;
  address?: string;
  region?: string;
  source?: string;
  type?: string;
  status: string;
  potentialLevel?: string;
  estimatedValue?: number;
  assignedTo?: number;
  notes?: string;
  followUpDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

const STATUSES = ['NEW', 'CONTACTED', 'QUALIFIED', 'UNQUALIFIED', 'CONVERTED', 'LOST'];

export default function LeadDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [lead, setLead] = useState<LeadItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<LeadItem>>({});
  const [submitting, setSubmitting] = useState(false);
  const [converting, setConverting] = useState(false);

  useEffect(() => {
    loadLead();
  }, [params.id]);

  async function loadLead() {
    setLoading(true);
    try {
      const res = await fetch(`/api/crm/leads/${params.id}`);
      if (res.ok) {
        const data = await res.json();
        setLead(data);
        setFormData(data);
      } else {
        router.push('/crm/leads');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`/api/crm/leads/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        const updated = await res.json();
        setLead(updated);
        setIsEditing(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Bạn có chắc muốn xoá Lead này?')) return;
    try {
      const res = await fetch(`/api/crm/leads/${params.id}`, { method: 'DELETE' });
      if (res.ok) {
        router.push('/crm/leads');
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleConvertToOpportunity() {
    if (!lead) return;
    if (!confirm('Chuyển đổi Lead này thành Cơ hội (Opportunity)?')) return;
    setConverting(true);
    try {
      // 1. Create a dummy customer or use existing logic if customerId is required. 
      // The opportunity schema requires customerId. 
      // Since we don't have customer selection here, we might need to create a Customer first.
      const custRes = await fetch('/api/crm/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: lead.name,
          phone: lead.phone,
          email: lead.email,
          address: lead.address,
          notes: lead.notes,
        })
      });
      let customerId = null;
      if (custRes.ok) {
        const custData = await custRes.json();
        customerId = custData.id;
      }

      if (customerId) {
        // 2. Create Opportunity
        const oppRes = await fetch('/api/crm/opportunities', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: `Opportunity - ${lead.name}`,
            customerId: customerId,
            leadId: lead.id,
            estimatedValue: lead.estimatedValue || 0,
            status: 'NEW',
            assignedTo: lead.assignedTo
          })
        });

        if (oppRes.ok) {
          // 3. Update Lead Status to CONVERTED
          const updateRes = await fetch(`/api/crm/leads/${lead.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'CONVERTED' }),
          });
          if (updateRes.ok) {
            alert('Chuyển đổi thành công!');
            loadLead();
          }
        }
      } else {
        alert('Có lỗi khi tạo Khách hàng từ Lead.');
      }
    } catch (err) {
      console.error(err);
      alert('Có lỗi xảy ra.');
    } finally {
      setConverting(false);
    }
  }

  if (loading) return <div className="p-8 text-center text-gray-500">Đang tải...</div>;
  if (!lead) return <div className="p-8 text-center text-red-500">Không tìm thấy dữ liệu.</div>;

  return (
    <div className="page-container max-w-6xl mx-auto">
      <div className="mb-4 flex items-center justify-between">
        <Link href="/crm/leads" className="flex items-center gap-2 text-gray-600 hover:text-primary transition-colors">
          <ArrowLeft size={20} /> Quay lại danh sách
        </Link>
        <div className="flex gap-2">
          {lead.status !== 'CONVERTED' && (
            <button 
              className="btn bg-green-600 text-white hover:bg-green-700 flex items-center gap-2 disabled:opacity-50"
              onClick={handleConvertToOpportunity}
              disabled={converting}
            >
              <ArrowRightCircle size={18} /> {converting ? 'Đang chuyển...' : 'Chuyển thành Cơ hội'}
            </button>
          )}
          <button className="btn btn-secondary flex items-center gap-2" onClick={() => setIsEditing(!isEditing)}>
            <Edit size={18} /> {isEditing ? 'Hủy sửa' : 'Chỉnh sửa'}
          </button>
          <button className="btn bg-red-50 text-red-600 hover:bg-red-100 flex items-center gap-2 border border-red-200" onClick={handleDelete}>
            <Trash2 size={18} /> Xóa
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-800">{lead.name}</h1>
                <p className="text-gray-500 flex items-center gap-2 mt-1">
                  <Briefcase size={16} /> {lead.company || 'Cá nhân'}
                </p>
              </div>
              <span className={`px-3 py-1 text-sm font-semibold rounded-full 
                ${lead.status === 'NEW' ? 'bg-blue-100 text-blue-700' : 
                  lead.status === 'CONVERTED' ? 'bg-green-100 text-green-700' : 
                  lead.status === 'LOST' ? 'bg-red-100 text-red-700' : 
                  'bg-yellow-100 text-yellow-700'}`}>
                {lead.status}
              </span>
            </div>

            {isEditing ? (
              <form id="edit-form" onSubmit={handleUpdate} className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-gray-100 pt-6">
                <div>
                  <label className="block text-sm font-medium mb-1">Họ tên *</label>
                  <input type="text" className="form-input w-full" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Công ty</label>
                  <input type="text" className="form-input w-full" value={formData.company || ''} onChange={e => setFormData({...formData, company: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Điện thoại</label>
                  <input type="text" className="form-input w-full" value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input type="email" className="form-input w-full" value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Địa chỉ</label>
                  <input type="text" className="form-input w-full" value={formData.address || ''} onChange={e => setFormData({...formData, address: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Khu vực (Region)</label>
                  <input type="text" className="form-input w-full" value={formData.region || ''} onChange={e => setFormData({...formData, region: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Nguồn (Source)</label>
                  <input type="text" className="form-input w-full" value={formData.source || ''} onChange={e => setFormData({...formData, source: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Trạng thái</label>
                  <select className="form-input w-full" value={formData.status || 'NEW'} onChange={e => setFormData({...formData, status: e.target.value})}>
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Mức độ tiềm năng</label>
                  <select className="form-input w-full" value={formData.potentialLevel || ''} onChange={e => setFormData({...formData, potentialLevel: e.target.value})}>
                    <option value="">-- Chọn --</option>
                    <option value="LOW">Thấp (LOW)</option>
                    <option value="MEDIUM">Trung bình (MEDIUM)</option>
                    <option value="HIGH">Cao (HIGH)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Giá trị dự kiến (VNĐ)</label>
                  <input type="number" className="form-input w-full" value={formData.estimatedValue || 0} onChange={e => setFormData({...formData, estimatedValue: parseFloat(e.target.value)})} />
                </div>
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Ghi chú</label>
                  <textarea className="form-input w-full h-24" value={formData.notes || ''} onChange={e => setFormData({...formData, notes: e.target.value})} />
                </div>
                <div className="col-span-1 md:col-span-2 flex justify-end gap-2 mt-4">
                  <button type="button" className="btn btn-secondary" onClick={() => setIsEditing(false)}>Hủy</button>
                  <button type="submit" className="btn btn-primary flex items-center gap-2" disabled={submitting}>
                    <Save size={18} /> {submitting ? 'Đang lưu...' : 'Lưu thay đổi'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8 border-t border-gray-100 pt-6">
                <div className="flex items-start gap-3">
                  <Phone className="text-gray-400 mt-1" size={18} />
                  <div>
                    <p className="text-sm text-gray-500">Điện thoại</p>
                    <p className="font-medium">{lead.phone || '---'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Mail className="text-gray-400 mt-1" size={18} />
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium">{lead.email || '---'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="text-gray-400 mt-1" size={18} />
                  <div>
                    <p className="text-sm text-gray-500">Địa chỉ</p>
                    <p className="font-medium">{lead.address || '---'} {lead.region ? `(${lead.region})` : ''}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Building className="text-gray-400 mt-1" size={18} />
                  <div>
                    <p className="text-sm text-gray-500">Nguồn</p>
                    <p className="font-medium">{lead.source || '---'}</p>
                  </div>
                </div>
                <div className="col-span-1 md:col-span-2 mt-4 bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500 font-medium mb-2">Ghi chú:</p>
                  <p className="text-gray-700 whitespace-pre-wrap">{lead.notes || 'Chưa có ghi chú.'}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-6">
            <h3 className="font-bold text-gray-800 mb-4 border-b border-gray-100 pb-2">Thông tin bổ sung</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Giá trị dự kiến</p>
                <p className="font-semibold text-green-600 text-lg">{lead.estimatedValue ? lead.estimatedValue.toLocaleString() + ' đ' : '0 đ'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Mức độ tiềm năng</p>
                <p className="font-medium">{lead.potentialLevel || '---'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Loại</p>
                <p className="font-medium">{lead.type || '---'}</p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h3 className="font-bold text-gray-800 mb-4 border-b border-gray-100 pb-2">Timeline</h3>
            <div className="relative pl-4 border-l-2 border-gray-200 space-y-6">
              <div className="relative">
                <div className="absolute -left-[23px] top-1 bg-white p-1 rounded-full">
                  <Calendar size={14} className="text-blue-500" />
                </div>
                <p className="text-sm font-medium text-gray-800">Tạo Lead</p>
                <p className="text-xs text-gray-500 mt-0.5">{lead.createdAt ? new Date(lead.createdAt).toLocaleString('vi-VN') : '---'}</p>
              </div>
              <div className="relative">
                <div className="absolute -left-[23px] top-1 bg-white p-1 rounded-full">
                  <Clock size={14} className="text-green-500" />
                </div>
                <p className="text-sm font-medium text-gray-800">Cập nhật lần cuối</p>
                <p className="text-xs text-gray-500 mt-0.5">{lead.updatedAt ? new Date(lead.updatedAt).toLocaleString('vi-VN') : '---'}</p>
              </div>
              {lead.followUpDate && (
                <div className="relative">
                  <div className="absolute -left-[23px] top-1 bg-white p-1 rounded-full">
                    <Phone size={14} className="text-orange-500" />
                  </div>
                  <p className="text-sm font-medium text-gray-800">Ngày Follow-up</p>
                  <p className="text-xs text-gray-500 mt-0.5">{new Date(lead.followUpDate).toLocaleDateString('vi-VN')}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
