import * as fs from 'fs';
import * as path from 'path';

// Scaffold API
const apiPath = path.join(process.cwd(), 'src/app/api/finance');
const models = [
  { name: 'vouchers', dbTarget: 'paymentVouchers' },
  { name: 'debts', dbTarget: 'debts' },
];

for (const model of models) {
  const dirPath = path.join(apiPath, model.name);
  fs.mkdirSync(dirPath, { recursive: true });

  const routeContent = `import { NextResponse } from 'next/server';
import { db } from '@/db';
import { ${model.dbTarget} } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';

export async function GET() {
  try {
    const data = await db.select().from(${model.dbTarget}).orderBy(desc(${model.dbTarget}.createdAt));
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const [newItem] = await db.insert(${model.dbTarget}).values(body).returning();
    return NextResponse.json(newItem);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
`;
  fs.writeFileSync(path.join(dirPath, 'route.ts'), routeContent);

  const idDirPath = path.join(dirPath, '[id]');
  fs.mkdirSync(idDirPath, { recursive: true });

  const idRouteContent = `import { NextResponse } from 'next/server';
import { db } from '@/db';
import { ${model.dbTarget} } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id);
    const body = await req.json();
    const [updatedItem] = await db.update(${model.dbTarget})
      .set({ ...body, updatedAt: new Date() })
      .where(eq(${model.dbTarget}.id, id))
      .returning();
    return NextResponse.json(updatedItem);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id);
    await db.delete(${model.dbTarget}).where(eq(${model.dbTarget}.id, id));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
`;
  fs.writeFileSync(path.join(idDirPath, 'route.ts'), idRouteContent);
}

// Scaffold UI
const uiPath = path.join(process.cwd(), 'src/app/finance');
const pages = [
  {
    folder: 'vouchers',
    title: 'Phiếu Thu / Chi',
    desc: 'Quản lý thu chi, sổ quỹ tiền mặt và ngân hàng.',
    icon: 'Banknote',
    apiRoute: '/api/finance/vouchers',
    interfaceName: 'PaymentVoucher',
    fields: [
      { key: 'code', label: 'Số Phiếu', type: 'text' },
      { key: 'type', label: 'Loại Phiếu', type: 'select', options: ['RECEIPT', 'PAYMENT'] },
      { key: 'amount', label: 'Số tiền', type: 'number' },
      { key: 'payerPayeeName', label: 'Người nộp/nhận tiền', type: 'text' },
      { key: 'description', label: 'Lý do', type: 'text' },
      { key: 'status', label: 'Trạng thái', type: 'select', options: ['COMPLETED', 'PENDING', 'CANCELLED'] },
    ]
  },
  {
    folder: 'debts',
    title: 'Công Nợ',
    desc: 'Quản lý phải thu khách hàng, phải trả nhà cung cấp.',
    icon: 'FileText',
    apiRoute: '/api/finance/debts',
    interfaceName: 'Debt',
    fields: [
      { key: 'code', label: 'Mã Công Nợ', type: 'text' },
      { key: 'type', label: 'Loại Công Nợ', type: 'select', options: ['RECEIVABLE', 'PAYABLE'] },
      { key: 'partnerType', label: 'Đối tượng', type: 'select', options: ['CUSTOMER', 'SUPPLIER', 'OTHER'] },
      { key: 'totalAmount', label: 'Tổng Nợ', type: 'number' },
      { key: 'remainingAmount', label: 'Còn Nợ', type: 'number' },
      { key: 'status', label: 'Trạng thái', type: 'select', options: ['UNPAID', 'PARTIAL', 'PAID', 'OVERDUE'] },
    ]
  }
];

for (const page of pages) {
  const dirPath = path.join(uiPath, page.folder);
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
    if (f.key.toLowerCase().includes('type')) {
        return `<td className="py-3 px-4"><span className="badge badge-neutral">{item.${f.key}}</span></td>`;
    }
    if (f.type === 'number') {
      return `<td className="py-3 px-4 font-semibold text-right">{Number(item.${f.key}).toLocaleString('vi-VN')} đ</td>`;
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
      const payload = { ...formData };
      const res = await fetch('${page.apiRoute}', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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

// Báo cáo dòng tiền
const cashflowPath = path.join(uiPath, 'cashflow');
fs.mkdirSync(cashflowPath, { recursive: true });

const cashflowContent = `'use client';

import { Activity, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import Link from 'next/link';

export default function CashflowPage() {
  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Activity className="text-primary" size={24} />
            Báo Cáo Dòng Tiền
          </h1>
          <p className="page-subtitle">Phân tích Thu / Chi và dự báo dòng tiền</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="card p-6 bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-blue-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-white/20 rounded-lg"><DollarSign size={20} /></div>
            <h3 className="font-medium text-blue-100">Số Dư Hiện Tại</h3>
          </div>
          <p className="text-3xl font-bold">1,250,000,000 đ</p>
        </div>
        
        <div className="card p-6 bg-gradient-to-br from-green-500 to-green-600 text-white shadow-green-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-white/20 rounded-lg"><TrendingUp size={20} /></div>
            <h3 className="font-medium text-green-100">Tổng Thu (Tháng)</h3>
          </div>
          <p className="text-3xl font-bold">+450,000,000 đ</p>
        </div>
        
        <div className="card p-6 bg-gradient-to-br from-red-500 to-red-600 text-white shadow-red-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-white/20 rounded-lg"><TrendingDown size={20} /></div>
            <h3 className="font-medium text-red-100">Tổng Chi (Tháng)</h3>
          </div>
          <p className="text-3xl font-bold">-210,000,000 đ</p>
        </div>
      </div>

      <div className="card p-8 text-center text-gray-500">
        <Activity size={48} className="mx-auto text-gray-300 mb-4" />
        <h3 className="text-lg font-medium text-gray-700 mb-2">Biểu đồ dòng tiền đang được cập nhật</h3>
        <p>Tính năng báo cáo đồ thị chi tiết đang được phát triển trong Sprint tiếp theo.</p>
      </div>
    </div>
  );
}
`;
fs.writeFileSync(path.join(cashflowPath, 'page.tsx'), cashflowContent);


console.log('P9 Finance Scaffolding completed!');
