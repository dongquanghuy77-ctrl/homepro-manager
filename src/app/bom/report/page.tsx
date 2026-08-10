// src/app/bom/report/page.tsx — Báo cáo ngân sách BOM
import type { Metadata } from 'next';
import BomReportClient from './BomReportClient';

export const metadata: Metadata = { title: 'Báo cáo Ngân sách BOM — HomePro Manager' };
export const dynamic = 'force-dynamic';

export default async function BomReportPage() {
  // Tải dữ liệu từ API trên server
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';
  let report = [];
  try {
    const res  = await fetch(`${baseUrl}/api/bom/report`, { cache: 'no-store' });
    const data = await res.json();
    report = data.report ?? [];
  } catch { /* Server render — API chưa ready, client sẽ tự fetch */ }

  return <BomReportClient initialReport={report} />;
}
