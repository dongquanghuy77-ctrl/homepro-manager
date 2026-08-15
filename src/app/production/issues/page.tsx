import { db } from '@/db';
import { materialConsumptions, productionOrders, materials } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';
import { format } from 'date-fns';

export const dynamic = 'force-dynamic';

export default async function MaterialIssuesPage() {
  const issues = await db.select({
      id: materialConsumptions.id,
      poCode: productionOrders.code,
      material: materials.name,
      quantity: materialConsumptions.quantity,
      createdAt: materialConsumptions.createdAt
  }).from(materialConsumptions)
    .leftJoin(productionOrders, eq(materialConsumptions.productionOrderId, productionOrders.id))
    .leftJoin(materials, eq(materialConsumptions.materialId, materials.id))
    .orderBy(desc(materialConsumptions.createdAt));

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <h1 className="text-2xl font-bold mb-6">Lịch Sử Cấp Phát Vật Tư</h1>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lệnh SX</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vật tư</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Số lượng cấp</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ngày giờ</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {issues.map((i) => (
              <tr key={i.id}>
                <td className="px-6 py-4 whitespace-nowrap font-medium text-blue-600">{i.poCode}</td>
                <td className="px-6 py-4 whitespace-nowrap">{i.material}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right font-bold">{Number(i.quantity).toLocaleString()}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500">{i.createdAt ? format(new Date(i.createdAt), 'dd/MM/yyyy HH:mm') : ''}</td>
              </tr>
            ))}
            {issues.length === 0 && (
              <tr><td colSpan={4} className="px-6 py-4 text-center text-gray-500">Chưa có cấp phát vật tư</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
