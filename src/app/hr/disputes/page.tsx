// src/app/hr/disputes/page.tsx
// HR-only: Hộp thư xử lý khiếu nại phiếu lương
import DisputeReviewDashboard from '@/components/hr/DisputeReviewDashboard';

export const metadata = {
  title: 'Hộp thư Khiếu nại | HomePro Manager',
  description: 'HR xem xét và phản hồi khiếu nại phiếu lương của nhân viên',
};

export default function DisputesPage() {
  return <DisputeReviewDashboard />;
}
