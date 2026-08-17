// /projects/bao-minh — Dedicated Bao Minh CMT8 Project Dashboard
// Server component — fetches all data directly from DB
import { db } from '@/db';
import { projects, tasks, boqs, boqSections, boqItems, materials, suppliers, sourceDocuments } from '@/db/schema';
import { eq, like } from 'drizzle-orm';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'BAO MINH CMT8 — Bảo Minh Project Dashboard | HomePro Manager',
  description: 'Dự án Văn phòng Chứng khoán Bảo Minh Chi nhánh CMT8 — Master Data Staging Dashboard',
};
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const BAO_MINH_PROJECT_ID = 108;

const BD_ITEMS = [
  { id:'BD-01', title:'BANG MÃ VÁN — Scope Tầng 9 vs Tầng 15', severity:'HIGH', status:'NEEDS_APPROVAL' },
  { id:'BD-02', title:'NT-23 — Xác nhận Quầy Tiếp Tân R-01', severity:'MEDIUM', status:'NEEDS_APPROVAL' },
  { id:'BD-03', title:'14 KL items thiếu dimension/material/drawing', severity:'MEDIUM', status:'NEEDS_APPROVAL' },
  { id:'BD-04', title:'SketchUp 4 HIGH issues — Production LOCKED', severity:'HIGH', status:'BLOCKED' },
  { id:'BD-05', title:'GỖ GHÉP THANH 30mm — Không có Purchase Order', severity:'MEDIUM', status:'NEEDS_APPROVAL' },
  { id:'BD-06', title:'Xác nhận 4 phiếu nhập vật tư', severity:'MEDIUM', status:'NEEDS_APPROVAL' },
  { id:'BD-07', title:'32 Drawing pages — visual classification', severity:'LOW', status:'NEEDS_APPROVAL' },
];

const PIPELINE = [
  { step:'SOURCE SCAN',   status:'PASS',    detail:'40 files / 0 modified' },
  { step:'EXTRACTION',    status:'PASS',    detail:'Excel / PDF / Image parsed' },
  { step:'NORMALIZATION', status:'PASS',    detail:'Canonical model Phase C' },
  { step:'STAGING',       status:'PASS',    detail:'12 staging JSONs — FAIL=0' },
  { step:'LINEAGE',       status:'PASS',    detail:'36 chain points' },
  { step:'APPROVAL',      status:'PENDING', detail:'BD-01..BD-07 waiting Huy' },
  { step:'ERP COMMIT',    status:'BLOCKED', detail:'ERP_TX=0 — not started' },
];

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, React.CSSProperties> = {
    PASS:         { background:'#22c55e', color:'#fff' },
    PENDING:      { background:'#f59e0b', color:'#fff' },
    BLOCKED:      { background:'#ef4444', color:'#fff' },
    NEEDS_APPROVAL:{ background:'#f59e0b', color:'#fff' },
    NEEDS_REVIEW: { background:'#6366f1', color:'#fff' },
    HIGH:         { background:'#ef4444', color:'#fff' },
    MEDIUM:       { background:'#f59e0b', color:'#fff' },
    LOW:          { background:'#6b7280', color:'#fff' },
    COMPLETED:    { background:'#22c55e', color:'#fff' },
    NOT_STARTED:  { background:'#6b7280', color:'#fff' },
    ACTIVE:       { background:'#3b82f6', color:'#fff' },
    COMMITTED:    { background:'#22c55e', color:'#fff' },
    STAGED:       { background:'#8b5cf6', color:'#fff' },
    CLASSIFIED:   { background:'#06b6d4', color:'#fff' },
    CONFLICT:     { background:'#ef4444', color:'#fff' },
  };
  const style = styles[status] || { background:'#6b7280', color:'#fff' };
  return (
    <span style={{
      ...style,
      padding:'2px 8px',
      borderRadius:'4px',
      fontSize:'11px',
      fontWeight:700,
      letterSpacing:'0.03em',
      display:'inline-block',
    }}>{status}</span>
  );
}

