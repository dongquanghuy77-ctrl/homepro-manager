import * as fs from 'fs';
import * as path from 'path';

const appPath = path.join(process.cwd(), 'src/app/crm');

const pages = [
  {
    folder: 'leads',
    title: 'Quản lý Khách hàng tiềm năng (Leads)',
    desc: 'Danh sách các khách hàng tiềm năng thu thập từ nhiều nguồn.',
    icon: 'UserPlus',
    apiRoute: '/api/crm/leads',
    interfaceName: 'LeadItem',
    fields: [
      { key: 'name', label: 'Họ tên', type: 'text' },
      { key: 'phone', label: 'Điện thoại', type: 'text' },
      { key: 'email', label: 'Email', type: 'text' },
      { key: 'company', label: 'Công ty', type: 'text' },
      { key: 'source', label: 'Nguồn', type: 'text' },
      { key: 'status', label: 'Trạng thái', type: 'select', options: ['NEW', 'CONTACTED', 'QUALIFIED', 'LOST', 'CONVERTED'] },
    ]
  },
  {
    folder: 'opportunities',
    title: 'Quản lý Cơ hội bán hàng (Opportunities)',
    desc: 'Theo dõi các cơ hội và tỷ lệ chốt sales.',
    icon: 'Briefcase',
    apiRoute: '/api/crm/opportunities',
    interfaceName: 'OpportunityItem',
    fields: [
      { key: 'name', label: 'Tên cơ hội', type: 'text' },
      { key: 'customerId', label: 'ID Khách hàng', type: 'number' },
      { key: 'estimatedValue', label: 'Giá trị dự kiến', type: 'number' },
      { key: 'probability', label: 'Tỷ lệ %', type: 'number' },
      { key: 'status', label: 'Trạng thái', type: 'select', options: ['NEW', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'] },
    ]
  },
  {
    folder: 'quotes',
    title: 'Quản lý Báo giá (Quotes)',
    desc: 'Các báo giá gửi cho khách hàng.',
    icon: 'FileText',
    apiRoute: '/api/crm/quotes',
    interfaceName: 'QuoteItem',
    fields: [
      { key: 'quoteNumber', label: 'Mã Báo Giá', type: 'text' },
      { key: 'customerId', label: 'ID Khách hàng', type: 'number' },
      { key: 'totalAmount', label: 'Tổng tiền', type: 'number' },
      { key: 'status', label: 'Trạng thái', type: 'select', options: ['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED'] },
    ]
  },
  {
    folder: 'contracts',
    title: 'Quản lý Hợp đồng (Contracts)',
    desc: 'Các hợp đồng đã ký kết.',
    icon: 'FileCheck',
    apiRoute: '/api/crm/contracts',
    interfaceName: 'ContractItem',
    fields: [
      { key: 'contractNumber', label: 'Mã Hợp Đồng', type: 'text' },
      { key: 'customerId', label: 'ID Khách hàng', type: 'number' },
      { key: 'totalAmount', label: 'Tổng tiền', type: 'number' },
      { key: 'status', label: 'Trạng thái', type: 'select', options: ['DRAFT', 'SIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] },
    ]
  }
];

for (const page of pages) {
  const dirPath = path.join(appPath, page.folder);
  fs.mkdirSync(dirPath, { recursive: true });

  const initialState = page.fields.reduce((acc, field) => {
    acc[field.key] = field.type === 'number' ? 0 : (field.type === 'select' ? field.options[0] : '');
    return acc;
  }, {} as any);

  let formFieldsUI = page.fields.map(f => {
    if (f.type === 'select') {
      return `
              <div>
                <label className="block text-sm font-medium mb-1">${f.label}</label>
                <select className="form-input w-full" value={formData.${f.key} as string} onChange={e => setFormData({...formData, ${f.key}: e.target.value})}>
                  ${f.options.map(o => `<option value="${o}">${o}</option>`).join('')}
                </select>
              </div>`;
    } else {
      return `
              <div>
                <label className="block text-sm font-medium mb-1">${f.label}</label>
                <input type="${f.type}" className="form-input w-full" value={formData.${f.key} as any} onChange={e => setFormData({...formData, ${f.key}: ${f.type === 'number' ? 'Number(e.target.value)' : 'e.target.value'}})} required />
              </div>`;
    }
  }).join('');

  let tableHeadersUI = page.fields.map(f => `<th className="text-left py-3 px-4 text-sm font-medium text-gray-500">${f.label}</th>`).join('');
  let tableRowUI = page.fields.map(f => {
    if (f.key.toLowerCase().includes('status')) {
      return `<td className="py-3 px-4"><span className="badge badge-primary">{item.${f.key}}</span></td>`;
    }
    if (f.type === 'number') {
      return `<td className="py-3 px-4">{Number(item.${f.key}).toLocaleString()}</td>`;
    }
    return `<td className="py-3 px-4">{item.${f.key}}</td>`;
  }).join('');

  const content = `'use client';

import { useState, useEffect } from 'react';
import { ${page.icon}, Search, Plus, Trash2 } from 'lucide-react';

interface ${page.interfaceName} {
  id: number;
${page.fields.map(f => `  ${f.key}: ${f.type === 'number' ? 'number' : 'string'};`).join('\n')}
  createdAt?: string;
}

export default function Page() {
  const [data, setData] = useState<${page.interfaceName}[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState(${JSON.stringify(initialState, null, 2)});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const res = await fetch('${page.apiRoute}');
      const json = await res.json();
      if (Array.isArray(json)) setData(json);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('${page.apiRoute}', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setShowAddModal(false);
        setFormData(${JSON.stringify(initialState)});
        loadData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Bạn có chắc muốn xoá?')) return;
    try {
      const res = await fetch(\`${page.apiRoute}/\${id}\`, { method: 'DELETE' });
      if (res.ok) loadData();
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <${page.icon} className="text-primary" size={24} />
            ${page.title}
          </h1>
          <p className="page-subtitle">${page.desc}</p>
        </div>
        <button className="btn btn-primary flex items-center gap-2" onClick={() => setShowAddModal(true)}>
          <Plus size={20} /> Thêm mới
        </button>
      </div>

      <div className="card">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input type="text" placeholder="Tìm kiếm..." className="form-input pl-10 w-full" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                ${tableHeadersUI}
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} className="text-center py-8 text-gray-500">Đang tải...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={10} className="text-center py-8 text-gray-500">Không có dữ liệu</td></tr>
              ) : (
                data.map((item) => (
                  <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    ${tableRowUI}
                    <td className="py-3 px-4 text-right">
                      <button onClick={() => handleDelete(item.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={18} /></button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 md:p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-800">Thêm mới</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">×</button>
            </div>
            <div className="p-4 md:p-6 overflow-y-auto flex-1">
              <form id="add-form" onSubmit={handleCreate} className="space-y-4">
                ${formFieldsUI}
              </form>
            </div>
            <div className="p-4 md:p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
              <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-secondary">Hủy</button>
              <button type="submit" form="add-form" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Đang lưu...' : 'Lưu lại'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
`;

  fs.writeFileSync(path.join(dirPath, 'page.tsx'), content);
}

console.log('CRM UI scaffolding completed!');
