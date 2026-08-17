import type { Metadata } from 'next';
import ApprovalCenterClient from './ApprovalCenterClient';

export const metadata: Metadata = {
  title: 'Approval Center — BAO MINH CMT8',
  description: 'Trung tâm phê duyệt dữ liệu dự án Bảo Minh CMT8 — xem evidence, approve/reject staging records.',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function ApprovalCenterPage() {
  return (
    <div className="page-container">
      <ApprovalCenterClient />
    </div>
  );
}
