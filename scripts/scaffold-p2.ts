import * as fs from 'fs';
import * as path from 'path';

// Scaffold API
const apiPath = path.join(process.cwd(), 'src/app/api/engineering');
const models = [
  { name: 'surveys', dbTarget: 'surveys' },
  { name: 'designs', dbTarget: 'designs' },
  { name: 'approvals', dbTarget: 'approvals' },
  { name: 'production_releases', dbTarget: 'productionReleases' },
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
const uiPath = path.join(process.cwd(), 'src/app/engineering');
const pages = [
  {
    folder: 'surveys',
    title: 'Khảo sát công trình',
    desc: 'Quản lý lịch khảo sát và hồ sơ khảo sát.',
    icon: 'MapPin',
    apiRoute: '/api/engineering/surveys',
    interfaceName: 'SurveyItem',
    fields: [
      { key: 'projectId', label: 'ID Dự án', type: 'number' },
      { key: 'surveyDate', label: 'Ngày khảo sát', type: 'text' },
      { key: 'status', label: 'Trạng thái', type: 'select', options: ['PENDING', 'IN_PROGRESS', 'COMPLETED'] },
      { key: 'notes', label: 'Ghi chú', type: 'text' },
    ]
  },
  {
    folder: 'designs',
    title: 'Hồ sơ thiết kế & Bản vẽ',
    desc: 'Quản lý các phiên bản thiết kế và bản vẽ kỹ thuật.',
    icon: 'PenTool',
    apiRoute: '/api/engineering/designs',
    interfaceName: 'DesignItem',
    fields: [
      { key: 'projectId', label: 'ID Dự án', type: 'number' },
      { key: 'version', label: 'Phiên bản (V1, V2...)', type: 'text' },
      { key: 'status', label: 'Trạng thái', type: 'select', options: ['DRAFT', 'IN_REVIEW', 'APPROVED', 'REJECTED'] },
      { key: 'notes', label: 'Ghi chú', type: 'text' },
    ]
  },
  {
    folder: 'approvals',
    title: 'Duyệt mẫu & Vật liệu',
    desc: 'Theo dõi quá trình khách hàng phê duyệt thiết kế/vật liệu.',
    icon: 'CheckSquare',
    apiRoute: '/api/engineering/approvals',
    interfaceName: 'ApprovalItem',
    fields: [
      { key: 'designId', label: 'ID Thiết kế', type: 'number' },
      { key: 'customerId', label: 'ID Khách hàng', type: 'number' },
      { key: 'status', label: 'Trạng thái', type: 'select', options: ['PENDING', 'APPROVED', 'REJECTED'] },
      { key: 'comments', label: 'Phản hồi', type: 'text' },
    ]
  },
  {
    folder: 'production-releases',
    title: 'Phát hành sản xuất',
    desc: 'Lệnh phát hành bản vẽ chuẩn xuống xưởng.',
    icon: 'Send',
    apiRoute: '/api/engineering/production_releases',
    interfaceName: 'ProductionReleaseItem',
    fields: [
      { key: 'designId', label: 'ID Thiết kế', type: 'number' },
      { key: 'projectId', label: 'ID Dự án', type: 'number' },
      { key: 'status', label: 'Trạng thái', type: 'select', options: ['PENDING', 'RELEASED'] },
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

console.log('P2 Engineering Scaffolding completed!');
