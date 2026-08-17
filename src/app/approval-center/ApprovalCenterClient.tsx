'use client';

import React, { useState, useCallback } from 'react';

/* ─── Types ─────────────────────────────────────────────────────────────── */
type Severity = 'HIGH' | 'MEDIUM' | 'LOW';
type DecisionType = 'APPROVED' | 'REJECTED' | 'CORRECTION_REQUIRED' | null;

interface ApprovalItem {
  id: string;
  priority: number;
  severity: Severity;
  category: string;
  title: string;
  source_file: string;
  issue: string;
  evidence?: string | object;
  current_status: string;
  erp_blocked: boolean;
  decision: DecisionType;
  decided_by: string | null;
  decided_at: string | null;
  override_reason?: string;
  history?: { action: string; by: string; at: string; note: string }[];
}

interface ConflictItem {
  id: string;
  type: string;
  severity: Severity;
  source: string;
  description: string;
  bd_ref: string;
  status: string;
}

/* ─── Mocked data — in production, load from staging/staging-approval-queue.json ─ */
const APPROVAL_QUEUE: ApprovalItem[] = [
  {
    id: 'BD-01', priority: 1, severity: 'HIGH', category: 'SCOPE_CONFLICT',
    title: 'BANG MÃ VÁN BMS T15.xlsx — Tầng 9 hay Tầng 15?',
    source_file: 'BANG MÃ VAN BMS T15.xlsx',
    issue: 'Filename ghi T15 nhưng content text ghi "TẦNG 9". Số lượng không khớp BOQ T15 (24 bàn vs 6 bàn).',
    evidence: 'Text: "BẢNG FINAL MÃ VÁN VĂN PHÒNG BMS TẦNG 9" | Qty mismatch 4× vs BOQ T15',
    current_status: 'BLOCKED', erp_blocked: true,
    decision: null, decided_by: null, decided_at: null, history: []
  },
  {
    id: 'BD-02', priority: 2, severity: 'MEDIUM', category: 'DRAWING_CLASSIFICATION',
    title: 'NT-23 — Xác nhận QUẦY TIẾP TÂN R-01',
    source_file: 'NT-23.pdf',
    issue: 'Directive mapping cũ ghi SAI là "rèm/rãnh". Text layer PDF xác nhận đây là CHI TIẾT QUẦY TIẾP TÂN R-01.',
    evidence: 'pdfjs text (1486 chars): "CHI TIẾT QUẦY TIẾP TÂN R-01 PHÒNG LÀM VIỆC NT-23 1/30 REV0 05/08/2026"\nMaterials: MDF+Laminate vân đá, MFC MS 204 SH, MFC HN-111G, Mica xanh, LED CT-01\nProposed BOQ links: B.II.4 (Quầy lễ tân 3.6md), B.II.6 (Hệ quầy giao dịch)',
    current_status: 'NEEDS_APPROVAL', erp_blocked: false,
    decision: null, decided_by: null, decided_at: null, history: []
  },
  {
    id: 'BD-03', priority: 3, severity: 'MEDIUM', category: 'BOQ_CLARIFICATION',
    title: '14 KL Clarification Items',
    source_file: 'KL NỘI THẤT VP BẢO MINH- CN SÀI GÒN- homepro.xlsx',
    issue: '14 BOQ items thiếu: dimension, material, drawing reference, hoặc description mơ hồ. Cần Huy xác nhận từng item.',
    evidence: 'Items: A.I.4, B.I.5, B.II.7, B.II.14, C.I.4, C.II.1, D.I.4, D.I.9, D.II.3, E.I.6, E.I.7, E.II.4, F.I.2, G.I.1',
    current_status: 'NEEDS_APPROVAL', erp_blocked: false,
    decision: null, decided_by: null, decided_at: null, history: []
  },
  {
    id: 'BD-04', priority: 1, severity: 'HIGH', category: 'SKETCHUP_PRODUCTION_LOCK',
    title: '4 SketchUp HIGH Issues — Production Locked',
    source_file: 'KHAI TRIỂN VĂN PHÒNG BẢO MINH.skp',
    issue: 'Production LOCKED cho đến khi 4 HIGH issues được resolve: Trần clearance, Room dimensions, MEP coordination, NT-23 directive.',
    evidence: 'SKP-APRV-01: Trần H=2540mm vs MEP unknown\nSKP-APRV-02: Total run 10,470mm vs actual unmeasured\nSKP-APRV-03: No MEP in SKP model\nSKP-APRV-04: NT-23 was CURTAIN_RAIL → RECEPTION_COUNTER',
    current_status: 'BLOCKED', erp_blocked: true,
    decision: null, decided_by: null, decided_at: null, history: []
  },
  {
    id: 'BD-05', priority: 2, severity: 'MEDIUM', category: 'MATERIAL_EXCEPTION',
    title: 'GỖ GHÉP THANH 30mm — Không có trong Purchase Docs',
    source_file: 'bom-KHAI TRIỂN VĂN PHÒNG BẢO MINH.xlsx',
    issue: '1 tấm GỖ GHÉP THANH 30mm có trong BOM và 12 "hồi" parts trong Cut List nhưng KHÔNG trong bất kỳ phiếu nhập nào.',
    evidence: 'BOM row 9: GO GHEP THANH-30 = 1 tấm\nCL: 12 parts "hồi" 30mm — 4× 2128.3×100mm + 8× 483.8×100mm\nAssembly: 1 assembly (unnamed/null ID)\nPO: NOT FOUND | VẬT TƯ HN: NOT FOUND | BOQ: NOT FOUND',
    current_status: 'NEEDS_APPROVAL', erp_blocked: false,
    decision: null, decided_by: null, decided_at: null, history: []
  },
  {
    id: 'BD-06', priority: 2, severity: 'MEDIUM', category: 'PURCHASE_CONFIRMATION',
    title: '4 Purchase Documents — Cần xác nhận supplier/warehouse',
    source_file: 'PHIẾU NHẬP VẬT TƯ.zip',
    issue: '4 phiếu nhập vật tư (ảnh chụp). Cần xác nhận: supplier ID trong hệ thống, warehouse đầu vào, unit price để tạo Stock Entry.',
    evidence: 'SOURCE-01: THAN TRE ×10\nSOURCE-02: HN-111G 17LY×65 + 9LY×26\nSOURCE-03: AC-9205S ×4\nSOURCE-04: BT-SC010MW 17×67 + 10×21 + BT-200T×6',
    current_status: 'NEEDS_APPROVAL', erp_blocked: false,
    decision: null, decided_by: null, decided_at: null, history: []
  },
  {
    id: 'BD-07', priority: 3, severity: 'LOW', category: 'ZONE_VISUAL_REVIEW',
    title: '32 Drawing Pages — Visual Inspection Required',
    source_file: '060826_TKNT_VP BAO MINH.pdf',
    issue: 'Pages 4-35 là bản vẽ kỹ thuật dạng hình ảnh (3D perspectives). Zone/material/dimension không thể auto-extract.',
    evidence: '32 pages: p4-p35\nStatus: IMAGE_ONLY — không có text layer đủ để parse\nAction: Huy mở PDF và điền zone + BOQ link cho từng trang',
    current_status: 'NEEDS_APPROVAL', erp_blocked: false,
    decision: null, decided_by: null, decided_at: null, history: []
  },
];