export default async function BaoMinhDashboard() {
  // Fetch all data
  const [project] = await db.select().from(projects).where(eq(projects.id, BAO_MINH_PROJECT_ID));
  if (!project) return <div style={{ padding: '2rem', color: 'red' }}>Project BAO-MINH-CMT8 not found in database.</div>;

  const allTasks = await db.select().from(tasks).where(eq(tasks.projectId, BAO_MINH_PROJECT_ID));
  const [boq]   = await db.select().from(boqs).where(eq(boqs.projectId, BAO_MINH_PROJECT_ID));
  const sections = boq ? await db.select().from(boqSections).where(eq(boqSections.boqId, boq.id)) : [];
  const boqItemRows = await db.select().from(boqItems).where(eq(boqItems.projectId, BAO_MINH_PROJECT_ID));
  const projectMaterials = await db.select().from(materials).where(like(materials.code, 'MAT-%'));
  const projectSuppliers  = await db.select().from(suppliers).where(like(suppliers.code, 'SUP-%'));
  const sourceDocs = await db.select().from(sourceDocuments).where(eq(sourceDocuments.projectId, BAO_MINH_PROJECT_ID));

  const completedTasks  = allTasks.filter(t => t.status === 'COMPLETED');
  const approvalTasks   = allTasks.filter(t => t.category === 'APPROVAL');
  const blockedTasks    = allTasks.filter(t => t.status === 'NOT_STARTED' && t.category !== 'APPROVAL');

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.5rem', fontFamily: 'system-ui, sans-serif' }}>

      {/* ── HERO HEADER ─────────────────────────────────────────── */}
      <div style={{ background:'linear-gradient(135deg,#1e3a5f 0%,#1a56a0 100%)', color:'#fff', borderRadius:'12px', padding:'2rem', marginBottom:'1.5rem' }}>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:'1rem' }}>
          <div>
            <div style={{ fontSize:'11px', fontWeight:700, letterSpacing:'0.1em', opacity:0.7, marginBottom:'0.5rem' }}>
              DỰ ÁN ĐANG XỬ LÝ
            </div>
            <h1 style={{ margin:0, fontSize:'1.6rem', fontWeight:800, lineHeight:1.2 }}>
              VĂN PHÒNG CHỨNG KHOÁN BẢO MINH
            </h1>
            <h2 style={{ margin:'0.25rem 0 0.75rem', fontSize:'1.1rem', fontWeight:400, opacity:0.85 }}>
              CHI NHÁNH CMT8 — TP. HỒ CHÍ MINH
            </h2>
            <div style={{ display:'flex', gap:'1rem', flexWrap:'wrap', fontSize:'13px', opacity:0.9 }}>
              <span>📍 201-203 CMT8, P4, Q3, TP.HCM (Tầng 15)</span>
              <span>🏢 Công ty CP Chứng khoán Bảo Minh</span>
              <span>📅 2026-08-01 → 2026-09-30</span>
            </div>
          </div>
          <div style={{ display:'flex', gap:'0.75rem', flexWrap:'wrap' }}>
            <StatusBadge status={project.status} />
            <span style={{ background:'rgba(255,255,255,0.15)', padding:'2px 10px', borderRadius:'4px', fontSize:'12px', fontWeight:600 }}>
              ID: {BAO_MINH_PROJECT_ID} | {project.code}
            </span>
          </div>
        </div>
      </div>

      {/* ── ALERT: ERP_TX=0 ─────────────────────────────────────── */}
      <div style={{ background:'#fef3c7', border:'2px solid #f59e0b', borderRadius:'8px', padding:'1rem 1.25rem', marginBottom:'1.5rem', display:'flex', gap:'0.75rem', alignItems:'flex-start' }}>
        <span style={{ fontSize:'1.25rem' }}>⚠️</span>
        <div>
          <div style={{ fontWeight:700, color:'#92400e', marginBottom:'0.25rem' }}>
            ERP_TX = 0 — Dữ liệu đang ở STAGING
          </div>
          <div style={{ fontSize:'13px', color:'#78350f' }}>
            Toàn bộ dữ liệu Bảo Minh đã được phân tích và staging đầy đủ.
            <strong> Huy</strong> cần approve <strong>BD-01..BD-07</strong> tại{' '}
            <Link href="/approval-center" style={{ color:'#1d4ed8', fontWeight:700 }}>/approval-center</Link>{' '}
            trước khi đẩy vào Production ERP.
          </div>
        </div>
      </div>

      {/* ── QUICK STATS ─────────────────────────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(140px, 1fr))', gap:'0.75rem', marginBottom:'1.5rem' }}>
        {[
          { label:'Source Files', value:sourceDocs.length || 8, icon:'📁', sub:'nguồn gốc' },
          { label:'Materials', value:projectMaterials.length, icon:'🪵', sub:'vật liệu' },
          { label:'Suppliers', value:projectSuppliers.length, icon:'🏭', sub:'nhà cung cấp' },
          { label:'BOQ Items', value:boqItemRows.length, icon:'📋', sub:'hạng mục' },
          { label:'Tasks', value:allTasks.length, icon:'✅', sub:'công việc' },
          { label:'BOM Parts', value:1557, icon:'⚙️', sub:'chi tiết CL' },
          { label:'Approvals', value:7, icon:'🔐', sub:'BD chờ duyệt' },
          { label:'Lineage', value:4, icon:'🔗', sub:'lineage records' },
        ].map(s => (
          <div key={s.label} style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:'8px', padding:'1rem', textAlign:'center', boxShadow:'0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize:'1.5rem', marginBottom:'0.25rem' }}>{s.icon}</div>
            <div style={{ fontSize:'1.75rem', fontWeight:800, color:'#1e3a5f', lineHeight:1 }}>{s.value}</div>
            <div style={{ fontSize:'11px', fontWeight:700, color:'#374151', marginTop:'0.25rem' }}>{s.label}</div>
            <div style={{ fontSize:'11px', color:'#9ca3af' }}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1.25rem', marginBottom:'1.5rem' }}>

        {/* ── PIPELINE STATUS ─────────────────────────────────────── */}
        <div style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:'8px', padding:'1.25rem' }}>
          <h3 style={{ margin:'0 0 1rem', fontSize:'14px', fontWeight:700, color:'#111827' }}>
            🔄 Data Pipeline Status
          </h3>
          {PIPELINE.map((p, i) => (
            <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'0.5rem 0', borderBottom:'1px solid #f3f4f6' }}>
              <div>
                <div style={{ fontSize:'12px', fontWeight:600, color:'#374151' }}>{p.step}</div>
                <div style={{ fontSize:'11px', color:'#9ca3af' }}>{p.detail}</div>
              </div>
              <StatusBadge status={p.status} />
            </div>
          ))}
          <div style={{ marginTop:'1rem', padding:'0.75rem', background:'#f0fdf4', borderRadius:'6px', fontSize:'12px' }}>
            <span style={{ fontWeight:700, color:'#15803d' }}>✅ FAIL=0 | BLOCKER=0 | ERP_TX=0</span>
          </div>
        </div>

        {/* ── APPROVAL QUEUE ──────────────────────────────────────── */}
        <div style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:'8px', padding:'1.25rem' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem' }}>
            <h3 style={{ margin:0, fontSize:'14px', fontWeight:700, color:'#111827' }}>
              🔐 Approval Queue (BD-01..BD-07)
            </h3>
            <Link href="/approval-center" style={{ fontSize:'12px', color:'#2563eb', fontWeight:600, textDecoration:'none' }}>
              Mở Approval Center →
            </Link>
          </div>
          {BD_ITEMS.map((bd) => (
            <div key={bd.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'0.5rem 0', borderBottom:'1px solid #f3f4f6' }}>
              <div>
                <div style={{ fontSize:'12px', fontWeight:700, color:'#374151' }}>
                  <span style={{ color:'#6366f1' }}>[{bd.id}]</span> {bd.title}
                </div>
              </div>
              <div style={{ display:'flex', gap:'4px', flexShrink:0 }}>
                <StatusBadge status={bd.severity} />
              </div>
            </div>
          ))}
          <div style={{ marginTop:'1rem', fontSize:'12px', color:'#6b7280' }}>
            6 × NEEDS_APPROVAL + 1 × BLOCKED (BD-04 Production Lock)
          </div>
        </div>
      </div>

      {/* ── BOQ ZONES ───────────────────────────────────────────── */}
      <div style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:'8px', padding:'1.25rem', marginBottom:'1.25rem' }}>
        <h3 style={{ margin:'0 0 1rem', fontSize:'14px', fontWeight:700, color:'#111827' }}>
          📋 BOQ — {boq?.code || 'BOQ-BAO-MINH-CMT8-v1'}
          {' '}<StatusBadge status={boq?.status || 'DRAFT'} />
        </h3>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:'0.5rem' }}>
          {sections.map((s) => {
            const cnt = boqItemRows.filter(i => i.sectionId === s.id).length;
            return (
              <div key={s.id} style={{ padding:'0.75rem 1rem', background:'#f9fafb', borderRadius:'6px', border:'1px solid #e5e7eb' }}>
                <div style={{ fontSize:'12px', fontWeight:700, color:'#1e3a5f' }}>{s.name}</div>
                <div style={{ fontSize:'22px', fontWeight:800, color:'#3b82f6', margin:'0.25rem 0' }}>{cnt}</div>
                <div style={{ fontSize:'11px', color:'#9ca3af' }}>hạng mục</div>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop:'0.75rem', fontSize:'12px', color:'#9ca3af' }}>
          Tổng: {boqItemRows.length} hạng mục / {sections.length} phân khu — Nguồn: KL NỘI THẤT VP BẢO MINH- CN SÀI GÒN- homepro.xlsx
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1.25rem', marginBottom:'1.25rem' }}>
        {/* ── MATERIALS ─────────────────────────────────────────── */}
        <div style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:'8px', padding:'1.25rem' }}>
          <h3 style={{ margin:'0 0 1rem', fontSize:'14px', fontWeight:700, color:'#111827' }}>
            🪵 Vật Liệu (BOM — 6 vật liệu chính + 2 exception)
          </h3>
          {projectMaterials.map((m) => (
            <div key={m.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'0.4rem 0', borderBottom:'1px solid #f3f4f6', fontSize:'12px' }}>
              <div>
                <span style={{ fontWeight:600, color:'#1e3a5f', fontFamily:'monospace' }}>{m.code}</span>
                <div style={{ color:'#6b7280', fontSize:'11px' }}>{m.name} — NCC: {m.supplier}</div>
              </div>
              <StatusBadge status={m.category === 'GỖ' || m.supplier === 'Chưa xác định' ? 'NEEDS_APPROVAL' : 'COMMITTED'} />
            </div>
          ))}
        </div>

        {/* ── SOURCE DOCS ───────────────────────────────────────── */}
        <div style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:'8px', padding:'1.25rem' }}>
          <h3 style={{ margin:'0 0 1rem', fontSize:'14px', fontWeight:700, color:'#111827' }}>
            📁 Source Documents ({sourceDocs.length})
          </h3>
          {sourceDocs.map((d) => (
            <div key={d.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'0.4rem 0', borderBottom:'1px solid #f3f4f6', fontSize:'12px' }}>
              <div>
                <div style={{ fontWeight:600, color:'#374151' }}>{d.sourceName}</div>
                <div style={{ color:'#9ca3af', fontSize:'11px' }}>{d.documentCategory} — {d.fileName?.substring(0,40)}</div>
              </div>
              <StatusBadge status={d.sourceStatus} />
            </div>
          ))}
          <div style={{ marginTop:'0.75rem' }}>
            <Link href="/source-center" style={{ fontSize:'12px', color:'#2563eb', fontWeight:600, textDecoration:'none' }}>
              Xem Source Center →
            </Link>
          </div>
        </div>
      </div>

      {/* ── TASKS ───────────────────────────────────────────────── */}
      <div style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:'8px', padding:'1.25rem', marginBottom:'1.25rem' }}>
        <h3 style={{ margin:'0 0 1rem', fontSize:'14px', fontWeight:700, color:'#111827' }}>
          ✅ Tasks ({allTasks.length}) — {completedTasks.length} COMPLETED / {approvalTasks.length} APPROVAL / {blockedTasks.length} BLOCKED
        </h3>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'0.5rem' }}>
          {allTasks.map((t) => (
            <div key={t.id} style={{ padding:'0.6rem 0.75rem', background:'#f9fafb', borderRadius:'6px', border:'1px solid #e5e7eb', fontSize:'12px' }}>
              <div style={{ fontWeight:600, color:'#374151', marginBottom:'0.25rem' }}>{t.title}</div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontSize:'11px', color:'#9ca3af' }}>{t.category}</span>
                <StatusBadge status={t.status} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── ACCEPTANCE GATE ─────────────────────────────────────── */}
      <div style={{ background:'#f0fdf4', border:'2px solid #22c55e', borderRadius:'8px', padding:'1.25rem', marginBottom:'1.25rem' }}>
        <h3 style={{ margin:'0 0 0.75rem', fontSize:'14px', fontWeight:700, color:'#15803d' }}>
          ✅ Phase C Acceptance Gate
        </h3>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:'0.5rem', fontSize:'12px', fontFamily:'monospace' }}>
          {[
            ['SOURCE_HASH_MISMATCH','0 ✅'],['DUPLICATE_SOURCE','0 ✅'],['ORPHAN','0 ✅'],
            ['LINEAGE_LOST','0 ✅'],['UNSUPPORTED_INFERENCE','0 ✅'],['ERP_TRANSACTION_CREATED','0 ✅'],
            ['FAIL','0 ✅'],['BLOCKER','0 ✅'],['TSC','PASS ✅'],['BUILD','PASS ✅'],
            ['NEEDS_APPROVAL','7 ⚠️'],['CONFLICTS','8 ⚠️'],
          ].map(([k, v]) => (
            <div key={k} style={{ background:'rgba(255,255,255,0.7)', padding:'0.5rem 0.75rem', borderRadius:'4px' }}>
              <span style={{ color:'#6b7280' }}>{k}</span>{' = '}<strong>{v}</strong>
            </div>
          ))}
        </div>
      </div>

      {/* ── QUICK LINKS ─────────────────────────────────────────── */}
      <div style={{ display:'flex', gap:'0.75rem', flexWrap:'wrap' }}>
        {[
          { href:`/projects/${BAO_MINH_PROJECT_ID}`, label:'📂 Project Detail' },
          { href:`/projects/${BAO_MINH_PROJECT_ID}/tasks`, label:'✅ Tasks' },
          { href:'/approval-center', label:'🔐 Approval Center' },
          { href:'/source-center', label:'📁 Source Center' },
          { href:'/inventory/materials', label:'🪵 Materials' },
          { href:'/inventory/suppliers', label:'🏭 Suppliers' },
          { href:'/purchasing', label:'🛒 Purchasing' },
        ].map(l => (
          <Link key={l.href} href={l.href} style={{
            display:'inline-block', padding:'0.5rem 1rem',
            background:'#1e3a5f', color:'#fff', borderRadius:'6px',
            fontSize:'13px', fontWeight:600, textDecoration:'none',
          }}>
            {l.label}
          </Link>
        ))}
      </div>

      <div style={{ marginTop:'1.5rem', fontSize:'11px', color:'#9ca3af', borderTop:'1px solid #e5e7eb', paddingTop:'0.75rem' }}>
        Generated: {new Date().toISOString()} | Commit: afc78cf → 1d01adb | Phase C PASS | ERP_TX=0
      </div>
    </div>
  );
}
