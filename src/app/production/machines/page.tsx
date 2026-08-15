import { db } from '@/db';
import { machines, workCenters } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

export const metadata = {
  title: 'Danh sách máy móc | HomePro ERP',
};

export default async function MachinesPage() {
  const data = await db.select({
    machine: machines,
    workCenterName: workCenters.name,
  })
    .from(machines)
    .leftJoin(workCenters, eq(machines.workCenterId, workCenters.id))
    .orderBy(desc(machines.createdAt));

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Danh sách máy móc</h1>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 bg-gray-50 border-b">
          <h2 className="font-semibold text-lg">Quản lý thiết bị / Máy móc</h2>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mã Máy</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên Máy</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loại</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tổ SX (Work Center)</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                  Chưa có thiết bị máy móc nào.
                </td>
              </tr>
            )}
            {data.map(({ machine, workCenterName }) => (
              <tr key={machine.id}>
                <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{machine.code}</td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-500">{machine.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-500">{machine.type}</td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-500">{workCenterName || 'Chưa gắn'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                  {machine.isActive ? (
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold">Hoạt động</span>
                  ) : (
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-semibold">Tạm dừng</span>
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
