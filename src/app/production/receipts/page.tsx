import { db } from '@/db';
import { productionOutputs, productionOrders, materials, users } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';
import { format } from 'date-fns';

export const dynamic = 'force-dynamic';

export default async function ProductionReceiptsPage() {
  const outputs = await db.select({
      id: productionOutputs.id,
      outNo: productionOutputs.outputNumber,
      poCode: productionOrders.code,
      material: materials.name,
      quantity: productionOutputs.quantity,
      user: users.name,
      createdAt: productionOutputs.createdAt
  }).from(productionOutputs)
    .leftJoin(productionOrders, eq(productionOutputs.productionOrderId, productionOrders.id))
    .leftJoin(materials, eq(productionOutputs.productId, materials.id))
    .leftJoin(users, eq(productionOutputs.userId, users.id))
    .orderBy(desc(productionOutputs.createdAt));

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Nhập thành phẩm (Production Output)</h1>
      </div>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Số phiếu</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lệnh SX</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sản phẩm</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Số lượng nhập</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Người nhập</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ngày giờ</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {outputs.map((o) => (
              <tr key={o.id}>
                <td className="px-6 py-4 whitespace-nowrap font-medium">{o.outNo}</td>
                <td className="px-6 py-4 whitespace-nowrap text-blue-600">{o.poCode}</td>
                <td className="px-6 py-4 whitespace-nowrap">{o.material}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right font-bold text-green-600">{Number(o.quantity).toLocaleString()}</td>
                <td className="px-6 py-4 whitespace-nowrap">{o.user}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500">{o.createdAt ? format(new Date(o.createdAt), 'dd/MM/yyyy HH:mm') : ''}</td>
              </tr>
            ))}
            {outputs.length === 0 && (
              <tr><td colSpan={6} className="px-6 py-4 text-center text-gray-500">Chưa có phiếu nhập thành phẩm</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
