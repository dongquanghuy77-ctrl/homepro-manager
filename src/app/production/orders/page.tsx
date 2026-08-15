import { db } from '@/db';
import { productionOrders, productionPlans, projects, materials } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { format } from 'date-fns';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function ProductionOrdersPage() {
  const orders = await db
    .select({
      id: productionOrders.id,
      code: productionOrders.code,
      project: projects.name,
      product: materials.name,
      plannedQuantity: productionOrders.plannedQuantity,
      completedQuantity: productionOrders.completedQuantity,
      status: productionOrders.status,
      qcStatus: productionOrders.qcStatus,
      createdAt: productionOrders.createdAt
    })
    .from(productionOrders)
    .leftJoin(projects, eq(productionOrders.projectId, projects.id))
    .leftJoin(materials, eq(productionOrders.productId, materials.id))
    .orderBy(desc(productionOrders.createdAt));

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Lệnh Sản Xuất</h1>
        <Link href="/production/plans" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          Xem Kế Hoạch Sản Xuất
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mã Lệnh</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dự án</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sản phẩm</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">SL Kế Hoạch</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">SL Hoàn Thành</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">QC</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {orders.map((po) => (
              <tr key={po.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{po.code}</td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-500">{po.project}</td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-500">{po.product}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-gray-900">{Number(po.plannedQuantity).toLocaleString()}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-gray-900">{Number(po.completedQuantity).toLocaleString()}</td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    po.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                    po.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {po.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    po.qcStatus === 'PASS' ? 'bg-green-100 text-green-800' :
                    po.qcStatus === 'FAIL' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {po.qcStatus}
                  </span>
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                  Chưa có lệnh sản xuất nào
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
