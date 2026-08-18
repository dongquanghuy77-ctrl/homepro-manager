import { withDb } from '@/lib/source-center/db';
import IngestionDashboard from '../IngestionDashboard';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Ingestion Dashboard — HomePro Manager' };
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function IngestionPage() {
  const documents = await withDb(async (client) => {
    const docsRes = await client.query(`
      SELECT 
        sd.id,
        sd.source_id as "sourceId",
        sd.source_name as "sourceName",
        sd.source_type as "sourceType",
        sd.file_name as "fileName",
        sd.file_size as "fileSize",
        sd.document_category as "documentCategory",
        sd.source_status as "sourceStatus",
        sd.uploaded_at as "uploadedAt",
        sd.auto_routed_to as "autoRoutedTo",
        sd.classification_confidence as "classificationConfidence",
        p.name as "projectName",
        CAST((SELECT COUNT(*) FROM source_document_lines sdl WHERE sdl.source_doc_id = sd.id) AS INTEGER) as "lineCount"
      FROM source_documents sd
      LEFT JOIN projects p ON p.id = sd.project_id
      ORDER BY p.name NULLS LAST, sd.document_category, sd.uploaded_at DESC
      LIMIT 500
    `);
    return docsRes.rows;
  });

  return <IngestionDashboard documents={documents} />;
}
