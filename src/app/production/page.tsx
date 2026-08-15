import { db } from '@/db';
import { productionOrders, productionPlans, jobCards } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import Link from 'next/link';
import { Activity, CalendarDays, ClipboardList, Package } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ProductionDashboard() {
  const stats = await db.select({
    totalPlans: sql`count(distinct ${productionPlans.id})`,
    totalOrders: sql`count(distinct ${productionOrders.id})`,
    activeOrders: sql`count(distinct case when ${productionOrders.status} = 'IN_PROGRESS' then ${productionOrders.id} end)`,
    totalJobCards: sql`count(distinct ${jobCards.id})`
  }).from(productionPlans)
    .leftJoin(productionOrders, eq(productionOrders.planId, productionPlans.id))
    .leftJoin(jobCards, eq(jobCards.productionOrderId, productionOrders.id));

  const s = stats[0] as any;

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <h1 className="text-2xl font-bold mb-6">Tổng Quan Sản Xuất</h1>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-full mr-4">
              <CalendarDays className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500 uppercase font-semibold">Kế hoạch</p>
              <h3 className="text-2xl font-bold text-gray-900">{s.totalPlans}</h3>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-indigo-500">
          <div className="flex items-center">
            <div className="p-3 bg-indigo-100 rounded-full mr-4">
              <ClipboardList className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500 uppercase font-semibold">Lệnh SX</p>
              <h3 className="text-2xl font-bold text-gray-900">{s.totalOrders}</h3>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-yellow-500">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-100 rounded-full mr-4">
              <Activity className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500 uppercase font-semibold">Đang chạy</p>
              <h3 className="text-2xl font-bold text-gray-900">{s.activeOrders}</h3>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-500">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-full mr-4">
              <Package className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500 uppercase font-semibold">Job Cards</p>
              <h3 className="text-2xl font-bold text-gray-900">{s.totalJobCards}</h3>
            </div>
          </div>
        </div>
      </div>
      <div className="bg-white p-6 rounded-lg shadow">
         <h2 className="text-lg font-semibold mb-4">Các chức năng chính</h2>
         <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/production/plans" className="p-4 border rounded hover:bg-gray-50 font-medium text-center">Kế hoạch Sản xuất</Link>
            <Link href="/production/orders" className="p-4 border rounded hover:bg-gray-50 font-medium text-center">Lệnh Sản xuất</Link>
            <Link href="/production/job-cards" className="p-4 border rounded hover:bg-gray-50 font-medium text-center">Job Cards</Link>
            <Link href="/production/receipts" className="p-4 border rounded hover:bg-gray-50 font-medium text-center">Nhập Thành phẩm</Link>
         </div>
      </div>
    </div>
  );
}
