'use client';

import React, { useState, useCallback, useRef } from 'react';
import {
  ChevronRight, ChevronDown, FolderOpen, Folder, File, FileText,
  FileSpreadsheet, Image, Upload, Search, RefreshCw,
  CheckCircle, Clock, AlertTriangle, XCircle, Zap, Database,
  ArrowRight, Layers, Hash, Tag, Download,
  BarChart3, Package, BookOpen, Pencil, Save, X as XIcon, Plus, Trash2
} from 'lucide-react';

// ─────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────
export type DataFlowStatus = 'RAW' | 'INGESTING' | 'PARSED' | 'STAGED' | 'APPROVED' | 'REJECTED' | 'COMMITTED' | 'CLASSIFIED';

export type DocumentCategory =
  | 'BOQ_EXCEL' | 'BOQ_PDF' | 'DESIGN_PDF' | 'MATERIAL_IMAGE'
  | 'SURVEY_IMAGE' | 'UNCATEGORIZED' | 'MANUAL_ENTRY' | 'CONTRACT' | 'OTHER'
  | 'MATERIAL_REGISTER' | 'PROCUREMENT_DOCUMENT' | 'BOM' | 'DESIGN_SKETCHUP' | 'DESIGN_AUTOCAD'
  | 'PHOTO' | 'REPORT' | 'SPECIFICATION';

export type FieldType = 'MATERIAL' | 'QUANTITY' | 'PRICE' | 'SUPPLIER' | 'DATE' | 'CUSTOMER' | 'PROJECT' | 'COMPONENT' | 'DIMENSION' | 'HARDWARE' | 'BOQ' | 'BOM' | 'NOTES';

export type Confidence = 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';

export interface ExtractedLine {
  id: number;
  sourceDocId?: number;
  lineId: string;
  lineNumber: number;
  rawValue: string;
  parsedValue?: string;
  normalizedValue?: string;
  fieldType: FieldType;
  confidence: Confidence;
  needsReview: boolean;
  reviewNote?: string;
  stagedRecordType?: string;
  stagedRecordId?: string;
  erpRecordType?: string;
  erpRecordId?: string;
  // Structured row data — parsed from the source table
  rowData?: {
    stt?: number | string;
    ten?: string;        // Tên hàng hoá
    soLuong?: number | string;
    donVi?: string;      // Đơn vị
    donGia?: number | string;
    thanhTien?: number | string;
    ghiChu?: string;
  };
}

export interface SourceDocument {
  id: number;
  sourceId: string;
  sourceName: string;
  sourceType: string;
  fileName: string;
  fileSize?: number;
  projectName?: string;
  documentCategory: DocumentCategory;
  sourceStatus: DataFlowStatus;
  uploadedAt: string;
  lineCount?: number;
  lines?: ExtractedLine[];
  autoRoutedTo?: string;
  classificationConfidence?: number;
}

export interface TreeNode {
  id: string;
  label: string;
  level: 0 | 1 | 2 | 3;
  type: 'project' | 'category' | 'document' | 'line';
  children?: TreeNode[];
  data?: SourceDocument | ExtractedLine;
  count?: number;
  status?: DataFlowStatus;
}

interface Props {
  documents: SourceDocument[];
}

// ─────────────────────────────────────────────────
// INLINE EDIT HOOK — universal double-click-to-edit
// ─────────────────────────────────────────────────
function useInlineEdit(onSave: (value: string) => void, initialValue: string) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  const startEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 20);
  };
  const commit = () => {
    setEditing(false);
    if (value.trim() && value.trim() !== initialValue) onSave(value.trim());
    else setValue(initialValue);
  };
  const cancel = () => { setEditing(false); setValue(initialValue); };
  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); commit(); }
    if (e.key === 'Escape') cancel();
  };
  return { editing, value, setValue, startEdit, commit, cancel, handleKey, inputRef };
}

// ─────────────────────────────────────────────────
// CONSTANTS & HELPERS
// ─────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  RAW:        { label: 'RAW',        color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', icon: <Clock size={11} /> },
  INGESTING:  { label: 'INGESTING',  color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  icon: <RefreshCw size={11} /> },
  PARSED:     { label: 'PARSED',     color: '#3b82f6', bg: 'rgba(59,130,246,0.12)',  icon: <Zap size={11} /> },
  CLASSIFIED: { label: 'CLASSIFIED', color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)', icon: <Zap size={11} /> },
  STAGED:     { label: 'STAGED',     color: '#f59e0b', bg: 'rgba(245,158,11,0.15)',  icon: <Database size={11} /> },
  COMMITTED:  { label: 'COMMITTED',  color: '#06b6d4', bg: 'rgba(6,182,212,0.12)',  icon: <CheckCircle size={11} /> },
  APPROVED:   { label: 'APPROVED',   color: '#10b981', bg: 'rgba(16,185,129,0.12)', icon: <CheckCircle size={11} /> },
  REJECTED:   { label: 'REJECTED',   color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  icon: <XCircle size={11} /> },
};

const CATEGORY_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  BOQ_EXCEL:             { label: 'BOQ Excel',         icon: <FileSpreadsheet size={14} />, color: '#10b981' },
  BOQ_PDF:               { label: 'BOQ PDF',           icon: <FileText size={14} />,        color: '#3b82f6' },
  DESIGN_PDF:            { label: 'Bản vẽ PDF',        icon: <BookOpen size={14} />,        color: '#8b5cf6' },
  DESIGN_SKETCHUP:       { label: 'SketchUp 3D',       icon: <BookOpen size={14} />,        color: '#6366f1' },
  DESIGN_AUTOCAD:        { label: 'AutoCAD',           icon: <BookOpen size={14} />,        color: '#7c3aed' },
  MATERIAL_IMAGE:        { label: 'Ảnh Vật tư',        icon: <Image size={14} />,           color: '#f59e0b' },
  MATERIAL_REGISTER:     { label: 'Bảng Vật tư',       icon: <FileSpreadsheet size={14} />, color: '#0ea5e9' },
  SURVEY_IMAGE:          { label: 'Ảnh Khảo sát',      icon: <Image size={14} />,           color: '#ec4899' },
  PROCUREMENT_DOCUMENT:  { label: 'Phiếu Mua hàng',    icon: <Tag size={14} />,             color: '#f97316' },
  BOM:                   { label: 'Định mức BOM',       icon: <Hash size={14} />,            color: '#14b8a6' },
  UNCATEGORIZED:         { label: 'Chưa phân loại',    icon: <File size={14} />,            color: '#64748b' },
  MANUAL_ENTRY:          { label: 'Nhập thủ công',     icon: <Hash size={14} />,            color: '#06b6d4' },
  CONTRACT:              { label: 'Hợp đồng',          icon: <Tag size={14} />,             color: '#f97316' },
  PHOTO:                 { label: 'Ảnh thi công',      icon: <Image size={14} />,           color: '#a78bfa' },
  REPORT:                { label: 'Báo cáo',           icon: <FileText size={14} />,        color: '#22d3ee' },
  SPECIFICATION:         { label: 'Thuyết minh KT',    icon: <BookOpen size={14} />,        color: '#4ade80' },
  OTHER:                 { label: 'Khác',              icon: <Package size={14} />,         color: '#a78bfa' },
};

const FIELD_TYPE_CONFIG: Record<FieldType, { label: string; color: string }> = {
  MATERIAL:  { label: 'Vật liệu',    color: '#10b981' },
  QUANTITY:  { label: 'Số lượng',    color: '#3b82f6' },
  PRICE:     { label: 'Đơn giá',     color: '#f59e0b' },
  SUPPLIER:  { label: 'NCC',         color: '#8b5cf6' },
  DATE:      { label: 'Ngày',        color: '#ec4899' },
  CUSTOMER:  { label: 'Khách hàng',  color: '#06b6d4' },
  PROJECT:   { label: 'Dự án',       color: '#f97316' },
  COMPONENT: { label: 'Cấu kiện',    color: '#a78bfa' },
  DIMENSION: { label: 'Kích thước',  color: '#34d399' },
  HARDWARE:  { label: 'Hardware',    color: '#fb923c' },
  BOQ:       { label: 'BOQ',         color: '#60a5fa' },
  BOM:       { label: 'BOM',         color: '#c084fc' },
  NOTES:     { label: 'Ghi chú',     color: '#94a3b8' },
};

const formatBytes = (bytes?: number | string) => {
  const b = typeof bytes === 'string' ? parseInt(bytes, 10) : bytes;
  if (!b || isNaN(b)) return '—';
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (s: string) => {
  try { return new Date(s).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }); }
  catch { return s; }
};

// ─── File Extension Utilities ─────────────────────
const getFileExt = (fileName: string): string =>
  (fileName.split('.').pop() || '').toLowerCase();

