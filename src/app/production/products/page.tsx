import { db } from '@/db';
import { materials } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

export const metadata = {
  title: 'Danh mục thành phẩm | HomePro ERP',
};

export default async function ProductsPage() {
  const products = await db.select()
    .from(materials)
    .where(eq(materials.type, 'FINISHED_GOOD'))
    .orderBy(desc(materials.createdAt));

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Danh mục thành phẩm</h1>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 bg-gray-50 border-b">
          <h2 className="font-semibold text-lg">Danh sách thành phẩm</h2>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mã SP</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên thành phẩm</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ĐVT</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Danh mục</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Tồn kho</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {products.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                  Chưa có thành phẩm nào được định nghĩa.
                </td>
              </tr>
            )}
            {products.map((p) => (
              <tr key={p.id}>
                <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{p.code}</td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-500">{p.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-500">{p.unit}</td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-500">{p.category || 'N/A'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right font-semibold text-gray-900">{p.stockQty}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
