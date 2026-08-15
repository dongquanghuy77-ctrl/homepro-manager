import { db } from '@/db';
import { jobCards, workOrders, users } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';
import { format } from 'date-fns';

export const dynamic = 'force-dynamic';

export default async function JobCardsPage() {
  const cards = await db.select({
      id: jobCards.id,
      operation: workOrders.operation,
      goodQty: jobCards.completedQuantity,
      defectQty: jobCards.rejectedQuantity,
      worker: users.name,
      createdAt: jobCards.createdAt
  }).from(jobCards)
    .leftJoin(workOrders, eq(jobCards.workOrderId, workOrders.id))
    .leftJoin(users, eq(jobCards.employeeId, users.id))
    .orderBy(desc(jobCards.createdAt));

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Thẻ công việc (Job Cards)</h1>
      </div>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mã JC</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Công đoạn</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Người làm</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">SL Đạt</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">SL Lỗi</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ngày giờ</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {cards.map((c) => (
              <tr key={c.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">JC-{c.id}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{c.operation}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{c.worker}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-green-600">{Number(c.goodQty).toLocaleString()}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-red-600 font-bold">{Number(c.defectQty).toLocaleString()}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500">{c.createdAt ? format(new Date(c.createdAt), 'dd/MM/yyyy HH:mm') : ''}</td>
              </tr>
            ))}
            {cards.length === 0 && (
              <tr><td colSpan={6} className="px-6 py-4 text-center text-gray-500">Chưa có thẻ công việc nào</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
