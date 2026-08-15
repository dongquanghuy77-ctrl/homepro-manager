'use client';

import { useState } from 'react';
import { Plus, Search, Package, Edit, Trash2 } from 'lucide-react';
import { createMaterialAction, updateMaterialAction, deleteMaterialAction } from '../actions';
import type { Material } from '@/db/schema';

export default function MaterialsUI({ initialMaterials }: { initialMaterials: Material[] }) {
  const [materials, setMaterials] = useState<Material[]>(initialMaterials);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingMat, setEditingMat] = useState<Material | null>(null);

  // Form state
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [unit, setUnit] = useState('cái');
  const [minStock, setMinStock] = useState<number>(0);

  const filtered = materials.filter(m => 
    m.name.toLowerCase().includes(search.toLowerCase()) || 
    m.code.toLowerCase().includes(search.toLowerCase())
  );

  function openEdit(m: Material) {
    setEditingMat(m);
    setCode(m.code);
    setName(m.name);
    setNotes(m.notes || '');
    setUnit(m.unit);
    setMinStock(m.minStock || 0);
    setShowModal(true);
  }

  function openCreate() {
    setEditingMat(null);
    setCode(''); setName(''); setNotes(''); setUnit('cái'); setMinStock(0);
    setShowModal(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();

    const payload = {
      code, name, notes, unit, minStock
    };

    if (editingMat) {
      const res = await updateMaterialAction(editingMat.id, payload);
      if (res.success && res.data) {
        setMaterials(prev => prev.map(m => m.id === editingMat.id ? res.data : m));
        setShowModal(false);
      } else {
        alert(res.error);
      }
    } else {
      const res = await createMaterialAction(payload);
      if (res.success && res.data) {
        setMaterials([...materials, res.data]);
        setShowModal(false);
      } else {
        alert(res.error);
      }
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Xóa vật tư này?')) return;
    const res = await deleteMaterialAction(id);
    if (res.success) {
      setMaterials(prev => prev.filter(m => m.id !== id));
    } else {
      alert(res.error);
    }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Danh mục Vật tư</h1>
          <p className="page-subtitle">Quản lý mã vật tư</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={16} /> Thêm vật tư mới
        </button>
      </div>

      <div className="card">
        <div className="card-header flex items-center gap-4">
          <div className="search-box flex-1">
            <Search size={18} className="search-icon" />
            <input 
              type="text" 
              placeholder="Tìm theo mã hoặc tên..." 
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
                <th>Mã VT</th>
                <th>Tên vật tư</th>
                <th>ĐVT</th>
                <th className="text-right">Tồn tối thiểu</th>
                <th className="text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(m => {
                return (
                  <tr key={m.id}>
                    <td className="font-medium text-blue-600">{m.code}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <Package size={16} className="text-gray-400" />
                        {m.name}
                      </div>
                    </td>
                    <td>{m.unit}</td>
                    <td className="text-right font-semibold">{m.minStock}</td>
                    <td className="text-right">
                      <div className="flex justify-end gap-2">
                        <button className="btn-icon" onClick={() => openEdit(m)}><Edit size={16} /></button>
                        <button className="btn-icon text-red-500" onClick={() => handleDelete(m.id)}><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-gray-500">Không tìm thấy vật tư nào.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h3 className="modal-title">{editingMat ? 'Cập nhật Vật tư' : 'Thêm Vật tư'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSave} className="space-y-4">
                <div className="form-group">
                  <label>Mã Vật Tư *</label>
                  <input required className="input" value={code} onChange={e=>setCode(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Tên Vật Tư *</label>
                  <input required className="input" value={name} onChange={e=>setName(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Ghi chú</label>
                  <input className="input" value={notes} onChange={e=>setNotes(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Đơn vị tính *</label>
                  <input required className="input" value={unit} onChange={e=>setUnit(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Tồn tối thiểu</label>
                  <input type="number" required className="input" value={minStock} onChange={e=>setMinStock(Number(e.target.value))} />
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Hủy</button>
                  <button type="submit" className="btn btn-primary">Lưu Vật Tư</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