const CONFLICTS: ConflictItem[] = [
  { id:'CONF-001', type:'SCOPE_MISMATCH', severity:'HIGH', source:'BANG MÃ VAN BMS T15.xlsx', description:'Filename=T15, content=T9, qty mismatch 4×', bd_ref:'BD-01', status:'UNRESOLVED' },
  { id:'CONF-002', type:'DIRECTIVE_ERROR', severity:'MEDIUM', source:'NT-23.pdf', description:'Directive CURTAIN_RAIL → thực tế RECEPTION_COUNTER', bd_ref:'BD-02', status:'DOCUMENTED' },
  { id:'CONF-003', type:'MATERIAL_MISMATCH', severity:'MEDIUM', source:'SketchUp vs Survey', description:'SKP: AC-9205S | Survey M05/M06: MS-608EV', bd_ref:'BD-04', status:'UNRESOLVED' },
  { id:'CONF-004', type:'MATERIAL_NO_BOQ', severity:'MEDIUM', source:'THAN TRE ×10', description:'Material mua, có trong BOM/CL nhưng không có BOQ item', bd_ref:'—', status:'UNRESOLVED' },
  { id:'CONF-005', type:'MATERIAL_NOT_PURCHASED', severity:'MEDIUM', source:'GO GHEP THANH 30mm', description:'1 tấm trong BOM, 12 parts CL, không có PO', bd_ref:'BD-05', status:'NEEDS_APPROVAL' },
  { id:'CONF-006', type:'QTY_VARIANCE', severity:'LOW', source:'BOM vs PO', description:'PO > BOM: HN-111G +3, BT-SC010MW +2, HN-9LY +1, BT-SC010MW-10 +1', bd_ref:'BD-06', status:'DOCUMENTED' },
  { id:'CONF-007', type:'SUPPLIER_NAME_UNCONFIRMED', severity:'LOW', source:'BT code', description:'BT supplier code dùng nhưng full legal name chưa confirm', bd_ref:'BD-06', status:'NEEDS_APPROVAL' },
  { id:'CONF-008', type:'MATERIAL_CODE_MISSING', severity:'MEDIUM', source:'NT-23.pdf — MS 204 SH', description:'MS 204 SH có trong drawing nhưng không có trong supplier register', bd_ref:'—', status:'NEW' },
];

