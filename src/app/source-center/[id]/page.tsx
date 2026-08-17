import { Suspense } from 'react';
import DocumentClient from './DocumentClient';

export default function SourceDocumentPage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={<div className="p-8">Đang tải dữ liệu...</div>}>
      <DocumentClient id={params.id} />
    </Suspense>
  );
}
