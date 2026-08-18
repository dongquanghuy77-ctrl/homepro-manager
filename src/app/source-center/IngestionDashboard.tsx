'use client';

import React, { useState, useCallback, useRef } from 'react';
import {
  ChevronRight, ChevronDown, FolderOpen, Folder, File, FileText,
  FileSpreadsheet, Image, Upload, Search, Filter, RefreshCw,
  CheckCircle, Clock, AlertTriangle, XCircle, Zap, Database,
  ArrowRight, Link, Layers, Hash, Tag, Download, Eye,
  BarChart3, TrendingUp, Package, BookOpen
} from 'lucide-react';

// ─────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────
export type DataFlowStatus = 'RAW' | 'INGESTING' | 'PARSED' | 'STAGED' | 'APPROVED' | 'REJECTED';

export type DocumentCategory =
  | 'BOQ_EXCEL' | 'BOQ_PDF' | 'DESIGN_PDF' | 'MATERIAL_IMAGE'
  | 'SURVEY_IMAGE' | 'UNCATEGORIZED' | 'MANUAL_ENTRY' | 'CONTRACT' | 'OTHER';

export type FieldType = 'MATERIAL' | 'QUANTITY' | 'PRICE' | 'SUPPLIER' | 'DATE' | 'CUSTOMER' | 'PROJECT' | 'COMPONENT' | 'DIMENSION' | 'HARDWARE' | 'BOQ' | 'BOM' | 'NOTES';

export type Confidence = 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';

export interface ExtractedLine {
  id: number;
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
// CONSTANTS & HELPERS
// ─────────────────────────────────────────────────
const STATUS_CONFIG: Record<DataFlowStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  RAW:       { label: 'RAW',       color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', icon: <Clock size={11} /> },
  INGESTING: { label: 'INGESTING', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  icon: <RefreshCw size={11} /> },
  PARSED:    { label: 'PARSED',    color: '#3b82f6', bg: 'rgba(59,130,246,0.12)',  icon: <Zap size={11} /> },
  STAGED:    { label: 'STAGED',    color: '#f59e0b', bg: 'rgba(245,158,11,0.15)',  icon: <Database size={11} /> },
  APPROVED:  { label: 'APPROVED',  color: '#10b981', bg: 'rgba(16,185,129,0.12)', icon: <CheckCircle size={11} /> },
  REJECTED:  { label: 'REJECTED',  color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  icon: <XCircle size={11} /> },
};

const CATEGORY_CONFIG: Record<DocumentCategory, { label: string; icon: React.ReactNode; color: string }> = {
  BOQ_EXCEL:    { label: 'BOQ Excel',    icon: <FileSpreadsheet size={14} />, color: '#10b981' },
  BOQ_PDF:      { label: 'BOQ PDF',      icon: <FileText size={14} />,        color: '#3b82f6' },
  DESIGN_PDF:   { label: 'Bản vẽ PDF',   icon: <BookOpen size={14} />,        color: '#8b5cf6' },
  MATERIAL_IMAGE:{ label: 'Ảnh Vật tư',  icon: <Image size={14} />,           color: '#f59e0b' },
  SURVEY_IMAGE: { label: 'Ảnh Khảo sát', icon: <Image size={14} />,           color: '#ec4899' },
  UNCATEGORIZED:{ label: 'Chưa phân loại',icon: <File size={14} />,           color: '#64748b' },
  MANUAL_ENTRY: { label: 'Nhập thủ công', icon: <Hash size={14} />,           color: '#06b6d4' },
  CONTRACT:     { label: 'Hợp đồng',      icon: <Tag size={14} />,            color: '#f97316' },
  OTHER:        { label: 'Khác',          icon: <Package size={14} />,         color: '#a78bfa' },
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

const formatBytes = (bytes?: number) => {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (s: string) => {
  try { return new Date(s).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }); }
  catch { return s; }
};

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

