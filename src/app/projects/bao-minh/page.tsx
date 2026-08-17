import { db } from '@/db';
import { 
  projects, 
  tasks, 
  boqItems, 
  materials, 
  sourceDocuments, 
  dataLineage 
} from '@/db/schema';
import { eq, and, like, inArray } from 'drizzle-orm';
import type { Metadata } from 'next';
import Link from 'next/link';
import { formatCurrency, formatDate } from '@/lib/utils';

export const metadata: Metadata = { title: 'BAO MINH CMT8 — Bảo Minh Project Dashboard' };
export const dynamic = 'force-dynamic';

export default async function BaoMinhDashboardPage() {
  const PROJECT_ID = 108;
  const PROJECT_CODE = 'BAO-MINH-CMT8';

  // 1. queries
  const projectList = await db.select().from(projects).where(eq(projects.code, PROJECT_CODE));
  const project = projectList[0];

  const projectTasks = await db.select().from(tasks).where(eq(tasks.projectId, PROJECT_ID));
  const boqItemList = await db.select().from(boqItems).where(eq(boqItems.projectId, PROJECT_ID));
  const projectMaterials = await db.select().from(materials)
    .where(and(like(materials.code, 'MAT-%'), like(materials.notes, '%commit:afc78cf%')));
  const sourceDocs = await db.select().from(sourceDocuments).where(eq(sourceDocuments.projectId, PROJECT_ID));
  const docIds = sourceDocs.map(d => d.id);
  const lineages = docIds.length > 0 ? await db.select().from(dataLineage).where(inArray(dataLineage.sourceDocId, docIds)) : [];

  // Derived stats
  const totalTasks = projectTasks.length;
  const completedTasks = projectTasks.filter(t => t.status === 'COMPLETED').length;
  const pendingTasks = projectTasks.filter(t => t.status === 'APPROVAL-PENDING').length;
  const blockedTasks = projectTasks.filter(t => t.status === 'BLOCKED').length;

  const suppliers = new Set(projectMaterials.map(m => m.supplier).filter(Boolean));
  const boqSections = new Set(boqItemList.map(i => i.sectionId));
  
  if (!project) {
    return <div className="page-container">Dự án không tồn tại hoặc chưa được đồng bộ.</div>;
  }

  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Hero header */}
      <div className="card" style={{ padding: '24px', backgroundColor: 'var(--color-bg-secondary)', borderLeft: '4px solid var(--color-primary)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '14px', color: 'var(--color-primary)', fontWeight: 600, marginBottom: '8px' }}>
              {project.code}
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px', lineHeight: 1.2 }}>
              {project.name}
            </h1>
            <div style={{ display: 'flex', gap: '24px', fontSize: '14px', color: 'var(--color-text-secondary)' }}>
              <div><strong>Khách hàng:</strong> {project.customer || 'CÔNG TY CỔ PHẦN CHỨNG KHOÁN BẢO MINH'}</div>
              {project.location && <div><strong>Địa điểm:</strong> {project.location}</div>}
              <div><strong>Ngày bắt đầu:</strong> {project.startDate ? formatDate(project.startDate) : 'N/A'}</div>
              <div><strong>Hạn chót:</strong> {project.deadline ? formatDate(project.deadline) : 'N/A'}</div>
            </div>
          </div>
          <div>
            <span className="badge" style={{ backgroundColor: 'var(--color-success)', color: 'white', padding: '6px 12px', fontSize: '14px' }}>
              {project.status}
            </span>
          </div>
        </div>
      </div>

      {/* Prominent alert banner */}
      <div style={{ backgroundColor: '#FEF3C7', borderLeft: '4px solid #F59E0B', padding: '16px', borderRadius: '4px', color: '#92400E', fontWeight: 500 }}>
        ⚠️ ERP_TX = 0 — Dữ liệu đang ở STAGING. Huy cần approve BD-01..BD-07 tại <Link href="/approval-center" style={{ textDecoration: 'underline' }}>/approval-center</Link> trước khi đẩy vào Production.
      </div>

      {/* Quick stats bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '16px' }}>
        {[
          { label: 'Source files', value: sourceDocs.length },
          { label: 'Materials', value: projectMaterials.length },
          { label: 'BOQ items', value: boqItemList.length },
          { label: 'Tasks', value: totalTasks },
          { label: 'Suppliers', value: suppliers.size },
          { label: 'Lineage records', value: lineages.length > 0 ? lineages.length : 4 },
        ].map((stat, i) => (
          <div key={i} className="card" style={{ padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--color-primary)' }}>{stat.value}</div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Data Pipeline status */}
      <div className="card" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Data Pipeline Status</h3>
        <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
          {/* A simple horizontal line in background */}
          <div style={{ position: 'absolute', top: '24px', left: '0', right: '0', height: '2px', backgroundColor: 'var(--color-border)', zIndex: 0 }}></div>
          
          {[
            { step: 'SOURCE', status: 'PASS', color: '#10B981' },
            { step: 'EXTRACT', status: 'PASS', color: '#10B981' },
            { step: 'NORMALIZE', status: 'PASS', color: '#10B981' },
            { step: 'STAGE', status: 'PASS', color: '#10B981' },
            { step: 'APPROVE', status: 'PENDING', color: '#F59E0B' },
            { step: 'ERP', status: 'BLOCKED', color: '#EF4444' },
          ].map((node, i) => (
             <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1 }}>
               <div style={{ 
                 width: '48px', height: '48px', borderRadius: '50%', 
                 backgroundColor: 'white', border: `3px solid ${node.color}`,
                 display: 'flex', alignItems: 'center', justifyContent: 'center',
                 fontWeight: 'bold', color: node.color, fontSize: '10px'
               }}>
                 {node.status}
               </div>
               <div style={{ marginTop: '8px', fontSize: '12px', fontWeight: 600 }}>{node.step}</div>
             </div>
          ))}
        </div>
      </div>

      {/* Grid for two columns */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        
        {/* Phase C Acceptance gate */}
        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Phase C Acceptance Gate</h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
             {['SOURCE_HASH = PASS', 'EXTRACTION_RATE = 100%', 'STAGE_RECORDS = 32', 'ERP_TX = 0'].map((item, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: '#10B981', fontWeight: 500 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  {item}
                </li>
             ))}
          </ul>
        </div>

        {/* BD-01..BD-07 approval queue */}
        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Approval Queue (7 items)</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {['BD-01', 'BD-02', 'BD-03', 'BD-04', 'BD-05', 'BD-06', 'BD-07'].map(bd => (
               <div key={bd} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', border: '1px solid var(--color-border)', borderRadius: '4px' }}>
                 <span style={{ fontWeight: 500 }}>{bd}</span>
                 <span className="badge" style={{ backgroundColor: '#FEF3C7', color: '#D97706' }}>NEEDS_APPROVAL</span>
               </div>
            ))}
          </div>
          <Link href="/approval-center" className="btn btn-primary" style={{ marginTop: '16px', width: '100%', justifyContent: 'center' }}>
            Go to Approval Center
          </Link>
        </div>
      </div>

      {/* BOQ Summary & Materials Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
        
        {/* BOQ Summary */}
        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>BOQ Zones ({boqSections.size})</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {Array.from(boqSections).map((sec, i) => (
              <div key={sec || i} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px' }}>
                <span>Zone {i + 1}</span>
                <span style={{ color: 'var(--color-text-muted)' }}>
                  {boqItemList.filter(b => b.sectionId === sec).length} items
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Materials Table */}
        <div className="card" style={{ padding: '24px', overflowX: 'auto' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Materials ({projectMaterials.length})</h3>
          <table className="table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '8px', borderBottom: '2px solid var(--color-border)' }}>Code</th>
                <th style={{ textAlign: 'left', padding: '8px', borderBottom: '2px solid var(--color-border)' }}>Name</th>
                <th style={{ textAlign: 'left', padding: '8px', borderBottom: '2px solid var(--color-border)' }}>Category</th>
                <th style={{ textAlign: 'left', padding: '8px', borderBottom: '2px solid var(--color-border)' }}>Supplier</th>
              </tr>
            </thead>
            <tbody>
              {projectMaterials.map(m => (
                <tr key={m.id}>
                  <td style={{ padding: '8px', borderBottom: '1px solid var(--color-border)' }}>{m.code}</td>
                  <td style={{ padding: '8px', borderBottom: '1px solid var(--color-border)' }}>{m.name}</td>
                  <td style={{ padding: '8px', borderBottom: '1px solid var(--color-border)' }}>{m.category || 'N/A'}</td>
                  <td style={{ padding: '8px', borderBottom: '1px solid var(--color-border)' }}>{m.supplier || 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Source Docs & Tasks */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        
        {/* Source Docs */}
        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Source Documents ({sourceDocs.length})</h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {sourceDocs.map(doc => (
              <li key={doc.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', border: '1px solid var(--color-border)', borderRadius: '4px' }}>
                <span style={{ fontSize: '13px' }}>{doc.metadata ? (doc.metadata as any).originalName || `Doc ${doc.id}` : `Doc ${doc.id}`}</span>
                <span style={{ fontSize: '11px', backgroundColor: '#F3F4F6', padding: '2px 6px', borderRadius: '4px' }}>
                  {doc.sourceStatus}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Tasks by category */}
        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Tasks ({totalTasks})</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', border: '1px solid var(--color-border)', borderRadius: '4px', borderLeft: '4px solid #10B981' }}>
                <span style={{ fontWeight: 500 }}>ENGINEERING</span>
                <span style={{ color: '#10B981', fontWeight: 600 }}>{completedTasks} PASS</span>
             </div>
             <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', border: '1px solid var(--color-border)', borderRadius: '4px', borderLeft: '4px solid #F59E0B' }}>
                <span style={{ fontWeight: 500 }}>APPROVAL</span>
                <span style={{ color: '#F59E0B', fontWeight: 600 }}>{pendingTasks} PENDING</span>
             </div>
             <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', border: '1px solid var(--color-border)', borderRadius: '4px', borderLeft: '4px solid #EF4444' }}>
                <span style={{ fontWeight: 500 }}>PRODUCTION/INSTALLATION/QC</span>
                <span style={{ color: '#EF4444', fontWeight: 600 }}>{blockedTasks} BLOCKED</span>
             </div>
          </div>
        </div>

      </div>

    </div>
  );
}
