import { withDb } from '@/lib/source-center/db';
import SourceCenterClient from './SourceCenterClient';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Source Data Center — HomePro Manager' };
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function SourceCenterPage() {
  const data = await withDb(async (client) => {
    // Basic stats
    const statsRes = await client.query(`
      SELECT document_category as category, COUNT(*) as count 
      FROM source_documents GROUP BY document_category
    `);
    const statusRes = await client.query(`
      SELECT source_status as status, COUNT(*) as count 
      FROM source_documents GROUP BY source_status
    `);
    
    const docsRes = await client.query(`
      SELECT sd.*, p.name as project_name 
      FROM source_documents sd
      LEFT JOIN projects p ON p.id = sd.project_id
      ORDER BY sd.created_at DESC
      LIMIT 100
    `);
    
    return {
      stats: statsRes.rows,
      statusStats: statusRes.rows,
      documents: docsRes.rows,
    };
  });

  // Ensure parsing JSON if needed
  return (
    <div className="page-container">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Source Data Center</h1>
          <p className="text-sm text-slate-500">Centralized ingestion and processing for all project files and source data.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <a href="/source-center/ingestion" className="px-4 py-2 bg-purple-600 text-white rounded-md text-sm font-medium hover:bg-purple-700 flex items-center gap-2">
            🌳 Ingestion Dashboard
          </a>
          <a href="/source-center/staging" className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700">
            Staging Review
          </a>
        </div>
      </div>
      <SourceCenterClient initialData={data} />
    </div>
  );
}