const EXT_CONFIG: Record<string, { icon: React.ReactNode; bg: string; color: string; label: string }> = {
  pdf:   { icon: <FileText size={14} />,        bg: '#ef444420', color: '#ef4444', label: 'PDF'   },
  xlsx:  { icon: <FileSpreadsheet size={14} />, bg: '#10b98120', color: '#10b981', label: 'XLSX'  },
  xls:   { icon: <FileSpreadsheet size={14} />, bg: '#10b98120', color: '#10b981', label: 'XLS'   },
  csv:   { icon: <FileSpreadsheet size={14} />, bg: '#06b6d420', color: '#06b6d4', label: 'CSV'   },
  docx:  { icon: <FileText size={14} />,        bg: '#3b82f620', color: '#3b82f6', label: 'DOCX'  },
  doc:   { icon: <FileText size={14} />,        bg: '#3b82f620', color: '#3b82f6', label: 'DOC'   },
  jpg:   { icon: <Image size={14} />,           bg: '#f59e0b20', color: '#f59e0b', label: 'JPG'   },
  jpeg:  { icon: <Image size={14} />,           bg: '#f59e0b20', color: '#f59e0b', label: 'JPEG'  },
  png:   { icon: <Image size={14} />,           bg: '#f59e0b20', color: '#f59e0b', label: 'PNG'   },
  gif:   { icon: <Image size={14} />,           bg: '#f59e0b20', color: '#f59e0b', label: 'GIF'   },
  webp:  { icon: <Image size={14} />,           bg: '#f59e0b20', color: '#f59e0b', label: 'WEBP'  },
  heic:  { icon: <Image size={14} />,           bg: '#f59e0b20', color: '#f59e0b', label: 'HEIC'  },
  skp:   { icon: <BookOpen size={14} />,        bg: '#6366f120', color: '#6366f1', label: 'SKP'   },
  dwg:   { icon: <BookOpen size={14} />,        bg: '#7c3aed20', color: '#7c3aed', label: 'DWG'   },
  dxf:   { icon: <BookOpen size={14} />,        bg: '#7c3aed20', color: '#7c3aed', label: 'DXF'   },
  zip:   { icon: <Package size={14} />,         bg: '#a78bfa20', color: '#a78bfa', label: 'ZIP'   },
  rar:   { icon: <Package size={14} />,         bg: '#a78bfa20', color: '#a78bfa', label: 'RAR'   },
  txt:   { icon: <FileText size={14} />,        bg: '#64748b20', color: '#64748b', label: 'TXT'   },
  pptx:  { icon: <FileText size={14} />,        bg: '#f97316', color: '#f97316',  label: 'PPTX'  },
};

const getExtConfig = (fileName: string) => {
  const ext = getFileExt(fileName);
  return EXT_CONFIG[ext] || { icon: <File size={14} />, bg: '#47556920', color: '#475569', label: ext.toUpperCase() || 'FILE' };
};

function FileExtBadge({ fileName }: { fileName: string }) {
  const { bg, color, label } = getExtConfig(fileName);
  return (
    <span style={{
      fontSize: 9, fontWeight: 800, padding: '1px 5px', borderRadius: 4,
      background: bg, color, letterSpacing: '0.04em', flexShrink: 0,
      border: `1px solid ${color}40`,
    }}>
      {label}
    </span>
  );
}

// Build tree from flat documents
function buildTree(docs: SourceDocument[]): TreeNode[] {
  const projectMap: Map<string, { docs: SourceDocument[]; name: string }> = new Map();

  for (const doc of docs) {
    const projectKey = doc.projectName || 'Chưa gán Dự án';
    if (!projectMap.has(projectKey)) projectMap.set(projectKey, { docs: [], name: projectKey });
    projectMap.get(projectKey)!.docs.push(doc);
  }

  const roots: TreeNode[] = [];
  let pIdx = 0;

  for (const [projectKey, { docs: pDocs, name }] of projectMap.entries()) {
    const categoryMap: Map<DocumentCategory, SourceDocument[]> = new Map();
    for (const doc of pDocs) {
      const cat = doc.documentCategory as DocumentCategory;
      if (!categoryMap.has(cat)) categoryMap.set(cat, []);
      categoryMap.get(cat)!.push(doc);
    }

    const categoryNodes: TreeNode[] = [];
    let catIdx = 0;
    for (const [cat, catDocs] of categoryMap.entries()) {
      const docNodes: TreeNode[] = catDocs.map((doc) => {
        const lineNodes: TreeNode[] = (doc.lines || []).map((line) => ({
          id: `line-${line.id}`,
          label: line.rawValue || `Dòng ${line.lineNumber}`,
          level: 3,
          type: 'line' as const,
          data: line,
          status: undefined,
        }));

        return {
          id: `doc-${doc.id}`,
          label: doc.fileName,
          level: 2 as const,
          type: 'document' as const,
          data: doc,
          children: lineNodes.length > 0 ? lineNodes : undefined,
          count: doc.lineCount,
          status: doc.sourceStatus,
        };
      });

      const catNode: TreeNode & { __catIndex?: number } = {
        id: `cat-${pIdx}-${cat}`,
        label: CATEGORY_CONFIG[cat]?.label || cat,
        level: 1 as const,
        type: 'category' as const,
        children: docNodes,
        count: catDocs.length,
        status: undefined,
      };
      (catNode as any).__catIndex = catIdx++;
      categoryNodes.push(catNode);
    }


    roots.push({
      id: `project-${pIdx++}`,
      label: name,
      level: 0 as const,
      type: 'project' as const,
      children: categoryNodes,
      count: pDocs.length,
    });
  }

  return roots;
}

