import { db } from '@/db';
import { budgets, projects } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';
import { format } from 'date-fns';

export const dynamic = 'force-dynamic';

export default async function CostingPage() {
  const list = await db.select({
      id: budgets.id,
      project: projects.name,
      code: projects.code,
      totalBudget: budgets.totalBudget,
      totalActual: budgets.actualCost,
      status: budgets.status
  }).from(budgets)
    .leftJoin(projects, eq(budgets.projectId, projects.id))
    .orderBy(desc(budgets.createdAt));

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <h1 className="text-2xl font-bold mb-6">Theo Dõi Chi Phí / Giá Thành Thực Tế</h1>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mã NS</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dự án</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ngân sách (Kế hoạch)</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Thực tế (Actual)</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Chênh lệch</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {list.map((b) => {
                const diff = Number(b.totalBudget || 0) - Number(b.totalActual || 0);
                return (
              <tr key={b.id}>
                <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{b.code}</td>
                <td className="px-6 py-4 whitespace-nowrap text-blue-600">{b.project}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-gray-900">{Number(b.totalBudget || 0).toLocaleString()} ₫</td>
                <td className="px-6 py-4 whitespace-nowrap text-right font-bold text-red-600">{Number(b.totalActual || 0).toLocaleString()} ₫</td>
                <td className={`px-6 py-4 whitespace-nowrap text-right font-medium ${diff < 0 ? 'text-red-500' : 'text-green-500'}`}>{diff.toLocaleString()} ₫</td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">{b.status}</span>
                </td>
              </tr>
            )})}
            {list.length === 0 && (
              <tr><td colSpan={6} className="px-6 py-4 text-center text-gray-500">Chưa có ngân sách nào</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