/* ─── Helpers ───────────────────────────────────────────────────────────── */
const SEV_COLOR: Record<Severity, string> = {
  HIGH:   'var(--color-danger,#dc2626)',
  MEDIUM: 'var(--color-warning,#d97706)',
  LOW:    'var(--color-success,#16a34a)',
};

const STATUS_COLOR: Record<string, string> = {
  BLOCKED:                  '#dc2626',
  NEEDS_APPROVAL:           '#d97706',
  DOCUMENTED:               '#2563eb',
  'DOCUMENTED_PENDING_APPROVAL': '#d97706',
  'DOCUMENTED_MAY_BE_BUFFER': '#16a34a',
  UNRESOLVED:               '#dc2626',
  NEW:                      '#7c3aed',
  APPROVED:                 '#16a34a',
  REJECTED:                 '#dc2626',
  CORRECTION_REQUIRED:      '#d97706',
};

function Badge({ text, color }: { text: string; color: string }) {
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 4,
      fontSize: 11, fontWeight: 700, color: '#fff', background: color,
      letterSpacing: '0.05em', textTransform: 'uppercase',
    }}>{text}</span>
  );
}

/* ─── Override modal ────────────────────────────────────────────────────── */
function OverrideModal({
  item, onClose, onSubmit
}: {
  item: ApprovalItem;
  onClose: () => void;
  onSubmit: (decision: DecisionType, reason: string, note: string) => void;
}) {
  const [decision, setDecision] = useState<DecisionType>('APPROVED');
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div style={{
        background: 'var(--color-surface, #fff)', borderRadius: 12, padding: 32,
        width: 560, maxWidth: '90vw', maxHeight: '80vh', overflow: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }} onClick={e => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700 }}>{item.id} — Quyết định</h3>
        <p style={{ margin: '0 0 20px', color: 'var(--color-text-2,#666)', fontSize: 13 }}>{item.title}</p>

        <label style={{ display: 'block', marginBottom: 12 }}>
          <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 13 }}>Quyết định</div>
          <select value={decision || ''} onChange={e => setDecision(e.target.value as DecisionType)}
            style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14 }}>
            <option value="APPROVED">✅ APPROVED — Chấp nhận giá trị phân tích</option>
            <option value="REJECTED">❌ REJECTED — Từ chối, cần làm lại</option>
            <option value="CORRECTION_REQUIRED">✏️ CORRECTION_REQUIRED — Chấp nhận nhưng cần sửa giá trị</option>
          </select>
        </label>

        <label style={{ display: 'block', marginBottom: 12 }}>
          <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 13 }}>Lý do / Quyết định nghiệp vụ *</div>
          <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3}
            placeholder="Bắt buộc — ghi rõ cơ sở quyết định..."
            style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }} />
        </label>

        {decision === 'CORRECTION_REQUIRED' && (
          <label style={{ display: 'block', marginBottom: 12 }}>
            <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 13 }}>Giá trị sửa đổi</div>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={3}
              placeholder="Điền giá trị đúng theo quyết định của bạn..."
              style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }} />
          </label>
        )}

        <div style={{
          background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: 6,
          padding: '8px 12px', marginBottom: 16, fontSize: 12, color: '#92400e'
        }}>
          ⚠️ Quyết định này sẽ được lưu với: who=Huy, when={new Date().toLocaleString('vi-VN')}, old/new value, reason, approval_status.
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{
            padding: '8px 16px', borderRadius: 6, border: '1px solid #d1d5db',
            background: '#fff', cursor: 'pointer', fontWeight: 600
          }}>Hủy</button>
          <button
            onClick={() => { if (reason.trim()) onSubmit(decision, reason, note); }}
            disabled={!reason.trim()}
            style={{
              padding: '8px 20px', borderRadius: 6, border: 'none',
              background: reason.trim() ? '#2563eb' : '#9ca3af',
              color: '#fff', cursor: reason.trim() ? 'pointer' : 'default',
              fontWeight: 700
            }}>
            Xác nhận quyết định
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────────────────── */
export default function ApprovalCenterClient({ initialData }: { initialData?: any[] }) {
  const [items, setItems] = useState<ApprovalItem[]>(() => {
    if (initialData && initialData.length > 0) {
      return initialData.map(d => ({
        id: d.decisionId,
        priority: d.riskLevel === 'HIGH' ? 1 : d.riskLevel === 'MEDIUM' ? 2 : 3,
        severity: d.riskLevel as Severity,
        category: d.category,
        title: d.title,
        source_file: d.sourceDocument || '',
        issue: d.impactDescription || d.currentValue || '',
        evidence: d.evidence || '',
        current_status: d.status,
        erp_blocked: d.status === 'BLOCKED' || (d.blockedModules && d.blockedModules.length > 0),
        decision: (d.status === 'APPROVED' || d.status === 'REJECTED') ? d.status : null,
        decided_by: d.reviewedBy ? String(d.reviewedBy) : null,
        decided_at: d.reviewedAt ? new Date(d.reviewedAt).toISOString() : null,
        override_reason: d.resolutionNote || d.rejectionReason || '',
        history: d.auditTrail || [],
      }));
    }
    return APPROVAL_QUEUE;
  });
  const [conflicts] = useState<ConflictItem[]>(CONFLICTS);
  const [tab, setTab] = useState<'queue' | 'conflicts' | 'history'>('queue');
  const [selected, setSelected] = useState<ApprovalItem | null>(null);
  const [overrideItem, setOverrideItem] = useState<ApprovalItem | null>(null);
  const [filterSeverity, setFilterSeverity] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [searchQ, setSearchQ] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);


  const handleDecision = useCallback(async (decision: DecisionType, reason: string, note: string) => {
    if (!overrideItem) return;
    const now = new Date().toISOString();
    const bdId = overrideItem.id;

    setSaving(true);
    setSaveError(null);

    try {
      const newStatus = decision === 'APPROVED' ? 'APPROVED'
        : decision === 'REJECTED' ? 'REJECTED'
        : 'PENDING';

      const res = await fetch(`/api/approval-center/${bdId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          reviewedAt: now,
          resolutionNote: `${reason}${note ? ` | ${note}` : ''}`,
          rejectionReason: decision === 'REJECTED' ? reason : undefined,
          auditTrailAppend: { action: decision || 'DECISION', by: 'Huy', reason, note },
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(err.error || `Failed: HTTP ${res.status}`);
      }

      const newHistory = [...(overrideItem.history || []), {
        action: decision || 'DECISION', by: 'Huy', at: now,
        note: `${reason}${note ? ` | Override: ${note}` : ''}`,
      }];

      setItems(prev => prev.map(it => {
        if (it.id !== bdId) return it;
        return {
          ...it, decision, decided_by: 'Huy', decided_at: now,
          override_reason: reason,
          current_status: decision === 'APPROVED' ? 'APPROVED' : decision === 'REJECTED' ? 'REJECTED' : 'CORRECTION_REQUIRED',
          history: newHistory,
        };
      }));
      setOverrideItem(null);
      if (selected?.id === bdId) {
        setSelected(prev => prev ? { ...prev, decision, decided_by: 'Huy', decided_at: now, override_reason: reason } : null);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setSaveError(`Lỗi lưu quyết định: ${msg}`);
      console.error('[ApprovalCenter] PATCH failed:', msg);
    } finally {
      setSaving(false);
    }
  }, [overrideItem, selected]);


  const filtered = items.filter(it => {
    if (filterSeverity && it.severity !== filterSeverity) return false;
    if (filterStatus && it.current_status !== filterStatus) return false;
    if (searchQ && !it.title.toLowerCase().includes(searchQ.toLowerCase()) && !it.id.toLowerCase().includes(searchQ.toLowerCase())) return false;
    return true;
  });

  const stats = {
    total: items.length,
    pending: items.filter(i => !i.decision).length,
    approved: items.filter(i => i.decision === 'APPROVED').length,
    blocked: items.filter(i => i.erp_blocked && !i.decision).length,
  };

  const tabStyle = (active: boolean) => ({
    padding: '8px 20px', borderRadius: '6px 6px 0 0', border: 'none',
    background: active ? 'var(--color-surface,#fff)' : 'transparent',
    color: active ? '#2563eb' : 'var(--color-text-2,#666)',
    fontWeight: active ? 700 : 500, cursor: 'pointer', fontSize: 14,
    borderBottom: active ? '2px solid #2563eb' : '2px solid transparent',
  });

  return (
    <div style={{ fontFamily: 'var(--font-sans, sans-serif)', maxWidth: 1200, margin: '0 auto', padding: '0 16px 40px' }}>
      {/* Header */}
      <div style={{ padding: '24px 0 16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Approval Center</h1>
            <p style={{ margin: '4px 0 0', color: 'var(--color-text-2,#666)', fontSize: 13 }}>
              BAO MINH CMT8 — VĂN PHÒNG CHỨNG KHOÁN | Người duyệt: <strong>Huy</strong>
            </p>
          </div>
          <div style={{
            background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8,
            padding: '8px 14px', fontSize: 12, color: '#dc2626', fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 6
          }}>
            🔒 ERP_TRANSACTION = 0 — STAGING ONLY
          </div>
        </div>
      </div>

      {/* Save error banner */}
      {saveError && (
        <div style={{
          background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8,
          padding: '10px 16px', marginBottom: 16, color: '#dc2626', fontSize: 13,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span>⚠️ {saveError}</span>
          <button onClick={() => setSaveError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontWeight: 700 }}>✕</button>
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Tổng items', value: stats.total, color: '#2563eb' },
          { label: 'Chờ duyệt', value: stats.pending, color: '#d97706' },
          { label: 'Đã duyệt', value: stats.approved, color: '#16a34a' },
          { label: 'ERP Blocked', value: stats.blocked, color: '#dc2626' },
          { label: 'Conflicts', value: conflicts.length, color: '#7c3aed' },
        ].map(s => (
          <div key={s.label} style={{
            background: 'var(--color-surface,#fff)', borderRadius: 10, padding: '14px 18px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.08)', borderTop: `3px solid ${s.color}`,
          }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-2,#888)', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ borderBottom: '1px solid #e5e7eb', marginBottom: 0, display: 'flex', gap: 4 }}>
        <button style={tabStyle(tab === 'queue')} onClick={() => setTab('queue')}>Approval Queue ({items.length})</button>
        <button style={tabStyle(tab === 'conflicts')} onClick={() => setTab('conflicts')}>Conflict Register ({conflicts.length})</button>
        <button style={tabStyle(tab === 'history')} onClick={() => setTab('history')}>Lịch sử</button>
      </div>

      <div style={{ background: 'var(--color-surface,#fff)', borderRadius: '0 0 12px 12px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', padding: 20 }}>

        {/* ── QUEUE TAB ── */}
        {tab === 'queue' && (
          <>
            {/* Filters */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Tìm kiếm..."
                style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13, minWidth: 180 }} />
              <select value={filterSeverity} onChange={e => setFilterSeverity(e.target.value)}
                style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13 }}>
                <option value="">Tất cả severity</option>
                <option value="HIGH">HIGH</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="LOW">LOW</option>
              </select>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13 }}>
                <option value="">Tất cả status</option>
                <option value="BLOCKED">BLOCKED</option>
                <option value="NEEDS_APPROVAL">NEEDS_APPROVAL</option>
                <option value="APPROVED">APPROVED</option>
                <option value="REJECTED">REJECTED</option>
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 1fr' : '1fr', gap: 16 }}>
              {/* List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {filtered.sort((a, b) => a.priority - b.priority).map(item => (
                  <div key={item.id}
                    onClick={() => setSelected(selected?.id === item.id ? null : item)}
                    style={{
                      border: `1px solid ${selected?.id === item.id ? '#2563eb' : '#e5e7eb'}`,
                      borderLeft: `4px solid ${SEV_COLOR[item.severity]}`,
                      borderRadius: 8, padding: '12px 14px', cursor: 'pointer',
                      background: selected?.id === item.id ? '#eff6ff' : item.decision ? '#f9fafb' : 'white',
                      transition: 'all 0.15s',
                    }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 800, fontSize: 13, color: '#111' }}>{item.id}</span>
                      <Badge text={item.severity} color={SEV_COLOR[item.severity]} />
                      <Badge text={item.current_status} color={STATUS_COLOR[item.current_status] || '#6b7280'} />
                      {item.erp_blocked && <Badge text="ERP BLOCKED" color="#dc2626" />}
                      {item.decision && <Badge text={item.decision} color={STATUS_COLOR[item.decision] || '#16a34a'} />}
                    </div>
                    <div style={{ marginTop: 6, fontWeight: 600, fontSize: 14 }}>{item.title}</div>
                    <div style={{ marginTop: 3, fontSize: 12, color: '#6b7280' }}>📄 {item.source_file}</div>
                    {item.decided_by && (
                      <div style={{ marginTop: 4, fontSize: 11, color: '#16a34a' }}>
                        ✅ Duyệt bởi {item.decided_by} lúc {new Date(item.decided_at!).toLocaleString('vi-VN')}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Detail pane */}
              {selected && (
                <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 20, height: 'fit-content', position: 'sticky', top: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 800 }}>{selected.id}</div>
                      <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                        <Badge text={selected.severity} color={SEV_COLOR[selected.severity]} />
                        <Badge text={selected.category} color="#4b5563" />
                        {selected.erp_blocked && <Badge text="ERP BLOCKED" color="#dc2626" />}
                      </div>
                    </div>
                    <button onClick={() => setSelected(null)} style={{
                      background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#9ca3af'
                    }}>✕</button>
                  </div>

                  <h3 style={{ margin: '0 0 8px', fontSize: 15 }}>{selected.title}</h3>

                  <section style={{ marginBottom: 14 }}>
                    <div style={{ fontWeight: 700, fontSize: 12, color: '#6b7280', textTransform: 'uppercase', marginBottom: 4 }}>Nguồn</div>
                    <div style={{ fontSize: 13, background: '#f8fafc', padding: '6px 10px', borderRadius: 4 }}>📄 {selected.source_file}</div>
                  </section>

                  <section style={{ marginBottom: 14 }}>
                    <div style={{ fontWeight: 700, fontSize: 12, color: '#6b7280', textTransform: 'uppercase', marginBottom: 4 }}>Issue</div>
                    <div style={{ fontSize: 13, lineHeight: 1.6 }}>{selected.issue}</div>
                  </section>

                  {selected.evidence && (
                    <section style={{ marginBottom: 14 }}>
                      <div style={{ fontWeight: 700, fontSize: 12, color: '#6b7280', textTransform: 'uppercase', marginBottom: 4 }}>Evidence</div>
                      <div style={{
                        fontSize: 12, background: '#f0f9ff', border: '1px solid #bae6fd',
                        padding: '8px 12px', borderRadius: 6, whiteSpace: 'pre-line', lineHeight: 1.6
                      }}>{typeof selected.evidence === 'string' ? selected.evidence : JSON.stringify(selected.evidence, null, 2)}</div>
                    </section>
                  )}

                  {/* Decision history */}
                  {selected.history && selected.history.length > 0 && (
                    <section style={{ marginBottom: 14 }}>
                      <div style={{ fontWeight: 700, fontSize: 12, color: '#6b7280', textTransform: 'uppercase', marginBottom: 4 }}>Lịch sử</div>
                      {selected.history.map((h, i) => (
                        <div key={i} style={{ fontSize: 12, borderLeft: '2px solid #d1d5db', paddingLeft: 8, marginBottom: 4 }}>
                          <strong>{h.action}</strong> by {h.by} at {new Date(h.at).toLocaleString('vi-VN')} — {h.note}
                        </div>
                      ))}
                    </section>
                  )}

                  {/* Actions */}
                  {!selected.decision ? (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button onClick={() => setOverrideItem(selected)} style={{
                        flex: 1, padding: '10px 0', background: '#2563eb', color: '#fff',
                        border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 700, fontSize: 14
                      }}>Quyết định →</button>
                    </div>
                  ) : (
                    <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 6, padding: '10px 14px' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#15803d' }}>
                        {selected.decision} — by {selected.decided_by}
                      </div>
                      {selected.override_reason && (
                        <div style={{ fontSize: 12, marginTop: 4, color: '#374151' }}>{selected.override_reason}</div>
                      )}
                      <button onClick={() => setOverrideItem(selected)} style={{
                        marginTop: 8, padding: '4px 10px', background: 'none',
                        border: '1px solid #d1d5db', borderRadius: 4, cursor: 'pointer', fontSize: 12
                      }}>Override / Sửa lại</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* ── CONFLICTS TAB ── */}
        {tab === 'conflicts' && (
          <div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['ID', 'Type', 'Severity', 'Source', 'Description', 'BD Ref', 'Status'].map(h => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: '#374151', borderBottom: '2px solid #e5e7eb' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {conflicts.map((c, i) => (
                  <tr key={c.id} style={{ background: i % 2 === 0 ? '#fff' : '#f9fafb', borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 700 }}>{c.id}</td>
                    <td style={{ padding: '10px 12px', fontSize: 11, color: '#4b5563' }}>{c.type}</td>
                    <td style={{ padding: '10px 12px' }}><Badge text={c.severity} color={SEV_COLOR[c.severity]} /></td>
                    <td style={{ padding: '10px 12px', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.source}</td>
                    <td style={{ padding: '10px 12px', maxWidth: 240 }}>{c.description}</td>
                    <td style={{ padding: '10px 12px', color: '#2563eb', fontWeight: 600 }}>{c.bd_ref}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <Badge text={c.status} color={STATUS_COLOR[c.status] || '#6b7280'} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── HISTORY TAB ── */}
        {tab === 'history' && (
          <div>
            {items.filter(i => i.history && i.history.length > 0).length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
                Chưa có quyết định nào. Dùng tab &quot;Approval Queue&quot; để duyệt.
              </div>
            ) : (
              items.filter(i => i.history && i.history.length > 0).map(item => (
                <div key={item.id} style={{ marginBottom: 16, borderLeft: '3px solid #2563eb', paddingLeft: 12 }}>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>{item.id} — {item.title}</div>
                  {item.history!.map((h, i) => (
                    <div key={i} style={{ fontSize: 13, color: '#374151', marginBottom: 2 }}>
                      [{new Date(h.at).toLocaleString('vi-VN')}] <strong>{h.action}</strong> by {h.by}: {h.note}
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Override modal */}
      {overrideItem && (
        <OverrideModal item={overrideItem} onClose={() => setOverrideItem(null)} onSubmit={handleDecision} />
      )}
    </div>
  );
}
