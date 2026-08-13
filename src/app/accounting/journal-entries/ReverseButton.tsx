'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function ReverseButton({ id, periodId, isReversed }: { id: number, periodId: number, isReversed: boolean }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  if (isReversed) {
    return <span className="text-gray-400 text-xs italic">Đã đảo (Reversed)</span>;
  }

  const handleReverse = async () => {
    if (!confirm('Bạn có chắc muốn REVERSE phiếu hạch toán này?')) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/accounting/journal-entries/${id}/reverse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetPeriodId: periodId }) // reverse into same period for simplicity
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert('Đảo bút toán thành công!');
      router.refresh();
    } catch (e: any) {
      alert('Lỗi: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleReverse}
      disabled={loading}
      className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 disabled:opacity-50"
    >
      {loading ? '...' : 'Reverse'}
    </button>
  );
}
