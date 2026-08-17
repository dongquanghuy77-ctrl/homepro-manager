export interface SourceDocument {
  id: number;
  sourceId: string;
  sourceName: string;
  sourceType: string;
  fileName: string;
  originalPath?: string;
  storagePath?: string;
  fileSize?: number;
  checksum?: string;
  mimeType?: string;
  version: number;
  parentSourceId?: number;
  uploadedBy?: number;
  uploadedAt: string;
  projectId?: number;
  documentCategory: string;
  sourceStatus: string;
  autoRoutedTo?: string;
  classificationConfidence?: number;
  notes?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  // Joined
  projectName?: string;
  uploaderName?: string;
  lineCount?: number;
}

export interface SourceDocumentLine {
  id: number;
  lineId: string;
  sourceDocId: number;
  lineNumber: number;
  rawValue?: string;
  parsedValue?: string;
  normalizedValue?: string;
  fieldType?: string;
  confidence: string;
  needsReview: boolean;
  reviewNote?: string;
  linkedMaterialId?: number;
  linkedSupplierId?: number;
  linkedBoqItemId?: number;
  stagedRecordType?: string;
  stagedRecordId?: string;
  erpRecordType?: string;
  erpRecordId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface StagingRecord {
  id: number;
  stagingId: string;
  sourceDocId: number;
  sourceLineId?: number;
  targetModule: string;
  targetEntityType: string;
  stagingStatus: string;
  rawData: Record<string, unknown>;
  normalizedData?: Record<string, unknown>;
  finalData?: Record<string, unknown>;
  validationErrors?: unknown[];
  matchResult?: Record<string, unknown>;
  confidence: string;
  reviewedBy?: number;
  reviewedAt?: string;
  reviewNote?: string;
  postedBy?: number;
  postedAt?: string;
  erpRecordType?: string;
  erpRecordId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DataLineage {
  id: number;
  lineageId: string;
  erpRecordType: string;
  erpRecordId: string;
  stagingId?: string;
  sourceDocId?: number;
  sourceLineId?: number;
  sourceFile?: string;
  lineageChain?: unknown[];
  createdAt: string;
}

export type DocumentCategory =
  | 'BOQ_EXCEL' | 'BOQ_PDF' | 'DESIGN_PDF' | 'DESIGN_SKETCHUP'
  | 'SURVEY_IMAGE' | 'MATERIAL_IMAGE' | 'PROCUREMENT_DOCUMENT'
  | 'PRODUCTION_EVIDENCE' | 'QC_EVIDENCE' | 'DELIVERY_DOCUMENT'
  | 'INSTALLATION_DOCUMENT' | 'FINANCIAL_DOCUMENT' | 'CONTRACT'
  | 'MANUAL_ENTRY' | 'OTHER';

export type SourceStatus = 'RAW' | 'INGESTING' | 'PARSED' | 'CLASSIFIED' | 'NORMALIZED' | 'STAGED' | 'MATCHED' | 'APPROVED' | 'REJECTED' | 'ARCHIVED';

export type Confidence = 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
