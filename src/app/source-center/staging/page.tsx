import { Suspense } from 'react';
import StagingClient from './StagingClient';

export default function StagingPage() {
  return (
    <Suspense fallback={<div className="p-8">Đang tải...</div>}>
      <StagingClient />
    </Suspense>
  );
}
