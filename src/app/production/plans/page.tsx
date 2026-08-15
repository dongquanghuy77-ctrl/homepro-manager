import { db } from '@/db';
import { productionPlans, projects, users } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { format } from 'date-fns';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function ProductionPlansPage() {
  const plans = await db
    .select({
      id: productionPlans.id,
      code: productionPlans.code,
      name: productionPlans.name,
      project: projects.name,
      status: productionPlans.status,
      startDate: productionPlans.startDate,
      endDate: productionPlans.endDate,
      creator: users.name
    })
    .from(productionPlans)
    .leftJoin(projects, eq(productionPlans.projectId, projects.id))
    .leftJoin(users, eq(productionPlans.createdBy, users.id))
    .orderBy(desc(productionPlans.createdAt));

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Kế Hoạch Sản Xuất</h1>
        <Link href="/production/orders" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          Xem Lệnh Sản Xuất
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mã KH</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên Kế Hoạch</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dự án</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thời gian</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Người lập</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {plans.map((plan) => (
              <tr key={plan.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{plan.code}</td>
                <td className="px-6 py-4 text-gray-500">{plan.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-500">{plan.project}</td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                  {plan.startDate ? format(new Date(plan.startDate), 'dd/MM/yyyy') : ''} -{' '}
                  {plan.endDate ? format(new Date(plan.endDate), 'dd/MM/yyyy') : ''}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    plan.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                    plan.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {plan.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-500">{plan.creator}</td>
              </tr>
            ))}
            {plans.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                  Chưa có kế hoạch sản xuất nào
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
