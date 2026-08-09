'use client';

import { useState, useMemo } from 'react';
import { Plus, Search, Trash2, Pencil, Package, AlertTriangle, CheckCircle2, ShoppingCart, BarChart3 } from 'lucide-react';
import type { Material, Project, BoqItem } from '@/db/schema';

// ============================================================
// CONSTANTS
// ============================================================
const MATERIAL_CATEGORIES = [
  'Gỗ & Ván', 'Sơn & Hoàn thiện', 'Phụ kiện nội thất', 'Vải & Da',
  'Kim loại & Inox', 'Kính', 'Nhôm', 'Điện & Chiếu sáng', 'Vật liệu xây dựng', 'Khác'
];

const UNITS = ['cái', 'm', 'm2', 'm3', 'kg', 'tấm', 'bộ', 'cuộn', 'thùng', 'lít', 'gói'];

// Format tiền VND
function fmtVND(n: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n);
}

interface MaterialsClientProps {
  initialMaterials: Material[];
  projects: Project[];
  allBoq: BoqItem[];
}

type TabType = 'danh-muc' | 'boq' | 'thong-ke';

export default function MaterialsClient({ initialMaterials, projects, allBoq }: MaterialsClientProps) {
  const [materials, setMaterials] = useState<Material[]>(initialMaterials);
  const [boqList, setBoqList] = useState<BoqItem[]>(allBoq);
  const [tab, setTab] = useState<TabType>('danh-muc');
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [showMatForm, setShowMatForm] = useState(false);
  const [showBoqForm, setShowBoqForm] = useState(false);
  const [editMat, setEditMat] = useState<Material | null>(null);
  const [editBoq, setEditBoq] = useState<BoqItem | null>(null);

  const projectMap = Object.fromEntries(projects.map(p => [p.id, p]));

  // Stats
  const lowStockCount = materials.filter(m => m.stockQty !== null && m.minStock !== null && m.stockQty <= m.minStock && m.minStock > 0).length;
  const totalStockValue = materials.reduce((s, m) => s + (m.stockQty || 0) * (m.unitPrice || 0), 0);
  const totalBoqValue = boqList.reduce((s, b) => s + (b.qtyRequired || 0) * (b.unitPrice || 0), 0);
  const pendingDelivery = boqList.filter(b => (b.qtyReceived || 0) < (b.qtyRequired || 0)).length;

  // Filtered materials
  const filteredMats = materials.filter(m => {
    if (filterCat && m.category !== filterCat) return false;
    if (search && !m.name.toLowerCase().includes(search.toLowerCase()) && !m.code.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Filtered BOQ
  const filteredBoq = boqList.filter(b => {
    if (filterProject && b.projectId !== parseInt(filterProject)) return false;
    if (search && !b.materialName.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  async function refreshMaterials() {
    const res = await fetch('/api/materials');
    if (res.ok) setMaterials(await res.json());
  }
  async function refreshBoq() {
    const res = await fetch('/api/boq');
    if (res.ok) setBoqList(await res.json());
  }

  async function deleteMaterial(id: number) {
    if (!confirm('Xóa vật tư này?')) return;
    await fetch(`/api/materials/${id}`, { method: 'DELETE' });
    setMaterials(prev => prev.filter(m => m.id !== id));
  }

  async function deleteBoq(id: number) {
    if (!confirm('Xóa mục BOQ này?')) return;
    await fetch(`/api/boq/${id}`, { method: 'DELETE' });
    setBoqList(prev => prev.filter(b => b.id !== id));
  }

  // Inline update for BOQ quantities
  async function updateBoqQty(item: BoqItem, field: 'qtyOrdered' | 'qtyReceived', value: number) {
    const updated = { ...item, [field]: value };
    setBoqList(prev => prev.map(b => b.id === item.id ? updated : b));
    await fetch(`/api/boq/${item.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    });
  }

  // Inline update for stock
  async function updateStock(mat: Material, qty: number) {
    const updated = { ...mat, stockQty: qty };
    setMaterials(prev => prev.map(m => m.id === mat.id ? updated : m));
    await fetch(`/api/materials/${mat.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    });
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Vật tư & BOQ</h1>
          <p className="page-subtitle">Quản lý vật liệu, bóc tách vật tư theo dự án</p>
        </div>
        <div className="flex gap-3">
          {tab === 'danh-muc' && (
            <button className="btn btn-primary" onClick={() => { setEditMat(null); setShowMatForm(true); }}>
              <Plus size={16} /> Thêm vật tư
            </button>
          )}
          {tab === 'boq' && (
            <button className="btn btn-primary" onClick={() => { setEditBoq(null); setShowBoqForm(true); }}>
              <Plus size={16} /> Thêm vào BOQ
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="qc-stats-grid">
        <div className="qc-stat-card">
          <div className="qc-stat-icon" style={{ background: 'rgba(59,130,246,0.12)', color: 'var(--color-primary)' }}>
            <Package size={22} />
          </div>
          <div>
            <div className="qc-stat-value">{materials.length}</div>
            <div className="qc-stat-label">Loại vật tư</div>
          </div>
        </div>
        <div className="qc-stat-card" style={{ borderColor: lowStockCount > 0 ? '#EF4444' : undefined }}>
          <div className="qc-stat-icon" style={{ background: 'rgba(239,68,68,0.12)', color: '#EF4444' }}>
            <AlertTriangle size={22} />
          </div>
          <div>
            <div className="qc-stat-value" style={{ color: lowStockCount > 0 ? '#EF4444' : undefined }}>{lowStockCount}</div>
            <div className="qc-stat-label">Sắp hết hàng</div>
          </div>
        </div>
        <div className="qc-stat-card">
          <div className="qc-stat-icon" style={{ background: 'rgba(16,185,129,0.12)', color: '#10B981' }}>
            <BarChart3 size={22} />
          </div>
          <div>
            <div className="qc-stat-value" style={{ fontSize: 16 }}>{fmtVND(totalStockValue)}</div>
            <div className="qc-stat-label">Giá trị tồn kho</div>
          </div>
        </div>
        <div className="qc-stat-card">
          <div className="qc-stat-icon" style={{ background: 'rgba(245,158,11,0.12)', color: '#F59E0B' }}>
            <ShoppingCart size={22} />
          </div>
          <div>
            <div className="qc-stat-value">{pendingDelivery}</div>
            <div className="qc-stat-label">BOQ chờ nhận hàng</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mat-tabs">
        {([['danh-muc', '📦 Danh mục vật tư'], ['boq', '📋 BOQ theo dự án'], ['thong-ke', '📊 Thống kê']] as [TabType, string][]).map(([t, label]) => (
          <button
            key={t}
            className={`mat-tab-btn ${tab === t ? 'active' : ''}`}
            onClick={() => setTab(t)}
          >{label}</button>
        ))}
      </div>

      {/* ===== DANH MỤC VẬT TƯ ===== */}
      {tab === 'danh-muc' && (
        <div className="card">
          <div className="filter-bar mb-4">
            <div style={{ flex: 1, position: 'relative', minWidth: 200 }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
              <input className="filter-bar-select" style={{ paddingLeft: 30, width: '100%' }} placeholder="Tìm vật tư..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="filter-bar-select" value={filterCat} onChange={e => setFilterCat(e.target.value)}>
              <option value="">Tất cả nhóm</option>
              {MATERIAL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Mã</th>
                  <th style={{ minWidth: 200 }}>Tên vật tư</th>
                  <th>Nhóm</th>
                  <th>ĐVT</th>
                  <th>Đơn giá</th>
                  <th style={{ minWidth: 130 }}>Tồn kho (Sửa)</th>
                  <th>Tối thiểu</th>
                  <th>Trạng thái</th>
                  <th>Nhà cung cấp</th>
                  <th style={{ minWidth: 60, width: 80 }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredMats.length === 0 ? (
                  <tr><td colSpan={10}>
                    <div className="empty-state">
                      <div className="empty-state-icon"><Package size={36} /></div>
                      <div className="empty-state-text">Chưa có vật tư nào</div>
                      <div className="empty-state-sub">Nhấn "Thêm vật tư" để bắt đầu</div>
                    </div>
                  </td></tr>
                ) : filteredMats.map(mat => {
                  const isLow = (mat.stockQty || 0) <= (mat.minStock || 0) && (mat.minStock || 0) > 0;
                  const isOut = (mat.stockQty || 0) === 0;
                  return (
                    <tr key={mat.id} style={{ background: isLow ? 'rgba(239,68,68,0.04)' : undefined }}>
                      <td><span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--color-text-muted)' }}>{mat.code}</span></td>
                      <td><strong style={{ fontSize: 13 }}>{mat.name}</strong></td>
                      <td><span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{mat.category || '—'}</span></td>
                      <td style={{ fontSize: 12 }}>{mat.unit}</td>
                      <td style={{ fontSize: 12, textAlign: 'right' }}>{fmtVND(mat.unitPrice || 0)}</td>
                      <td>
                        <input
                          type="number"
                          className="form-input"
                          style={{ padding: '4px 8px', fontSize: 13, width: 90, textAlign: 'right', color: isLow ? '#EF4444' : undefined, fontWeight: isLow ? 700 : undefined }}
                          value={mat.stockQty || 0}
                          min={0}
                          step={0.5}
                          onChange={e => updateStock(mat, parseFloat(e.target.value) || 0)}
                        />
                      </td>
                      <td style={{ fontSize: 12, textAlign: 'right', color: 'var(--color-text-muted)' }}>{mat.minStock || 0}</td>
                      <td>
                        {isOut ? (
                          <span className="badge" style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444' }}>🔴 Hết hàng</span>
                        ) : isLow ? (
                          <span className="badge" style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B' }}>⚠️ Sắp hết</span>
                        ) : (
                          <span className="badge" style={{ background: 'rgba(16,185,129,0.12)', color: '#10B981' }}>✅ Đủ hàng</span>
                        )}
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{mat.supplier || '—'}</td>
                      <td>
                        <div className="flex gap-2">
                          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => { setEditMat(mat); setShowMatForm(true); }}><Pencil size={13} /></button>
                          <button className="btn btn-danger btn-icon btn-sm" onClick={() => deleteMaterial(mat.id)}><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===== BOQ THEO DỰ ÁN ===== */}
      {tab === 'boq' && (
        <div className="card">
          <div className="filter-bar mb-4">
            <div style={{ flex: 1, position: 'relative', minWidth: 200 }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
              <input className="filter-bar-select" style={{ paddingLeft: 30, width: '100%' }} placeholder="Tìm vật tư trong BOQ..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="filter-bar-select" value={filterProject} onChange={e => setFilterProject(e.target.value)}>
              <option value="">Tất cả dự án</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Dự án</th>
                  <th style={{ minWidth: 180 }}>Tên vật tư</th>
                  <th>Hạng mục</th>
                  <th>ĐVT</th>
                  <th>Đơn giá</th>
                  <th>Cần dùng</th>
                  <th>Đã đặt (Sửa)</th>
                  <th>Đã nhận (Sửa)</th>
                  <th>Thành tiền</th>
                  <th>Trạng thái</th>
                  <th style={{ width: 60 }}></th>
                </tr>
              </thead>
              <tbody>
                {filteredBoq.length === 0 ? (
                  <tr><td colSpan={11}>
                    <div className="empty-state">
                      <div className="empty-state-icon">📋</div>
                      <div className="empty-state-text">Chưa có bóc tách vật tư</div>
                      <div className="empty-state-sub">Nhấn "Thêm vào BOQ" để bắt đầu</div>
                    </div>
                  </td></tr>
                ) : filteredBoq.map(item => {
                  const total = (item.qtyRequired || 0) * (item.unitPrice || 0);
                  const received = item.qtyReceived || 0;
                  const required = item.qtyRequired || 0;
                  const pct = required > 0 ? Math.min(100, Math.round((received / required) * 100)) : 0;
                  const isDone = received >= required;
                  return (
                    <tr key={item.id}>
                      <td style={{ fontSize: 12 }}>{projectMap[item.projectId]?.name || '—'}</td>
                      <td><strong style={{ fontSize: 13 }}>{item.materialName}</strong></td>
                      <td style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{item.category || '—'}</td>
                      <td style={{ fontSize: 12 }}>{item.unit}</td>
                      <td style={{ fontSize: 12, textAlign: 'right' }}>{fmtVND(item.unitPrice || 0)}</td>
                      <td style={{ fontSize: 13, fontWeight: 700, textAlign: 'right' }}>{item.qtyRequired}</td>
                      <td>
                        <input type="number" className="form-input" style={{ padding: '3px 6px', fontSize: 12, width: 70, textAlign: 'right' }}
                          value={item.qtyOrdered || 0} min={0}
                          onChange={e => updateBoqQty(item, 'qtyOrdered', parseFloat(e.target.value) || 0)} />
                      </td>
                      <td>
                        <input type="number" className="form-input" style={{ padding: '3px 6px', fontSize: 12, width: 70, textAlign: 'right', color: isDone ? '#10B981' : undefined }}
                          value={item.qtyReceived || 0} min={0}
                          onChange={e => updateBoqQty(item, 'qtyReceived', parseFloat(e.target.value) || 0)} />
                      </td>
                      <td style={{ fontSize: 12, textAlign: 'right', fontWeight: 600 }}>{fmtVND(total)}</td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                          <div style={{ fontSize: 10, color: isDone ? '#10B981' : '#F59E0B', fontWeight: 700 }}>
                            {isDone ? '✅ Đủ' : `${pct}% nhận`}
                          </div>
                          <div style={{ height: 4, background: 'var(--color-border)', borderRadius: 2, width: 60 }}>
                            <div style={{ height: 4, width: `${pct}%`, background: isDone ? '#10B981' : '#F59E0B', borderRadius: 2, transition: 'width 0.3s' }} />
                          </div>
                        </div>
                      </td>
                      <td>
                        <button className="btn btn-danger btn-icon btn-sm" onClick={() => deleteBoq(item.id)}><Trash2 size={12} /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {filteredBoq.length > 0 && (
                <tfoot>
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'right', fontWeight: 700, fontSize: 13, paddingTop: 12 }}>Tổng chi phí vật tư:</td>
                    <td style={{ fontWeight: 800, fontSize: 14, color: 'var(--color-primary)' }}>
                      {fmtVND(filteredBoq.reduce((s, b) => s + (b.qtyRequired || 0) * (b.unitPrice || 0), 0))}
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* ===== THỐNG KÊ ===== */}
      {tab === 'thong-ke' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* BOQ by project */}
          {projects.map(proj => {
            const projBoq = boqList.filter(b => b.projectId === proj.id);
            if (projBoq.length === 0) return null;
            const total = projBoq.reduce((s, b) => s + (b.qtyRequired || 0) * (b.unitPrice || 0), 0);
            const received = projBoq.filter(b => (b.qtyReceived || 0) >= (b.qtyRequired || 0)).length;
            return (
              <div key={proj.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div>
                    <h3 style={{ fontSize: 15, fontWeight: 700 }}>{proj.name}</h3>
                    <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{projBoq.length} loại vật tư</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-primary)' }}>{fmtVND(total)}</div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{received}/{projBoq.length} đã nhận đủ</div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {projBoq.map(item => {
                    const pct = (item.qtyRequired || 0) > 0 ? Math.min(100, Math.round(((item.qtyReceived || 0) / (item.qtyRequired || 1)) * 100)) : 0;
                    return (
                      <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ minWidth: 180, fontSize: 13 }}>{item.materialName}</span>
                        <div style={{ flex: 1, height: 6, background: 'var(--color-border)', borderRadius: 3 }}>
                          <div style={{ height: 6, width: `${pct}%`, background: pct >= 100 ? '#10B981' : '#3B82F6', borderRadius: 3 }} />
                        </div>
                        <span style={{ fontSize: 12, color: 'var(--color-text-muted)', minWidth: 60, textAlign: 'right' }}>
                          {item.qtyReceived || 0}/{item.qtyRequired} {item.unit}
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 600, minWidth: 90, textAlign: 'right' }}>
                          {fmtVND((item.qtyRequired || 0) * (item.unitPrice || 0))}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {projects.every(p => boqList.filter(b => b.projectId === p.id).length === 0) && (
            <div className="card"><div className="empty-state">
              <div className="empty-state-icon">📊</div>
              <div className="empty-state-text">Chưa có dữ liệu BOQ</div>
            </div></div>
          )}
        </div>
      )}

      {/* Material Form Modal */}
      {showMatForm && (
        <MaterialForm
          material={editMat}
          onClose={() => { setShowMatForm(false); setEditMat(null); }}
          onSaved={refreshMaterials}
        />
      )}

      {/* BOQ Form Modal */}
      {showBoqForm && (
        <BoqForm
          boqItem={editBoq}
          projects={projects}
          materials={materials}
          onClose={() => { setShowBoqForm(false); setEditBoq(null); }}
          onSaved={refreshBoq}
        />
      )}
    </div>
  );
}

// ============================================================
// MATERIAL FORM
// ============================================================
function MaterialForm({ material, onClose, onSaved }: { material: Material | null; onClose: () => void; onSaved: () => void }) {
  const isEdit = !!material;
  const [form, setForm] = useState({
    name: material?.name ?? '',
    unit: material?.unit ?? 'cái',
    unitPrice: material?.unitPrice ?? 0,
    stockQty: material?.stockQty ?? 0,
    minStock: material?.minStock ?? 0,
    category: material?.category ?? '',
    supplier: material?.supplier ?? '',
    notes: material?.notes ?? '',
  });
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const url = isEdit ? `/api/materials/${material!.id}` : '/api/materials';
    await fetch(url, { method: isEdit ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    onSaved(); onClose(); setSaving(false);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{isEdit ? '✏️ Sửa vật tư' : '📦 Thêm vật tư mới'}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={submit} className="modal-body">
          <div className="form-group">
            <label className="form-label">Tên vật tư *</label>
            <input className="form-input" required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="VD: Ván MDF 18mm..." />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Nhóm vật liệu</label>
              <select className="form-select" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                <option value="">— Chọn —</option>
                {MATERIAL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Đơn vị tính</label>
              <select className="form-select" value={form.unit} onChange={e => setForm(p => ({ ...p, unit: e.target.value }))}>
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Đơn giá (VND)</label>
              <input type="number" className="form-input" min={0} value={form.unitPrice} onChange={e => setForm(p => ({ ...p, unitPrice: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Tồn kho hiện tại</label>
              <input type="number" className="form-input" min={0} step={0.5} value={form.stockQty} onChange={e => setForm(p => ({ ...p, stockQty: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Cảnh báo khi &lt;</label>
              <input type="number" className="form-input" min={0} step={0.5} value={form.minStock} onChange={e => setForm(p => ({ ...p, minStock: parseFloat(e.target.value) || 0 }))} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Nhà cung cấp</label>
            <input className="form-input" value={form.supplier} onChange={e => setForm(p => ({ ...p, supplier: e.target.value }))} placeholder="Tên nhà cung cấp..." />
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Hủy</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Đang lưu...' : isEdit ? 'Cập nhật' : 'Thêm vật tư'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================
// BOQ FORM
// ============================================================
function BoqForm({ boqItem, projects, materials, onClose, onSaved }: { boqItem: BoqItem | null; projects: Project[]; materials: Material[]; onClose: () => void; onSaved: () => void }) {
  const isEdit = !!boqItem;
  const [form, setForm] = useState({
    projectId: boqItem?.projectId ?? (projects[0]?.id ?? 0),
    materialName: boqItem?.materialName ?? '',
    unit: boqItem?.unit ?? 'cái',
    unitPrice: boqItem?.unitPrice ?? 0,
    qtyRequired: boqItem?.qtyRequired ?? 1,
    qtyOrdered: boqItem?.qtyOrdered ?? 0,
    qtyReceived: boqItem?.qtyReceived ?? 0,
    category: boqItem?.category ?? '',
    notes: boqItem?.notes ?? '',
  });
  const [saving, setSaving] = useState(false);

  function pickMaterial(mat: Material) {
    setForm(p => ({ ...p, materialName: mat.name, unit: mat.unit, unitPrice: mat.unitPrice || 0, category: mat.category || '' }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const url = isEdit ? `/api/boq/${boqItem!.id}` : '/api/boq';
    await fetch(url, { method: isEdit ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, projectId: Number(form.projectId) }) });
    onSaved(); onClose(); setSaving(false);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{isEdit ? '✏️ Sửa BOQ' : '📋 Thêm vật tư vào BOQ'}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={submit} className="modal-body">
          <div className="form-group">
            <label className="form-label">Dự án *</label>
            <select className="form-select" required value={form.projectId} onChange={e => setForm(p => ({ ...p, projectId: parseInt(e.target.value) }))}>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          {/* Quick pick from catalog */}
          {materials.length > 0 && (
            <div className="form-group">
              <label className="form-label">Chọn nhanh từ danh mục</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 100, overflowY: 'auto', padding: '6px 0' }}>
                {materials.map(m => (
                  <button key={m.id} type="button"
                    className={`worker-tag-btn ${form.materialName === m.name ? 'selected' : ''}`}
                    style={{ fontSize: 11, padding: '4px 10px' }}
                    onClick={() => pickMaterial(m)}
                  >{m.name}</button>
                ))}
              </div>
            </div>
          )}

          <div className="form-row">
            <div className="form-group" style={{ flex: 2 }}>
              <label className="form-label">Tên vật tư *</label>
              <input className="form-input" required value={form.materialName} onChange={e => setForm(p => ({ ...p, materialName: e.target.value }))} placeholder="Hoặc nhập tên vật tư..." />
            </div>
            <div className="form-group">
              <label className="form-label">ĐVT</label>
              <select className="form-select" value={form.unit} onChange={e => setForm(p => ({ ...p, unit: e.target.value }))}>
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Đơn giá (VND)</label>
              <input type="number" className="form-input" min={0} value={form.unitPrice} onChange={e => setForm(p => ({ ...p, unitPrice: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Số lượng cần</label>
              <input type="number" className="form-input" min={0} step={0.5} required value={form.qtyRequired} onChange={e => setForm(p => ({ ...p, qtyRequired: parseFloat(e.target.value) || 0 }))} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Hạng mục</label>
            <input className="form-input" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} placeholder="VD: Gia công tủ bếp..." />
          </div>
          {/* Thành tiền preview */}
          <div style={{ background: 'var(--color-primary-light)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--color-primary)', fontWeight: 700 }}>
            💰 Thành tiền dự kiến: {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(form.qtyRequired * form.unitPrice)}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Hủy</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Đang lưu...' : isEdit ? 'Cập nhật' : 'Thêm vào BOQ'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
