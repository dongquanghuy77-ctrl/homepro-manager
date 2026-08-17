import type { Metadata } from 'next';
import ApprovalCenterClient from './ApprovalCenterClient';
import { db } from '@/db';
import { businessDecisions } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

export const metadata: Metadata = {
  title: 'Approval Center — BAO MINH CMT8',
  description: 'Trung tâm phê duyệt dữ liệu dự án Bảo Minh CMT8 — xem evidence, approve/reject staging records.',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ApprovalCenterPage() {
  const decisions = await db.select()
    .from(businessDecisions)
    .where(eq(businessDecisions.projectId, 108))
    .orderBy(desc(businessDecisions.createdAt));

  return (
    <div className="page-container">
      <ApprovalCenterClient initialData={decisions} />
    </div>
  );
}
