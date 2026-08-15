import { db } from '@/db';
import { scrapLogs, productionOrders, materials, users } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';
import { format } from 'date-fns';

export const dynamic = 'force-dynamic';

export default async function ScrapPage() {
  const scraps = await db.select({
      id: scrapLogs.id,
      poCode: productionOrders.code,
      material: materials.name,
      quantity: scrapLogs.quantity,
      reason: scrapLogs.reason,
      reporter: users.name,
      createdAt: scrapLogs.createdAt
  }).from(scrapLogs)
    .leftJoin(productionOrders, eq(scrapLogs.productionOrderId, productionOrders.id))
    .leftJoin(materials, eq(scrapLogs.materialId, materials.id))
    .leftJoin(users, eq(scrapLogs.employeeId, users.id))
    .orderBy(desc(scrapLogs.createdAt));

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <h1 className="text-2xl font-bold mb-6">Ghi Nhận Phế Phẩm</h1>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lệnh SX</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vật tư / SP</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">SL Phế phẩm</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nguyên nhân</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Người ghi nhận</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ngày giờ</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {scraps.map((s) => (
              <tr key={s.id}>
                <td className="px-6 py-4 whitespace-nowrap font-medium text-blue-600">{s.poCode}</td>
                <td className="px-6 py-4 whitespace-nowrap">{s.material}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right font-bold text-red-600">{Number(s.quantity).toLocaleString()}</td>
                <td className="px-6 py-4">{s.reason}</td>
                <td className="px-6 py-4 whitespace-nowrap">{s.reporter}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500">{s.createdAt ? format(new Date(s.createdAt), 'dd/MM/yyyy HH:mm') : ''}</td>
              </tr>
            ))}
            {scraps.length === 0 && (
              <tr><td colSpan={6} className="px-6 py-4 text-center text-gray-500">Chưa có ghi nhận phế phẩm</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