      categoryNodes.push({
        id: `cat-${pIdx}-${cat}`,
        label: CATEGORY_CONFIG[cat]?.label || cat,
        level: 1 as const,
        type: 'category' as const,
        children: docNodes,
        count: catDocs.length,
        status: undefined,
      });
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
const PIPELINE_STAGES: DataFlowStatus[] = ['RAW', 'INGESTING', 'PARSED', 'STAGED', 'APPROVED'];

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
  node, isExpanded, isSelected, onToggle, onSelect, depth
}: {
  node: TreeNode; isExpanded: boolean; isSelected: boolean;
  onToggle: () => void; onSelect: () => void; depth: number;
}) {
  const hasChildren = node.children && node.children.length > 0;
  const doc = node.type === 'document' ? node.data as SourceDocument : null;
  const line = node.type === 'line' ? node.data as ExtractedLine : null;

  const indent = depth * 24;
  const levelColors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];

  // Row background
  let rowBg = 'transparent';
  if (isSelected) rowBg = 'rgba(59,130,246,0.12)';
  if (node.type === 'project') rowBg = isSelected ? 'rgba(59,130,246,0.12)' : 'rgba(15,23,42,0.8)';

  return (
    <div
      onClick={onSelect}
      style={{
        display: 'flex', alignItems: 'center', gap: 0,
        padding: `${node.type === 'project' ? 10 : node.type === 'category' ? 8 : 6}px 16px`,
        paddingLeft: 16 + indent,
        background: rowBg,
        borderBottom: node.type === 'project' ? '1px solid #1e293b' : '1px solid rgba(30,41,59,0.5)',
        cursor: 'pointer',
        transition: 'background 0.15s',
        borderLeft: isSelected ? '2px solid #3b82f6' : '2px solid transparent',
        position: 'relative',
      }}
      onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'; }}
      onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = rowBg; }}
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
        {/* Project row */}
        {node.type === 'project' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: '#f1f5f9', letterSpacing: '0.02em' }}>{node.label}</span>
            {node.count != null && (
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10, background: 'rgba(59,130,246,0.15)', color: '#93c5fd', border: '1px solid rgba(59,130,246,0.2)' }}>
                {node.count} files
              </span>
            )}
          </div>
        )}

        {/* Category row */}
        {node.type === 'category' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#cbd5e1' }}>
              {['I','II','III','IV','V','VI','VII','VIII','IX','X'][0]} {node.label}
            </span>
            {node.count != null && (
              <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 6, background: '#1e293b', color: '#64748b', border: '1px solid #334155' }}>
                {node.count}
              </span>
            )}
          </div>
        )}

        {/* Document row */}
        {node.type === 'document' && doc && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#93c5fd', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {doc.fileName}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 3, alignItems: 'center' }}>
                <span style={{ fontSize: 10, color: '#475569' }}>{formatBytes(doc.fileSize)}</span>
                <span style={{ fontSize: 10, color: '#334155' }}>·</span>
                <span style={{ fontSize: 10, color: '#475569' }}>{formatDate(doc.uploadedAt)}</span>
                {doc.lineCount != null && doc.lineCount > 0 && (
                  <>
                    <span style={{ fontSize: 10, color: '#334155' }}>·</span>
                    <span style={{ fontSize: 10, color: '#475569' }}>{doc.lineCount} dòng</span>
                  </>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <PipelineBar current={doc.sourceStatus} />
              <StatusBadge status={doc.sourceStatus} />
            </div>
          </div>
        )}

        {/* Line row */}
        {node.type === 'line' && line && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 11, color: '#64748b', fontFamily: 'monospace', flexShrink: 0 }}>#{line.lineNumber}</span>
            <span style={{ fontSize: 12, color: '#94a3b8', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {line.parsedValue || line.rawValue}
            </span>
            <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 4, background: `${FIELD_TYPE_CONFIG[line.fieldType]?.color || '#475569'}20`, color: FIELD_TYPE_CONFIG[line.fieldType]?.color || '#475569', flexShrink: 0 }}>
              {FIELD_TYPE_CONFIG[line.fieldType]?.label || line.fieldType}
            </span>
            {line.confidence === 'HIGH' && <CheckCircle size={10} color="#10b981" />}
            {line.confidence === 'LOW'  && <AlertTriangle size={10} color="#f59e0b" />}
            {line.needsReview && <AlertTriangle size={10} color="#ef4444" />}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────
// RECURSIVE TREE RENDERER
// ─────────────────────────────────────────────────
function TreeView({
  nodes, expandedIds, selectedId, onToggle, onSelect, depth = 0
}: {
  nodes: TreeNode[]; expandedIds: Set<string>; selectedId: string | null;
  onToggle: (id: string) => void; onSelect: (node: TreeNode) => void; depth?: number;
}) {
  return (
    <>
      {nodes.map((node) => (
        <React.Fragment key={node.id}>
          <TreeRow
            node={node}
            depth={depth}
            isExpanded={expandedIds.has(node.id)}
            isSelected={selectedId === node.id}
            onToggle={() => onToggle(node.id)}
            onSelect={() => onSelect(node)}
          />
          {expandedIds.has(node.id) && node.children && (
            <TreeView
              nodes={node.children}
              expandedIds={expandedIds}
              selectedId={selectedId}
              onToggle={onToggle}
              onSelect={onSelect}
              depth={depth + 1}
            />
          )}
        </React.Fragment>
      ))}
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
  const tree = buildTree(documents);

  // Auto-expand first project
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    const s = new Set<string>();
    if (tree[0]) s.add(tree[0].id);
    return s;
  });
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  }, []);

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
  const totalLines = documents.reduce((s, d) => s + (d.lineCount || 0), 0);

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: '#020617', minHeight: '100vh', color: '#f8fafc' }}>
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
          {(['RAW', 'INGESTING', 'PARSED', 'STAGED', 'APPROVED', 'REJECTED'] as DataFlowStatus[]).map(s => (
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
      <div style={{ display: 'flex', height: 'calc(100vh - 262px)', overflow: 'hidden', margin: '0 24px 24px', background: '#0a111f', borderRadius: 14, border: '1px solid #1e293b', overflow: 'hidden' }}>
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
