// src/app/payroll/page.tsx
// Bảng Lương Tổng Hợp — Route Page (HR/Admin only)
'use client';
import { useEffect }  from 'react';
import { useRouter }  from 'next/navigation';
import useSWR         from 'swr';
import PayrollMasterDashboard from '@/components/hr/PayrollMasterDashboard';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function PayrollPage() {
  const router = useRouter();
  const { data, isLoading } = useSWR('/api/auth/session-info', fetcher);

  useEffect(() => {
    if (!data || isLoading) return;
    const role = data?.role as string | undefined;
    if (!role || !['ADMIN', 'MANAGER', 'SUPERVISOR', 'ACCOUNTANT', 'HR'].includes(role)) {
      router.replace('/dashboard');
    }
  }, [data, isLoading, router]);

  if (isLoading) {
    return <div style={{ padding: 40, textAlign: 'center' }}>⏳ Đang xác thực...</div>;
  }

  return (
    <div className="main-content">
      <PayrollMasterDashboard />
    </div>
  );
}