// ─────────────────────────────────────────────────
// STATUS BADGE
// ─────────────────────────────────────────────────
function StatusBadge({ status }: { status: DataFlowStatus }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.RAW;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700,
      letterSpacing: '0.05em', textTransform: 'uppercase',
      color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.color}40`,
    }}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

// ─────────────────────────────────────────────────
// FLOW PIPELINE INDICATOR
// ─────────────────────────────────────────────────
// Order matters: this is the canonical flow progression
const PIPELINE_STAGES: string[] = ['RAW', 'CLASSIFIED', 'PARSED', 'STAGED', 'COMMITTED', 'APPROVED'];

function PipelineBar({ current }: { current: DataFlowStatus }) {
  const stageIdx = PIPELINE_STAGES.indexOf(current);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      {PIPELINE_STAGES.map((stage, i) => {
        const cfg = STATUS_CONFIG[stage];
        const isActive = i <= stageIdx;
        const isCurrent = i === stageIdx;
        return (
          <React.Fragment key={stage}>
            <div
              title={cfg.label}
              style={{
                width: isCurrent ? 24 : 12, height: 6, borderRadius: 3,
                background: isActive ? cfg.color : '#1e293b',
                opacity: isActive ? 1 : 0.3,
                transition: 'all 0.3s',
              }}
            />
            {i < PIPELINE_STAGES.length - 1 && (
              <div style={{ width: 4, height: 1, background: isActive ? '#475569' : '#1e293b' }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────
// DETAIL PANEL — right side drawer
// ─────────────────────────────────────────────────
function DetailPanel({ node, onClose }: { node: TreeNode | null; onClose: () => void }) {
  if (!node) return null;

  const doc = node.type === 'document' ? node.data as SourceDocument : null;
  const line = node.type === 'line' ? node.data as ExtractedLine : null;

  return (
    <div style={{
      width: 360, flexShrink: 0, background: '#0f172a', borderLeft: '1px solid #1e293b',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      transition: 'width 0.3s ease',
    }}>
      {/* Panel Header */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 4 }}>
            {node.type === 'document' ? 'Chi tiết File' : node.type === 'line' ? 'Chi tiết Dòng' : node.type === 'category' ? 'Nhóm Phân loại' : 'Dự án'}
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc', wordBreak: 'break-all', lineHeight: 1.3 }}>
            {node.label}
          </div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 4 }}>✕</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
        {/* Document Detail */}
        {doc && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Status & Pipeline */}
            <div style={{ background: '#1e293b', borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, letterSpacing: '0.05em', marginBottom: 12 }}>LUỒNG DỮ LIỆU</div>
              <div style={{ marginBottom: 10 }}>
                <PipelineBar current={doc.sourceStatus} />
              </div>
              <StatusBadge status={doc.sourceStatus} />
            </div>

            {/* File Metadata */}
            <div style={{ background: '#1e293b', borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, letterSpacing: '0.05em', marginBottom: 12 }}>THÔNG TIN FILE</div>
              {[
                { label: 'ID Nguồn', value: doc.sourceId },
                { label: 'Loại file', value: doc.sourceType },
                { label: 'Dung lượng', value: formatBytes(doc.fileSize) },
                { label: 'Ngày upload', value: formatDate(doc.uploadedAt) },
                { label: 'Phân loại', value: CATEGORY_CONFIG[doc.documentCategory]?.label || doc.documentCategory },
                { label: 'Số dòng', value: doc.lineCount != null ? `${doc.lineCount} dòng` : '—' },
                { label: 'Tự động routed', value: doc.autoRoutedTo || '—' },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #0f172a', fontSize: 13 }}>
                  <span style={{ color: '#64748b' }}>{label}</span>
                  <span style={{ color: '#cbd5e1', fontWeight: 600, textAlign: 'right', maxWidth: '55%', wordBreak: 'break-all' }}>{value}</span>
                </div>
              ))}
            </div>

            {/* Data Flow Target */}
            <div style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 11, color: '#3b82f6', fontWeight: 700, letterSpacing: '0.05em', marginBottom: 10 }}>ÁCHXẠ DỮ LIỆU → ERP</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { from: 'File PDF/Excel', to: 'Source Document', active: true },
                  { from: 'Dòng Vật tư', to: 'Materials', active: doc.documentCategory.includes('BOQ') },
                  { from: 'Dòng BOQ', to: 'BOQ Items', active: doc.documentCategory.includes('BOQ') },
                  { from: 'Dòng Giá', to: 'Cost / BOQ', active: doc.documentCategory.includes('BOQ') },
                ].map(({ from, to, active }) => (
                  <div key={from} style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: active ? 1 : 0.3 }}>
                    <span style={{ fontSize: 11, color: active ? '#cbd5e1' : '#475569', flex: 1 }}>{from}</span>
                    <ArrowRight size={12} color={active ? '#3b82f6' : '#475569'} />
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                      background: active ? 'rgba(59,130,246,0.2)' : '#1e293b',
                      color: active ? '#60a5fa' : '#475569',
                    }}>{to}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Line Detail */}
        {line && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ background: '#1e293b', borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, letterSpacing: '0.05em', marginBottom: 12 }}>DÒNG DỮ LIỆU #{line.lineNumber}</div>
              {[
                { label: 'Giá trị gốc',     value: line.rawValue },
                { label: 'Đã phân tích',     value: line.parsedValue || '—' },
                { label: 'Đã chuẩn hoá',     value: line.normalizedValue || '—' },
                { label: 'Loại trường',      value: FIELD_TYPE_CONFIG[line.fieldType]?.label || line.fieldType },
                { label: 'Độ chính xác',     value: line.confidence },
                { label: 'Cần review',       value: line.needsReview ? 'Có' : 'Không' },
                { label: 'Staged Record',    value: line.stagedRecordId ? `${line.stagedRecordType} #${line.stagedRecordId}` : '—' },
                { label: 'ERP Record',       value: line.erpRecordId ? `${line.erpRecordType} #${line.erpRecordId}` : '—' },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #0f172a', fontSize: 13 }}>
                  <span style={{ color: '#64748b' }}>{label}</span>
                  <span style={{ color: '#cbd5e1', fontWeight: 600, textAlign: 'right', maxWidth: '55%', wordBreak: 'break-all' }}>{value}</span>
                </div>
              ))}
            </div>
            {line.needsReview && line.reviewNote && (
              <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 8, padding: 12, fontSize: 12, color: '#fcd34d' }}>
                ⚠️ {line.reviewNote}
              </div>
            )}
          </div>
        )}

        {/* Category summary */}
        {node.type === 'category' && (
          <div style={{ background: '#1e293b', borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: 13, color: '#94a3b8' }}>Nhóm này chứa <strong style={{ color: '#f8fafc' }}>{node.count}</strong> file tài liệu.</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────
// TREE ROW COMPONENT
// ─────────────────────────────────────────────────
function TreeRow({
  node, isExpanded, isSelected, onToggle, onSelect, depth,
  onLabelSave, onStatusChange, onAddChild, onDeleteNode,
}: {
  node: TreeNode; isExpanded: boolean; isSelected: boolean;
  onToggle: () => void; onSelect: () => void; depth: number;
  onLabelSave: (nodeId: string, newLabel: string) => void;
  onStatusChange: (nodeId: string, status: DataFlowStatus) => void;
  onAddChild: (parentId: string) => void;
  onDeleteNode: (nodeId: string) => void;
}) {
  const hasChildren = (node.children && node.children.length > 0) || (node.type === 'document' && (node.data as any)?.lineCount > 0);
  const doc = node.type === 'document' ? node.data as SourceDocument : null;
  const line = node.type === 'line' ? node.data as ExtractedLine : null;

  const indent = depth * 24;
  const levelColors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];
  const [hovering, setHovering] = useState(false);

  // Inline edit state for this row's label
  const [editingLabel, setEditingLabel] = useState(false);
  const [editLabelVal, setEditLabelVal] = useState(node.label);
  const labelInputRef = useRef<HTMLInputElement>(null);

  const startLabelEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditLabelVal(node.label);
    setEditingLabel(true);
    setTimeout(() => labelInputRef.current?.focus(), 20);
  };
  const commitLabelEdit = () => {
    setEditingLabel(false);
    if (editLabelVal.trim() && editLabelVal.trim() !== node.label)
      onLabelSave(node.id, editLabelVal.trim());
  };
  const cancelLabelEdit = () => { setEditingLabel(false); setEditLabelVal(node.label); };

  // Inline status change for documents
  const [editingStatus, setEditingStatus] = useState(false);
  const [editingCat, setEditingCat] = useState(false);

  // Inline edit state for Line rows
  const [editingLine, setEditingLine] = useState((line?.rowData as any)?.isNew || false);
  const [editLineData, setEditLineData] = useState<any>(line?.rowData || {});
  const [savingLine, setSavingLine] = useState(false);

  const handleSaveLine = async () => {
    if (!line) return;
    setSavingLine(true);
    try {
      const isManual = line.lineId.startsWith('manual-') || editLineData.isNew;
      const url = isManual ? `/api/source-center/${(line as any).sourceDocId || doc?.id}/lines` : `/api/source-center/${(line as any).sourceDocId}/lines`;
      const method = isManual ? 'POST' : 'PATCH';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: line.id,
          lineId: line.lineId,
          rawValue: editLineData.ten || line.rawValue,
          parsedValue: editLineData.ten || line.parsedValue,
          normalizedValue: JSON.stringify(editLineData)
        })
      });
      
      if (!res.ok) throw new Error('Save failed');
      setEditingLine(false);
      // Let parent re-fetch or optimistically update
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('source-status-changed', { detail: { docId: (line as any).sourceDocId || doc?.id, status: 'PARSED' }}));
    } catch (e) {
      console.error(e);
      alert('Lỗi lưu dòng');
    } finally {
      setSavingLine(false);
    }
  };

  // Row background
  let rowBg = 'transparent';
  if (isSelected) rowBg = 'rgba(59,130,246,0.12)';
  if (node.type === 'project') rowBg = isSelected ? 'rgba(59,130,246,0.12)' : 'rgba(15,23,42,0.8)';

  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 0,
        padding: `${node.type === 'project' ? 10 : node.type === 'category' ? 8 : 6}px 16px`,
        paddingLeft: 16 + indent,
        background: hovering && !isSelected ? 'rgba(255,255,255,0.03)' : rowBg,
        borderBottom: node.type === 'project' ? '1px solid #1e293b' : '1px solid rgba(30,41,59,0.5)',
        cursor: 'pointer',
        transition: 'background 0.15s',
        borderLeft: isSelected ? '2px solid #3b82f6' : '2px solid transparent',
        position: 'relative',
      }}
    >
      {/* Depth indicator line */}
      {depth > 0 && (
        <div style={{
          position: 'absolute', left: 16 + (depth - 1) * 24 + 10, top: 0, bottom: 0,
          width: 1, background: `${levelColors[depth - 1]}20`,
        }} />
      )}

      {/* Expand / Collapse toggle */}
      <div
        onClick={(e) => { e.stopPropagation(); if (hasChildren) onToggle(); }}
        style={{ width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', flexShrink: 0, cursor: hasChildren ? 'pointer' : 'default' }}
      >
        {hasChildren
          ? (isExpanded ? <ChevronDown size={14} color={levelColors[depth] || '#475569'} /> : <ChevronRight size={14} color={levelColors[depth] || '#475569'} />)
          : <div style={{ width: 14 }} />}
      </div>

      {/* Icon */}
      <div style={{ marginRight: 8, flexShrink: 0, color: levelColors[depth] || '#475569' }}>
        {node.type === 'project'  && (isExpanded ? <FolderOpen size={16} /> : <Folder size={16} />)}
        {node.type === 'category' && (
          CATEGORY_CONFIG[node.label as DocumentCategory]?.icon
          || (isExpanded ? <FolderOpen size={15} /> : <Folder size={15} />)
        )}
        {node.type === 'document' && (
          doc?.sourceType === 'PDF'  ? <FileText size={14} color="#3b82f6" /> :
          doc?.sourceType === 'XLSX' ? <FileSpreadsheet size={14} color="#10b981" /> :
          doc?.sourceType?.includes('IMG') ? <Image size={14} color="#f59e0b" /> :
          <File size={14} color="#64748b" />
        )}
        {node.type === 'line' && (
          line ? (
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: FIELD_TYPE_CONFIG[line.fieldType]?.color || '#64748b', flexShrink: 0 }} />
          ) : <div style={{ width: 8, height: 8 }} />
        )}
      </div>

      {/* Label */}
      <div style={{ flex: 1, minWidth: 0 }}>

        {/* ── UNIVERSAL LABEL INLINE EDIT ── */}
        {editingLabel ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={e => e.stopPropagation()}>
            <input
              ref={labelInputRef}
              value={editLabelVal}
              onChange={e => setEditLabelVal(e.target.value)}
              onBlur={commitLabelEdit}
              onKeyDown={e => {
                if (e.key === 'Enter') { e.preventDefault(); commitLabelEdit(); }
                if (e.key === 'Escape') cancelLabelEdit();
              }}
              style={{
                flex: 1, background: '#0f172a', border: '1px solid #3b82f6', borderRadius: 6,
                color: '#f1f5f9', fontSize: node.type === 'project' ? 14 : 13,
                fontWeight: node.type === 'project' ? 800 : 600,
                padding: '4px 8px', outline: 'none',
              }}
            />
            <button onClick={commitLabelEdit} style={{ background: '#10b981', border: 'none', borderRadius: 4, padding: '3px 7px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <Save size={11} color="#fff" />
            </button>
            <button onClick={cancelLabelEdit} style={{ background: '#334155', border: 'none', borderRadius: 4, padding: '3px 7px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <XIcon size={11} color="#fff" />
            </button>
          </div>
        ) : (
          <>
            {/* Project row */}
            {node.type === 'project' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  onDoubleClick={startLabelEdit}
                  title="Double-click để chỉnh sửa"
                  style={{ fontSize: 14, fontWeight: 800, color: '#f1f5f9', letterSpacing: '0.02em', cursor: 'text' }}
                >{node.label}</span>
                {node.count != null && (
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10, background: 'rgba(59,130,246,0.15)', color: '#93c5fd', border: '1px solid rgba(59,130,246,0.2)' }}>
                    {node.count} files
                  </span>
                )}
                {hovering && (
                  <>
                    <button onClick={e => { e.stopPropagation(); startLabelEdit(e); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569', padding: 2, display: 'flex', alignItems: 'center', borderRadius: 4 }}
                      title="Chỉnh sửa tên">
                      <Pencil size={11} />
                    </button>
                    <button onClick={e => { e.stopPropagation(); onAddChild(node.id); }}
                      style={{ background: 'rgba(16,185,129,0.15)', border: 'none', borderRadius: 4, cursor: 'pointer', color: '#10b981', padding: '1px 5px', fontSize: 10 }}
                      title="Thêm nhóm con">
                      <Plus size={11} />
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Category row — shows Roman numeral index + label + count + ✏️ + ➕ */}
            {node.type === 'category' && (() => {
              const romans = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];
              const catIndex = (node as any).__catIndex ?? 0;
              return (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  onDoubleClick={startLabelEdit}
                  title="Double-click để chỉnh sửa tên nhóm"
                  style={{ fontSize: 13, fontWeight: 700, color: '#cbd5e1', cursor: 'text' }}
                >
                  {romans[catIndex] || 'I'} {node.label}
                </span>
                {node.count != null && (
                  <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 6, background: '#1e293b', color: '#64748b', border: '1px solid #334155' }}>
                    {node.count}
                  </span>
                )}
                {hovering && (
                  <>
                    <button onClick={e => { e.stopPropagation(); startLabelEdit(e); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569', padding: 2, display: 'flex', alignItems: 'center', borderRadius: 4 }}
                      title="Chỉnh sửa tên nhóm">
                      <Pencil size={10} />
                    </button>
                    <button onClick={e => { e.stopPropagation(); onAddChild(node.id); }}
                      style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 4, cursor: 'pointer', color: '#10b981', padding: '1px 6px', fontSize: 10, display: 'flex', alignItems: 'center', gap: 3 }}
                      title="Thêm file vào nhóm này">
                      <Plus size={10} /> Thêm file
                    </button>
                    <button onClick={e => { e.stopPropagation(); onDeleteNode(node.id); }}
                      style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 4, cursor: 'pointer', color: '#ef4444', padding: '1px 5px', display: 'flex', alignItems: 'center' }}
                      title="Xóa nhóm này">
                      <Trash2 size={10} />
                    </button>
                  </>
                )}
              </div>
              );
            })()}


            {/* Document row */}
            {node.type === 'document' && doc && (() => {
              const extCfg = getExtConfig(doc.fileName);
              const safeLineCount = parseInt(String(doc.lineCount || 0), 10);
              return (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
                {/* File type icon with colored background */}
                <div style={{
                  width: 28, height: 28, borderRadius: 6, flexShrink: 0,
                  background: extCfg.bg, color: extCfg.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: `1px solid ${extCfg.color}30`,
                }}>
                  {extCfg.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      onDoubleClick={startLabelEdit} title={`Double-click để đổi tên\n${doc.fileName}`}>
                      {doc.fileName}
                    </div>
                    <FileExtBadge fileName={doc.fileName} />
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 3, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 10, color: '#475569' }}>{formatBytes(doc.fileSize)}</span>
                    <span style={{ fontSize: 10, color: '#334155' }}>·</span>
                    <span style={{ fontSize: 10, color: '#475569' }}>{formatDate(doc.uploadedAt)}</span>
                    {safeLineCount > 0 && (
                      <><span style={{ fontSize: 10, color: '#334155' }}>·</span>
                      <span style={{ fontSize: 10, color: '#64748b', fontWeight: 600 }}>{safeLineCount} dòng</span></>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  {safeLineCount > 0 && doc.sourceStatus !== 'COMMITTED' && doc.sourceStatus !== 'APPROVED' && (
                    <button
                      onClick={async e => {
                        e.stopPropagation();
                        const btn = e.currentTarget;
                        const originalText = btn.innerHTML;
                        btn.disabled = true;
                        btn.innerHTML = '⏳ Đang lưu...';
                        try {
                          const docId = node.id.replace('doc-', '');
                          const res = await fetch(`/api/source-center/${docId}/commit`, {
                            method: 'POST',
                            credentials: 'include'
                          });
                          const json = await res.json();
                          if (!res.ok) throw new Error(json.error || 'Failed to commit');
                          
                          // Dispatch custom event to tell UI that status changed
                          window.dispatchEvent(new CustomEvent('source-status-changed', {
                            detail: { docId, status: 'COMMITTED' }
                          }));
                          btn.innerHTML = `✅ Đã lưu ${json.count} vật tư`;
                        } catch (err: any) {
                          btn.disabled = false;
                          btn.innerHTML = `❌ Lỗi: ${err.message}`;
                          setTimeout(() => { if (btn) btn.innerHTML = originalText; }, 3000);
                        }
                      }}
                      style={{
                        background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)',
                        borderRadius: 6, cursor: 'pointer', color: '#60a5fa',
                        padding: '4px 12px', fontSize: 11, fontWeight: 700,
                        display: 'flex', alignItems: 'center', gap: 4,
                      }}
                      title="Chốt dữ liệu và đẩy vào bảng BOQ chính thức của dự án"
                    >
                      <Save size={12} /> Lưu & Đẩy vào BOQ
                    </button>
                  )}
                  <PipelineBar current={doc.sourceStatus} />
                  {/* + button to add child data line */}
                  {hovering && (
                    <button onClick={e => { e.stopPropagation(); onAddChild(node.id); }}
                      style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 4, cursor: 'pointer', color: '#10b981', padding: '1px 5px', fontSize: 10, display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}
                      title="Thêm dòng dữ liệu con">
                      <Plus size={10} />
                    </button>
                  )}
                  {/* Inline status edit */}
                  {editingStatus ? (
                    <select
                      autoFocus
                      value={doc.sourceStatus}
                      onBlur={() => setEditingStatus(false)}
                      onChange={e => { onStatusChange(node.id, e.target.value as DataFlowStatus); setEditingStatus(false); }}
                      onClick={e => e.stopPropagation()}
                      style={{ background: '#1e293b', border: '1px solid #3b82f6', borderRadius: 6, color: '#f8fafc', fontSize: 11, padding: '2px 4px', cursor: 'pointer', outline: 'none' }}
                    >
                      {(['RAW','CLASSIFIED','PARSED','STAGED','COMMITTED','APPROVED','REJECTED'] as DataFlowStatus[]).map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  ) : (
                    <div onClick={e => { e.stopPropagation(); setEditingStatus(true); }} title="Click để đổi trạng thái">
                      <StatusBadge status={doc.sourceStatus} />
                    </div>
                  )}
                  {/* Delete document button */}
                  {hovering && (
                    <button onClick={e => { e.stopPropagation(); onDeleteNode(node.id); }}
                      style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 4, cursor: 'pointer', color: '#ef4444', padding: '3px 5px', display: 'flex', alignItems: 'center', flexShrink: 0 }}
                      title="Xóa file này">
                      <Trash2 size={11} />
                    </button>
                  )}
                </div>
              </div>
              );
            })()}

            {/* Line row — structured BOQ data table */}
            {node.type === 'line' && line && (() => {
              const isLoading = line.lineId === 'loading';
              const isEmpty   = line.lineId === 'empty';
              const rd = line.rowData;
              const hasStructured = rd && (rd.ten || rd.soLuong || rd.donGia);

              const fmtN = (v: number | string | undefined) => {
                if (v == null || v === '' || v === undefined) return '';
                const n = typeof v === 'string' ? parseFloat(v.replace(/[^0-9.-]/g, '')) : v;
                if (isNaN(n)) return String(v);
                return n.toLocaleString('vi-VN');
              };

              // Check for extract action node
              const isExtractAction = line.lineId === 'empty' && line.rawValue?.startsWith('__EXTRACT_ACTION__');
              const eDocId    = isExtractAction ? (line.rawValue.match(/__EXTRACT_ACTION__(\d+)__/) || [])[1] : null;
              const eParentId = isExtractAction ? (line.rawValue.match(/__EXTRACT_ACTION__\d+__(.+)/) || [])[1] : null;

              if (isLoading) return (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#64748b', fontSize: 12 }}>
                  <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} />
                  Đang tải dữ liệu từ server…
                </div>
              );

              if (isEmpty && isExtractAction && eDocId && eParentId) return (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 0' }}>
                  <AlertTriangle size={13} color="#f59e0b" />
                  <span style={{ fontSize: 12, color: '#94a3b8' }}>File chưa được trích xuất dữ liệu</span>
                  <button
                    onClick={async e => {
                      e.stopPropagation();
                      // Show extracting toast
                      const btn = e.currentTarget as HTMLButtonElement;
                      btn.disabled = true;
                      btn.textContent = '⏳ Đang trích xuất…';
                      try {
                        const extractRes = await fetch(`/api/source-center/${eDocId}/extract`, {
                          method: 'POST',
                          credentials: 'include',
                          headers: { 'Content-Type': 'application/json' },
                        });
                        if (!extractRes.ok) {
                          const err = await extractRes.json().catch(() => ({}));
                          throw new Error(err.error || `HTTP ${extractRes.status}`);
                        }
                        const extractJson = await extractRes.json();
                        const count = extractJson.count || 0;

                        if (count === 0) {
                          btn.textContent = '⚠️ Không trích xuất được';
                          return;
                        }

                        // Reload lines
                        btn.textContent = `✅ Đã trích xuất ${count} dòng, đang tải…`;
                        const linesRes = await fetch(`/api/source-center/${eDocId}`, { credentials: 'include' });
                        if (!linesRes.ok) throw new Error('Cannot reload');
                        const linesJson = await linesRes.json();
                        const rawLines: Record<string, string>[] = linesJson.lines || [];

                        // Re-trigger the same parse logic via custom event
                        window.dispatchEvent(new CustomEvent('source-lines-loaded', {
                          detail: { docId: eDocId, parentId: eParentId, rawLines }
                        }));
                      } catch (err: any) {
                        btn.disabled = false;
                        btn.textContent = `❌ Lỗi: ${err.message}`;
                      }
                    }}
                    style={{
                      background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)',
                      borderRadius: 6, cursor: 'pointer', color: '#10b981',
                      padding: '4px 12px', fontSize: 11, fontWeight: 700,
                      display: 'flex', alignItems: 'center', gap: 4,
                    }}
                  >
                    <Zap size={11} /> Trích xuất ngay
                  </button>
                </div>
              );

              if (isEmpty) return (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#f59e0b', fontSize: 12 }}>
                  <AlertTriangle size={12} />
                  Chưa có dữ liệu — hãy chạy Extract trước
                </div>
              );

              if (hasStructured) return (
                <div style={{ width: '100%' }}>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '40px 1fr 80px 80px 120px 120px 70px',
                    gap: 0,
                    alignItems: 'center',
                    borderRadius: 6,
                    overflow: 'hidden',
                    border: '1px solid rgba(30,41,59,0.8)',
                    background: line.needsReview ? 'rgba(245,158,11,0.06)' : 'rgba(15,23,42,0.5)',
                  }}>
                    {editingLine ? (
                      <>
                        <div style={{ padding: '4px' }}><input style={{width:'100%',background:'#1e293b',color:'#fff',border:'none',borderRadius:4,padding:'4px 2px',fontSize:11,textAlign:'center'}} value={editLineData.stt || ''} onChange={e => setEditLineData({...editLineData, stt: e.target.value})} placeholder="STT" /></div>
                        <div style={{ padding: '4px' }}><input style={{width:'100%',background:'#1e293b',color:'#fff',border:'none',borderRadius:4,padding:'4px 8px',fontSize:12}} value={editLineData.ten || ''} onChange={e => setEditLineData({...editLineData, ten: e.target.value})} placeholder="Tên hàng hoá" autoFocus /></div>
                        <div style={{ padding: '4px' }}><input style={{width:'100%',background:'#1e293b',color:'#fff',border:'none',borderRadius:4,padding:'4px 6px',fontSize:12,textAlign:'right'}} value={editLineData.soLuong || ''} onChange={e => setEditLineData({...editLineData, soLuong: e.target.value})} placeholder="SL" /></div>
                        <div style={{ padding: '4px' }}><input style={{width:'100%',background:'#1e293b',color:'#fff',border:'none',borderRadius:4,padding:'4px 4px',fontSize:11,textAlign:'center'}} value={editLineData.donVi || ''} onChange={e => setEditLineData({...editLineData, donVi: e.target.value})} placeholder="ĐVT" /></div>
                        <div style={{ padding: '4px' }}><input style={{width:'100%',background:'#1e293b',color:'#fff',border:'none',borderRadius:4,padding:'4px 8px',fontSize:12,textAlign:'right'}} value={editLineData.donGia || ''} onChange={e => setEditLineData({...editLineData, donGia: e.target.value})} placeholder="Đơn giá" /></div>
                        <div style={{ padding: '4px' }}><input style={{width:'100%',background:'#1e293b',color:'#fff',border:'none',borderRadius:4,padding:'4px 8px',fontSize:12,textAlign:'right'}} value={editLineData.thanhTien || ''} onChange={e => setEditLineData({...editLineData, thanhTien: e.target.value})} placeholder="Thành tiền" /></div>
                        <div style={{ padding: '4px 6px', display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                          <button onClick={e => { e.stopPropagation(); handleSaveLine(); }} disabled={savingLine} style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 6px', cursor: 'pointer', fontSize: 10, fontWeight: 'bold' }}>{savingLine ? '...' : 'Lưu'}</button>
                          <button onClick={e => { e.stopPropagation(); setEditingLine(false); }} style={{ background: '#475569', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 6px', cursor: 'pointer', fontSize: 10 }}>Hủy</button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={{ padding: '6px 4px', textAlign: 'center', fontSize: 11, color: '#64748b', fontWeight: 700, borderRight: '1px solid #1e293b', fontFamily: 'monospace' }}>{rd?.stt ?? line.lineNumber}</div>
                        <div style={{ padding: '6px 8px', fontSize: 12, color: '#e2e8f0', fontWeight: 500, borderRight: '1px solid #1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={rd?.ten || line.parsedValue || line.rawValue} onDoubleClick={() => { setEditLineData(rd || {}); setEditingLine(true); }}>{rd?.ten || line.parsedValue || line.rawValue}</div>
                        <div style={{ padding: '6px 6px', textAlign: 'right', fontSize: 12, color: '#cbd5e1', borderRight: '1px solid #1e293b', fontVariantNumeric: 'tabular-nums' }}>{rd?.soLuong != null ? fmtN(rd.soLuong) : ''}</div>
                        <div style={{ padding: '6px 4px', textAlign: 'center', fontSize: 10, color: '#64748b', borderRight: '1px solid #1e293b' }}>{rd?.donVi || ''}</div>
                        <div style={{ padding: '6px 8px', textAlign: 'right', fontSize: 12, color: '#93c5fd', borderRight: '1px solid #1e293b', fontVariantNumeric: 'tabular-nums' }}>{rd?.donGia != null ? fmtN(rd.donGia) : ''}</div>
                        <div style={{ padding: '6px 8px', textAlign: 'right', fontSize: 12, color: '#10b981', fontWeight: 700, borderRight: '1px solid #1e293b', fontVariantNumeric: 'tabular-nums' }}>{rd?.thanhTien != null ? fmtN(rd.thanhTien) : ''}</div>
                        <div style={{ padding: '4px 6px', display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                          {hovering && (
                            <button onClick={e => { e.stopPropagation(); setEditLineData(rd || {}); setEditingLine(true); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3b82f6', padding: 1, display: 'flex', borderRadius: 3 }} title="Sửa dòng này"><Pencil size={11} /></button>
                          )}
                          {line.confidence === 'HIGH' && <CheckCircle size={10} color="#10b981" />}
                          {line.confidence === 'LOW'  && <AlertTriangle size={10} color="#f59e0b" />}
                          {hovering && (
                            <button onClick={e => { e.stopPropagation(); onDeleteNode(node.id); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 1, display: 'flex', borderRadius: 3 }} title="Xóa dòng này"><Trash2 size={11} /></button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                  {/* Ghi chú nếu có */}
                  {rd?.ghiChu && rd.ghiChu.trim() && rd.ghiChu !== rd.ten && !editingLine && (
                    <div style={{ fontSize: 10, color: '#475569', paddingLeft: 36, marginTop: 2, fontStyle: 'italic' }}>
                      💬 {rd.ghiChu}
                    </div>
                  )}
                  {editingLine && (
                    <div style={{ paddingLeft: 40, marginTop: 4 }}>
                      <input style={{width:'100%',background:'#1e293b',color:'#cbd5e1',border:'none',borderRadius:4,padding:'4px 8px',fontSize:11}} value={editLineData.ghiChu || ''} onChange={e => setEditLineData({...editLineData, ghiChu: e.target.value})} placeholder="Ghi chú thêm..." />
                    </div>
                  )}
                </div>
              );

              // Fallback: simple text row (no structured data)
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
                  <span style={{ fontSize: 11, color: '#475569', fontFamily: 'monospace', flexShrink: 0, minWidth: 24, textAlign: 'right' }}>
                    {line.lineNumber}
                  </span>
                  <span
                    onDoubleClick={startLabelEdit}
                    title="Double-click để chỉnh sửa"
                    style={{ fontSize: 12, color: '#94a3b8', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'text' }}
                  >
                    {line.parsedValue || line.rawValue}
                  </span>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 4, background: `${FIELD_TYPE_CONFIG[line.fieldType]?.color || '#475569'}20`, color: FIELD_TYPE_CONFIG[line.fieldType]?.color || '#475569', flexShrink: 0 }}>
                    {FIELD_TYPE_CONFIG[line.fieldType]?.label || line.fieldType}
                  </span>
                  {line.confidence === 'HIGH' && <CheckCircle size={10} color="#10b981" />}
                  {line.confidence === 'LOW'  && <AlertTriangle size={10} color="#f59e0b" />}
                  {line.needsReview && <AlertTriangle size={10} color="#ef4444" />}
                  {hovering && (
                    <button onClick={e => { e.stopPropagation(); onDeleteNode(node.id); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 2, display: 'flex', borderRadius: 3 }}
                      title="Xóa dòng này">
                      <Trash2 size={10} />
                    </button>
                  )}
                </div>
              );
            })()}

          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────
// RECURSIVE TREE RENDERER
// ─────────────────────────────────────────────────
function TreeView({
  nodes, expandedIds, selectedId, onToggle, onSelect, depth = 0,
  onLabelSave, onStatusChange, onAddChild, onDeleteNode,
}: {
  nodes: TreeNode[]; expandedIds: Set<string>; selectedId: string | null;
  onToggle: (node: TreeNode) => void; onSelect: (node: TreeNode) => void; depth?: number;
  onLabelSave: (nodeId: string, newLabel: string) => void;
  onStatusChange: (nodeId: string, status: DataFlowStatus) => void;
  onAddChild: (parentId: string) => void;
  onDeleteNode: (nodeId: string) => void;
}) {
  return (
    <>
      {nodes.map((node) => {
        const isDocExpanded = expandedIds.has(node.id) && node.type === 'document';
        const hasLineChildren = isDocExpanded && node.children && node.children.some(c => c.type === 'line');
        const hasStructuredLines = hasLineChildren && node.children!.some(c =>
          c.type === 'line' && (c.data as ExtractedLine)?.rowData?.ten
        );

        return (
          <React.Fragment key={node.id}>
            <TreeRow
              node={node}
              depth={depth}
              isExpanded={expandedIds.has(node.id)}
              isSelected={selectedId === node.id}
              onToggle={() => onToggle(node)}
              onSelect={() => onSelect(node)}
              onLabelSave={onLabelSave}
              onStatusChange={onStatusChange}
              onAddChild={onAddChild}
              onDeleteNode={onDeleteNode}
            />
            {/* BOQ column header — shown when document with structured line children is expanded */}
            {hasStructuredLines && (
              <div style={{
                paddingLeft: 16 + (depth + 1) * 24 + 20 + 28 + 8,
                paddingRight: 16,
                paddingTop: 4,
                paddingBottom: 2,
                background: 'rgba(30,41,59,0.6)',
                borderBottom: '1px solid #1e293b',
              }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '28px 1fr 60px 44px 90px 100px auto',
                  gap: 0,
                  borderRadius: '6px 6px 0 0',
                  overflow: 'hidden',
                  border: '1px solid rgba(51,65,85,0.8)',
                  background: '#0a111f',
                }}>
                  {[
                    { label: 'STT',        style: { textAlign: 'center' as const, width: 28 } },
                    { label: 'TÊN HÀNG HOÁ', style: { flex: 1 } },
                    { label: 'SL',         style: { textAlign: 'right' as const } },
                    { label: 'ĐVT',        style: { textAlign: 'center' as const } },
                    { label: 'ĐƠN GIÁ',   style: { textAlign: 'right' as const } },
                    { label: 'THÀNH TIỀN', style: { textAlign: 'right' as const } },
                    { label: '',           style: { minWidth: 40 } },
                  ].map((col, i) => (
                    <div key={i} style={{
                      padding: '4px 6px',
                      fontSize: 9,
                      fontWeight: 800,
                      color: '#475569',
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      borderRight: i < 6 ? '1px solid #1e293b' : 'none',
                      ...col.style,
                    }}>
                      {col.label}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {expandedIds.has(node.id) && node.children && (
              <TreeView
                nodes={node.children}
                expandedIds={expandedIds}
                selectedId={selectedId}
                onToggle={onToggle}
                onSelect={onSelect}
                depth={depth + 1}
                onLabelSave={onLabelSave}
                onStatusChange={onStatusChange}
                onAddChild={onAddChild}
                onDeleteNode={onDeleteNode}
              />
            )}
          </React.Fragment>
        );
      })}
    </>
  );
}


// ─────────────────────────────────────────────────
// STAT CARDS — top of dashboard
// ─────────────────────────────────────────────────
function StatCard({ label, value, icon, color, trend }: { label: string; value: string | number; icon: React.ReactNode; color: string; trend?: string }) {
  return (
    <div style={{
      background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: '16px 20px',
      display: 'flex', flexDirection: 'column', gap: 10,
      transition: 'border-color 0.2s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{label}</span>
        <div style={{ color, opacity: 0.8 }}>{icon}</div>
      </div>
      <div style={{ fontSize: 28, fontWeight: 900, color: '#f1f5f9', letterSpacing: '-0.03em' }}>{value}</div>
      {trend && <div style={{ fontSize: 11, color: '#10b981', fontWeight: 600 }}>{trend}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────
// MAIN DASHBOARD COMPONENT
// ─────────────────────────────────────────────────
export default function IngestionDashboard({ documents }: Props) {
  const [treeData, setTreeData] = useState<TreeNode[]>(() => buildTree(documents));

  // ── Listen for extraction completion event from line row buttons ──
  React.useEffect(() => {
    const handler = (e: Event) => {
      const { docId, parentId, rawLines } = (e as CustomEvent).detail as {
        docId: string; parentId: string; rawLines: Record<string, string>[];
      };

      const parseNum = (v: string | null | undefined): number | undefined => {
        if (!v) return undefined;
        const clean = String(v).replace(/[^0-9.,-]/g, '').replace(/,/g, '.');
        const n = parseFloat(clean);
        return isNaN(n) ? undefined : n;
      };

      const lineNodes: TreeNode[] = rawLines.map((row, idx) => {
        const stt       = row.line_number ?? (idx + 1);
        const rawVal    = row.raw_value || row.parsed_value || '';
        const parsedVal = row.parsed_value || '';
        const normVal   = row.normalized_value || '';
        const fType     = (row.field_type || 'NOTES') as FieldType;

        let rowData: ExtractedLine['rowData'];
        try {
          const obj = JSON.parse(normVal || rawVal);
          if (obj && typeof obj === 'object') {
            rowData = {
              stt: obj.stt ?? stt,
              ten: obj.ten ?? obj.name ?? obj.material ?? parsedVal,
              soLuong: obj.so_luong ?? obj.soLuong ?? obj.quantity,
              donVi: obj.don_vi ?? obj.unit,
              donGia: obj.don_gia ?? obj.price ?? obj.unit_price,
              thanhTien: obj.thanh_tien ?? obj.total,
              ghiChu: obj.ghi_chu ?? obj.note,
            };
          }
        } catch {
          const parts2 = rawVal.split(/\t|\|/);
          rowData = parts2.length >= 3 ? {
            stt: parts2[0]?.trim() || stt,
            ten: parts2[1]?.trim() || parsedVal,
            soLuong: parseNum(parts2[2]),
            donVi: parts2.length > 4 ? parts2[3]?.trim() : undefined,
            donGia: parseNum(parts2.length > 4 ? parts2[4] : parts2[3]),
            thanhTien: parseNum(parts2.length > 5 ? parts2[5] : parts2[4]),
          } : { stt, ten: parsedVal || rawVal };
        }

        const extractedLine: ExtractedLine = {
          id: parseInt(String(row.id || idx)),
          lineId: row.line_id || `line-${idx}`,
          lineNumber: parseInt(String(stt)) || (idx + 1),
          rawValue: rawVal, parsedValue: parsedVal, normalizedValue: normVal,
          fieldType: fType,
          confidence: (row.confidence || 'NONE') as Confidence,
          needsReview: String(row.needs_review) === 'true' || row.needs_review === 't',
          reviewNote: row.review_note || undefined,
          rowData,
        };

        return {
          id: `line-${row.id || idx}-${docId}`,
          label: rowData?.ten || rawVal || `Dòng ${idx + 1}`,
          level: 3 as const,
          type: 'line' as const,
          data: extractedLine,
        };
      });

      setTreeData(prev => {
        // Remove the empty node
        const withoutEmpty = (nodes: TreeNode[]): TreeNode[] =>
          nodes.filter(n => n.id !== `empty-${docId}`)
               .map(n => ({ ...n, children: n.children ? withoutEmpty(n.children) : undefined }));

        // Add real lines to parent
        const addAll = (nodes: TreeNode[]): TreeNode[] =>
          nodes.map(n => n.id === parentId
            ? { ...n, children: [...(n.children || []).filter(c => c.id !== `empty-${docId}`), ...lineNodes] }
            : { ...n, children: n.children ? addAll(n.children) : undefined }
          );

        return addAll(withoutEmpty(prev));
      });
    };

    window.addEventListener('source-lines-loaded', handler);

    const statusHandler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const { docId, status } = detail;
      if (!docId || !status) return;
      setTreeData(prev => {
        const updateRec = (nodes: TreeNode[]): TreeNode[] => 
          nodes.map(n => 
            n.id === `doc-${docId}` && n.type === 'document' 
              ? { ...n, status: status as DataFlowStatus, data: { ...n.data as any, sourceStatus: status } }
              : { ...n, children: n.children ? updateRec(n.children) : undefined }
          );
        return updateRec(prev);
      });
    };
    window.addEventListener('source-status-changed', statusHandler);

    const manualLineHandler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const { docId, node } = detail;
      if (!docId || !node) return;
      setTreeData(prev => addChildNode(prev, `doc-${docId}`, node));
      setExpandedIds(prev => new Set([...prev, `doc-${docId}`]));
    };
    window.addEventListener('add-manual-line', manualLineHandler);

    return () => {
      window.removeEventListener('source-lines-loaded', handler);
      window.removeEventListener('source-status-changed', statusHandler);
      window.removeEventListener('add-manual-line', manualLineHandler);
    };
  }, []);

  // ── Toast notification ──
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);
  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  // ── Helpers to mutate tree nodes by id ──
  const updateNodeLabel = useCallback((nodes: TreeNode[], id: string, newLabel: string): TreeNode[] =>
    nodes.map(n => (
      n.id === id
        ? { ...n, label: newLabel, data: n.data ? { ...n.data, fileName: newLabel } as any : n.data }
        : { ...n, children: n.children ? updateNodeLabel(n.children, id, newLabel) : undefined }
    )), []);

  const updateNodeStatus = useCallback((nodes: TreeNode[], id: string, status: DataFlowStatus): TreeNode[] =>
    nodes.map(n => (
      n.id === id && n.type === 'document'
        ? { ...n, status, data: { ...n.data as SourceDocument, sourceStatus: status } }
        : { ...n, children: n.children ? updateNodeStatus(n.children, id, status) : undefined }
    )), []);

  const deleteNode = useCallback((nodes: TreeNode[], id: string): TreeNode[] =>
    nodes
      .filter(n => n.id !== id)
      .map(n => ({ ...n, children: n.children ? deleteNode(n.children, id) : undefined })),
    []);

  const addChildNode = useCallback((nodes: TreeNode[], parentId: string, newNode: TreeNode): TreeNode[] =>
    nodes.map(n => (
      n.id === parentId
        ? { ...n, children: [...(n.children || []), newNode] }
        : { ...n, children: n.children ? addChildNode(n.children, parentId, newNode) : undefined }
    )), []);

  // ── Handlers ──
  const handleLabelSave = useCallback(async (nodeId: string, newLabel: string) => {
    setTreeData(prev => updateNodeLabel(prev, nodeId, newLabel));
    showToast(`✏️ Đã cập nhật: "${newLabel}"`, 'success');
    // Persist: find node type and call appropriate API
    try {
      // Extract numeric ID from nodeId like "doc-123"
      const parts = nodeId.split('-');
      if (parts[0] === 'doc' && parts[1]) {
        await fetch(`/api/source-center/${parts[1]}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ file_name: newLabel }),
        });
      }
    } catch { /* silent fail, UI already updated */ }
  }, [updateNodeLabel]);

  const handleStatusChange = useCallback(async (nodeId: string, status: DataFlowStatus) => {
    setTreeData(prev => updateNodeStatus(prev, nodeId, status));
    showToast(`🔄 Trạng thái → ${status}`, 'info');
    try {
      const parts = nodeId.split('-');
      if (parts[0] === 'doc' && parts[1]) {
        await fetch(`/api/source-center/${parts[1]}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ source_status: status }),
        });
      }
    } catch { /* silent */ }
  }, [updateNodeStatus]);

  const handleDeleteNode = useCallback(async (nodeId: string) => {
    setTreeData(prev => deleteNode(prev, nodeId));
    showToast('🗑️ Đã xóa', 'error');
  }, [deleteNode]);

  const loadLines = useCallback(async (parentId: string) => {
    const parts = parentId.split('-');
    const isDoc = parts[0] === 'doc' && parts[1];

    if (!isDoc) return;
    const docId = parts[1];

    // Show loading placeholder
    const loadingNode: TreeNode = {
      id: `loading-${docId}`,
      label: 'Đang tải dữ liệu…',
      level: 3,
      type: 'line',
      data: { id: -1, lineId: 'loading', lineNumber: 0, rawValue: 'loading…', fieldType: 'NOTES', confidence: 'NONE', needsReview: false } as ExtractedLine,
    };
    setTreeData(prev => addChildNode(prev, parentId, loadingNode));
    setExpandedIds(prev => new Set([...prev, parentId]));

    try {
      // Add a timeout to prevent hanging forever
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      const res = await fetch(`/api/source-center/${docId}`, { credentials: 'include', signal: controller.signal });
      clearTimeout(timeoutId);

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP ${res.status}`);
      }
      const json = await res.json();
      const rawLines: Record<string, string>[] = json.lines || [];

      // Parse raw DB rows → structured ExtractedLine with rowData
      const parseNum = (v: string | null | undefined): number | undefined => {
        if (!v) return undefined;
        const clean = String(v).replace(/[^0-9.,-]/g, '').replace(/,/g, '.');
        const n = parseFloat(clean);
        return isNaN(n) ? undefined : n;
      };

      let lineNodes: TreeNode[];

      if (rawLines.length === 0) {
        lineNodes = [{
          id: `empty-${docId}`,
          label: `__EXTRACT_ACTION__${docId}__${parentId}`,
          level: 3,
          type: 'line',
          data: { id: -2, lineId: 'empty', lineNumber: 0, rawValue: `__EXTRACT_ACTION__${docId}__${parentId}`, fieldType: 'NOTES', confidence: 'NONE', needsReview: false } as ExtractedLine,
        }];
      } else {
        lineNodes = rawLines.map((row, idx) => {
          const stt        = row.line_number ?? row.stt ?? (idx + 1);
          const rawVal     = row.raw_value || row.parsed_value || '';
          const parsedVal  = row.parsed_value || '';
          const normVal    = row.normalized_value || '';
          const fType      = (row.field_type || 'NOTES') as FieldType;

          let rowData: ExtractedLine['rowData'] = undefined;
          try {
            const obj = JSON.parse(normVal || rawVal);
            if (obj && typeof obj === 'object') {
              rowData = {
                stt:       obj.stt ?? obj.STT ?? stt,
                ten:       obj.ten ?? obj.TEN ?? obj.name ?? obj.material ?? obj.description ?? parsedVal,
                soLuong:   obj.so_luong ?? obj.soLuong ?? obj.SL ?? obj.quantity,
                donVi:     obj.don_vi ?? obj.donVi ?? obj.unit,
                donGia:    obj.don_gia ?? obj.donGia ?? obj.price ?? obj.unit_price,
                thanhTien: obj.thanh_tien ?? obj.thanhTien ?? obj.total ?? obj.amount,
                ghiChu:    obj.ghi_chu ?? obj.ghiChu ?? obj.note ?? obj.notes,
              };
            }
          } catch {
            const parts2 = rawVal.split(/\t|\|/);
            if (parts2.length >= 3) {
              rowData = {
                stt:       parts2[0]?.trim() || stt,
                ten:       parts2[1]?.trim() || parsedVal,
                soLuong:   parseNum(parts2[2]),
                donVi:     parts2.length > 4 ? parts2[3]?.trim() : undefined,
                donGia:    parseNum(parts2.length > 4 ? parts2[4] : parts2[3]),
                thanhTien: parseNum(parts2.length > 5 ? parts2[5] : parts2[4]),
                ghiChu:    parts2[parts2.length - 1]?.trim(),
              };
            } else {
              rowData = {
                stt:  stt,
                ten:  parsedVal || rawVal,
              };
            }
          }

          const extractedLine: ExtractedLine = {
            id:              parseInt(String(row.id || idx)),
            sourceDocId:     parseInt(String(docId)),
            lineId:          row.line_id || `line-${idx}`,
            lineNumber:      parseInt(String(stt)) || (idx + 1),
            rawValue:        rawVal,
            parsedValue:     parsedVal,
            normalizedValue: normVal,
            fieldType:       fType,
            confidence:      (row.confidence || 'NONE') as Confidence,
            needsReview:     String(row.needs_review) === 'true' || row.needs_review === 't',
            reviewNote:      row.review_note || undefined,
            rowData,
          };

          return {
            id: `line-${row.id || idx}-${docId}`,
            label: rowData?.ten || rawVal || `Dòng ${idx + 1}`,
            level: 3 as const,
            type: 'line' as const,
            data: extractedLine,
          };
        });
      }

      setTreeData(prev => {
        const withoutLoading = deleteNode(prev, `loading-${docId}`);
        let result = withoutLoading;
        for (const ln of lineNodes) {
          result = addChildNode(result, parentId, ln);
        }
        return result;
      });
      showToast(`✅ Đã tải ${lineNodes.length} dòng dữ liệu`, 'success');
    } catch (err: any) {
      console.error('Failed to load lines for doc', docId, err);
      setTreeData(prev => deleteNode(prev, `loading-${docId}`));
      showToast(`❌ Lỗi tải dữ liệu: ${err.message}`, 'error');
    }
  }, [addChildNode, deleteNode, showToast]);

  const handleAddChild = useCallback(async (parentId: string) => {
    const parts = parentId.split('-');
    const isDoc = parts[0] === 'doc' && parts[1];

    if (isDoc) {
      const docId = parts[1];
      const newLineId = `new-line-${Date.now()}`;
      const newStt = treeData.find(c => c.id === parentId)?.children?.length || 1;
      const newNode: TreeNode = {
        id: newLineId,
        label: `Dòng mới ${newStt}`,
        level: 3,
        type: 'line',
        data: {
          id: -1,
          isNew: true,
          sourceDocId: parseInt(String(docId)),
          lineId: newLineId,
          lineNumber: newStt,
          rawValue: '',
          fieldType: 'NOTES',
          confidence: 'NONE',
          needsReview: true,
          rowData: { stt: String(newStt), ten: 'Tên vật tư (Nhập tay)', soLuong: 1, donGia: 0 }
        } as ExtractedLine,
      };
      setTreeData(prev => addChildNode(prev, parentId, newNode));
      setExpandedIds(prev => new Set([...prev, parentId]));
      showToast('➕ Đã thêm dòng mới. Click icon Sửa để chỉnh sửa.', 'info');
      return;
    }

    // ── PROJECT / CATEGORY: add blank child node (original behavior) ──
    const newNode: TreeNode = {
      id: `manual-${Date.now()}`,
      label: 'Mục mới (double-click để đổi tên)',
      level: 1,
      type: 'category',
      count: 0,
    };
    setTreeData(prev => addChildNode(prev, parentId, newNode));
    showToast('➕ Đã thêm mục mới', 'info');
  }, [addChildNode, deleteNode]);


  const tree = treeData;

  // Auto-expand first project
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    const s = new Set<string>();
    if (tree[0]) s.add(tree[0].id);
    return s;
  });
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  const toggleExpand = useCallback((node: TreeNode) => {
    setExpandedIds(prev => {
      const s = new Set(prev);
      const id = node.id;
      if (s.has(id)) {
        s.delete(id);
      } else {
        s.add(id);
        if (node.type === 'document' && (!node.children || node.children.length === 0)) {
          setTimeout(() => loadLines(id), 0);
        }
      }
      return s;
    });
  }, [loadLines]);

  const expandAll = () => {
    const ids = new Set<string>();
    const collect = (nodes: TreeNode[]) => nodes.forEach(n => { ids.add(n.id); if (n.children) collect(n.children); });
    collect(tree);
    setExpandedIds(ids);
  };

  const collapseAll = () => setExpandedIds(new Set());

  // Filter tree
  const filterTree = (nodes: TreeNode[], q: string, statusF: string): TreeNode[] => {
    if (!q && !statusF) return nodes;
    const filtered: TreeNode[] = [];
    for (const node of nodes) {
      const labelMatch = node.label.toLowerCase().includes(q.toLowerCase());
      const statusMatch = !statusF || (node.type === 'document' && (node.data as SourceDocument)?.sourceStatus === statusF);
      const children = node.children ? filterTree(node.children, q, statusF) : undefined;
      if (labelMatch || statusMatch || (children && children.length > 0)) {
        filtered.push({ ...node, children: children && children.length > 0 ? children : node.children });
      }
    }
    return filtered;
  };

  const displayTree = filterTree(tree, search, statusFilter);

  // Stats
  const totalDocs = documents.length;
  const stagedCount = documents.filter(d => d.sourceStatus === 'STAGED').length;
  const approvedCount = documents.filter(d => d.sourceStatus === 'APPROVED').length;
  // Fix: lineCount may arrive as string from PostgreSQL bigint — always parseInt
  const totalLines = documents.reduce((s, d) => s + (parseInt(String(d.lineCount || 0), 10)), 0);

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: '#020617', minHeight: '100vh', color: '#f8fafc', position: 'relative' }}>
      {/* ── TOAST ── */}
      {toast && (
        <div style={{
          position: 'fixed', top: 16, right: 24, zIndex: 99999,
          background: toast.type === 'success' ? '#10b981' : toast.type === 'error' ? '#ef4444' : '#3b82f6',
          color: '#fff', padding: '10px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600,
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)', animation: 'none',
        }}>
          {toast.msg}
        </div>
      )}

      {/* ── HINT BAR ── */}
      <div style={{ padding: '6px 24px', background: 'rgba(59,130,246,0.08)', borderBottom: '1px solid rgba(59,130,246,0.15)', display: 'flex', alignItems: 'center', gap: 16, fontSize: 11, color: '#60a5fa' }}>
        <span>💡 <strong>Cách chỉnh sửa thủ công:</strong></span>
        <span>• <strong>Double-click</strong> vào tên để đổi tên bất kỳ mục nào</span>
        <span>• <strong>Click</strong> vào Badge trạng thái để thay đổi trạng thái file</span>
        <span>• Di chuột để thấy nút ✏️ Sửa / ➕ Thêm / 🗑️ Xóa</span>
        <span>• <strong>Enter</strong> để lưu · <strong>Esc</strong> để huỷ</span>
      </div>
      {/* ── TOP BAR ── */}
      <div style={{ padding: '20px 24px', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0a111f' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', padding: '8px', borderRadius: 10 }}>
            <Layers size={20} color="#fff" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: '#f1f5f9', letterSpacing: '-0.02em' }}>
              Ingestion Dashboard
            </h1>
            <p style={{ margin: 0, fontSize: 12, color: '#475569' }}>
              Phân luồng dữ liệu cha-con · Source → Parse → Stage → ERP
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'transparent', border: '1px solid #334155', borderRadius: 8, color: '#94a3b8', fontSize: 12, cursor: 'pointer' }}>
            <Download size={14} /> Export
          </button>
          <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'linear-gradient(135deg,#3b82f6,#2563eb)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            <Upload size={14} /> Nhập File
          </button>
        </div>
      </div>

      {/* ── STAT CARDS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, padding: '16px 24px' }}>
        <StatCard label="Tổng Files" value={totalDocs} icon={<FileText size={18} />} color="#3b82f6" />
        <StatCard label="Tổng Dòng DL" value={totalLines.toLocaleString()} icon={<BarChart3 size={18} />} color="#10b981" trend="Đã bóc tách" />
        <StatCard label="Staged" value={stagedCount} icon={<Database size={18} />} color="#f59e0b" />
        <StatCard label="Đã Duyệt" value={approvedCount} icon={<CheckCircle size={18} />} color="#10b981" />
      </div>

      {/* ── SEARCH & FILTER BAR ── */}
      <div style={{ padding: '0 24px 12px', display: 'flex', gap: 10, alignItems: 'center' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm kiếm file, dự án, dòng dữ liệu..."
            style={{ width: '100%', paddingLeft: 32, paddingRight: 12, height: 36, background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, color: '#f8fafc', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          style={{ height: 36, padding: '0 10px', background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, color: '#94a3b8', fontSize: 12, cursor: 'pointer', outline: 'none' }}
        >
          <option value="">Tất cả trạng thái</option>
          {(['RAW', 'CLASSIFIED', 'PARSED', 'STAGED', 'COMMITTED', 'APPROVED', 'REJECTED'] as DataFlowStatus[]).map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <button onClick={expandAll} style={{ padding: '0 12px', height: 36, background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, color: '#64748b', fontSize: 11, cursor: 'pointer' }}>
          Mở tất cả
        </button>
        <button onClick={collapseAll} style={{ padding: '0 12px', height: 36, background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, color: '#64748b', fontSize: 11, cursor: 'pointer' }}>
          Thu gọn
        </button>
      </div>

      {/* ── LEGEND ── */}
      <div style={{ padding: '0 24px 10px', display: 'flex', gap: 16, alignItems: 'center' }}>
        <span style={{ fontSize: 10, color: '#475569', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Phân cấp:</span>
        {[
          { label: 'A, B, C... Dự án', color: '#3b82f6' },
          { label: 'I, II... Nhóm loại', color: '#10b981' },
          { label: '1, 2... File tài liệu', color: '#f59e0b' },
          { label: 'Dòng dữ liệu', color: '#8b5cf6' },
        ].map(({ label, color }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
            <span style={{ fontSize: 10, color: '#64748b' }}>{label}</span>
          </div>
        ))}
      </div>

      {/* ── MAIN CONTENT: Tree + Detail Panel ── */}
      <div style={{ display: 'flex', height: 'calc(100vh - 262px)', overflow: 'hidden', margin: '0 24px 24px', background: '#0a111f', borderRadius: 14, border: '1px solid #1e293b' }}>
        {/* Tree Panel */}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          {displayTree.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60%', color: '#475569' }}>
              <Database size={40} />
              <p style={{ marginTop: 12, fontSize: 14 }}>Không tìm thấy dữ liệu</p>
            </div>
          ) : (
            <TreeView
              nodes={displayTree}
              expandedIds={expandedIds}
              selectedId={selectedNode?.id || null}
              onToggle={toggleExpand}
              onSelect={setSelectedNode}
              onLabelSave={handleLabelSave}
              onStatusChange={handleStatusChange}
              onAddChild={handleAddChild}
              onDeleteNode={handleDeleteNode}
            />
          )}
        </div>

        {/* Detail Drawer */}
        {selectedNode && (
          <DetailPanel node={selectedNode} onClose={() => setSelectedNode(null)} />
        )}
      </div>
    </div>
  );
}
