'use client';

import { useState } from 'react';
import { Search, Plus, MapPin, Phone, Mail, Building2 } from 'lucide-react';
import { createSupplierAction, updateSupplierAction } from '../actions';

type Supplier = any;

export default function SuppliersUI({ initialSuppliers }: { initialSuppliers: Supplier[] }) {
  const [suppliers, setSuppliers] = useState<Supplier[]>(initialSuppliers);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  
  // Form State
  const [editId, setEditId] = useState<number | null>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [taxCode, setTaxCode] = useState('');

  const filtered = suppliers.filter(s => {
    if (!search) return true;
    const term = search.toLowerCase();
    return s.name.toLowerCase().includes(term) || s.code.toLowerCase().includes(term);
  });

  function openModal(supplier?: Supplier) {
    if (supplier) {
      setEditId(supplier.id);
      setCode(supplier.code);
      setName(supplier.name);
      setContactName(supplier.contactName || '');
      setPhone(supplier.phone || '');
      setEmail(supplier.email || '');
      setAddress(supplier.address || '');
      setTaxCode(supplier.taxCode || '');
    } else {
      setEditId(null);
      setCode(`SUP-${Date.now().toString().slice(-6)}`);
      setName('');
      setContactName('');
      setPhone('');
      setEmail('');
      setAddress('');
      setTaxCode('');
    }
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = { code, name, contactName, phone, email, address, taxCode };
    
    if (editId) {
      const res = await updateSupplierAction(editId, payload);
      if (res.success) {
        setSuppliers(suppliers.map(s => s.id === editId ? res.data : s));
        setShowModal(false);
      } else {
        alert(res.error);
      }
    } else {
      const res = await createSupplierAction(payload);
      if (res.success) {
        setSuppliers([...suppliers, res.data]);
        setShowModal(false);
      } else {
        alert(res.error);
      }
    }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Nhà cung cấp</h1>
          <p className="page-subtitle">Quản lý danh sách nhà cung cấp vật tư</p>
        </div>
        <button className="btn btn-primary" onClick={() => openModal()}>
          <Plus size={16} /> Thêm Nhà cung cấp
        </button>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="search-box">
            <Search size={18} className="search-icon" />
            <input 
              type="text" 
              placeholder="Tìm theo tên, mã nhà cung cấp..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="search-input w-full"
            />
          </div>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Mã NCC</th>
                <th>Tên Nhà Cung Cấp</th>
                <th>Người liên hệ</th>
                <th>Điện thoại / Email</th>
                <th>Địa chỉ</th>
                <th>Mã Số Thuế</th>
                <th>Đánh giá</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.id} onClick={() => openModal(s)} className="cursor-pointer hover:bg-gray-50">
                  <td className="font-medium text-gray-700">{s.code}</td>
                  <td className="font-bold text-blue-600 flex items-center gap-2">
                    <Building2 size={16} className="text-gray-400" />
                    {s.name}
                  </td>
                  <td>{s.contactName || '-'}</td>
                  <td>
                    {s.phone && <div className="flex items-center gap-1 text-sm text-gray-600"><Phone size={12}/> {s.phone}</div>}
                    {s.email && <div className="flex items-center gap-1 text-sm text-gray-600"><Mail size={12}/> {s.email}</div>}
                  </td>
                  <td className="text-sm text-gray-600">
                    {s.address && <div className="flex items-center gap-1"><MapPin size={12}/> {s.address}</div>}
                  </td>
                  <td>{s.taxCode || '-'}</td>
                  <td>
                    <span className="badge bg-green-100 text-green-700">{s.rating || 'A+'}</span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-500">Không tìm thấy nhà cung cấp nào.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <h3 className="modal-title flex items-center gap-2"><Building2 size={18} /> {editId ? 'Sửa Nhà Cung Cấp' : 'Thêm Mới Nhà Cung Cấp'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label>Mã NCC *</label>
                  <input required className="input" value={code} onChange={e=>setCode(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Tên Nhà Cung Cấp *</label>
                  <input required className="input" value={name} onChange={e=>setName(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Người liên hệ</label>
                  <input className="input" value={contactName} onChange={e=>setContactName(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Điện thoại</label>
                  <input className="input" value={phone} onChange={e=>setPhone(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" className="input" value={email} onChange={e=>setEmail(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Mã số thuế</label>
                  <input className="input" value={taxCode} onChange={e=>setTaxCode(e.target.value)} />
                </div>
                <div className="form-group col-span-2">
                  <label>Địa chỉ</label>
                  <input className="input" value={address} onChange={e=>setAddress(e.target.value)} />
                </div>
                <div className="col-span-2 flex justify-end gap-3 mt-4">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Hủy</button>
                  <button type="submit" className="btn btn-primary">{editId ? 'Cập nhật' : 'Thêm mới'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
