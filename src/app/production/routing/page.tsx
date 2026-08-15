import { db } from '@/db';
import { routings, routingSteps } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export default async function RoutingPage() {
  const list = await db.select().from(routings).orderBy(desc(routings.createdAt));
  const steps = await db.select().from(routingSteps);

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <h1 className="text-2xl font-bold mb-6">Danh Mục Quy Trình Công Đoạn</h1>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tên Quy Trình</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mã</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Số công đoạn</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {list.map((r) => (
              <tr key={r.id}>
                <td className="px-6 py-4 whitespace-nowrap font-medium">{r.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-500">{r.code}</td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-500">{steps.filter(s => s.routingId === r.id).length}</td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr><td colSpan={3} className="px-6 py-4 text-center text-gray-500">Chưa có dữ liệu</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
