import { NextRequest, NextResponse } from 'next/server';
import { withDb } from '@/lib/source-center/db';
import { getSessionFromRequest } from '@/lib/session.edge';

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  return withDb(async (client) => {
    const [docStats, categoryStats, statusStats, stagingStats, lineageStats] = await Promise.all([
      client.query(`SELECT COUNT(*) as total, SUM(file_size) as total_size FROM source_documents`),
      client.query(`SELECT document_category, COUNT(*) as count FROM source_documents GROUP BY document_category ORDER BY count DESC`),
      client.query(`SELECT source_status, COUNT(*) as count FROM source_documents GROUP BY source_status ORDER BY count DESC`),
      client.query(`SELECT staging_status, COUNT(*) as count FROM staging_records GROUP BY staging_status ORDER BY count DESC`),
      client.query(`SELECT COUNT(*) as total FROM data_lineage`),
    ]);
    
    return NextResponse.json({
      documents: { total: parseInt(docStats.rows[0].total), totalSizeBytes: parseInt(docStats.rows[0].total_size || '0') },
      byCategory: categoryStats.rows,
      byStatus: statusStats.rows,
      staging: stagingStats.rows,
      lineage: { total: parseInt(lineageStats.rows[0].total) },
    });
  });
}
