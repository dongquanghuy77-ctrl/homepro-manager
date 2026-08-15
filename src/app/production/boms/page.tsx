import { db } from '@/db';
import { boms, materials, users } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

export const metadata = {
  title: 'Định mức vật tư (BOM) | HomePro ERP',
};

export default async function BomsPage() {
  const data = await db.select({
    bom: boms,
    productName: materials.name,
    productCode: materials.code,
  })
    .from(boms)
    .innerJoin(materials, eq(boms.productId, materials.id))
    .orderBy(desc(boms.id));

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Định mức vật tư (BOM)</h1>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 bg-gray-50 border-b">
          <h2 className="font-semibold text-lg">Danh sách BOM tiêu chuẩn</h2>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mã Thành Phẩm</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên Thành Phẩm</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên BOM</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phiên bản</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                  Chưa có định mức vật tư nào.
                </td>
              </tr>
            )}
            {data.map(({ bom, productName, productCode }) => (
              <tr key={bom.id}>
                <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{productCode}</td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-500">{productName}</td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-500">{bom.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-500">v{bom.version}</td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                  {bom.status === 'ACTIVE' ? (
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold">Hiệu lực</span>
                  ) : bom.status === 'OBSOLETE' ? (
                    <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-semibold">Đã hủy</span>
                  ) : (
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-semibold">Bản nháp</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
