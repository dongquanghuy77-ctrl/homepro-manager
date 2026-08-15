import { db } from '@/db';
import { workCenters, machines } from '@/db/schema';
import { desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export default async function WorkCentersPage() {
  const centers = await db.select().from(workCenters).orderBy(desc(workCenters.createdAt));
  const machs = await db.select().from(machines);

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <h1 className="text-2xl font-bold mb-6">Tổ và Máy Sản Xuất</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-4 bg-gray-50 border-b"><h2 className="font-semibold text-lg">Tổ / Khu vực sản xuất</h2></div>
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-100">
                    <tr><th className="px-4 py-2 text-left text-xs text-gray-500 uppercase">Tên</th><th className="px-4 py-2 text-left text-xs text-gray-500 uppercase">Mã</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                    {centers.map(c => (
                        <tr key={c.id}><td className="px-4 py-2 font-medium">{c.name}</td><td className="px-4 py-2 text-gray-500">{c.code}</td></tr>
                    ))}
                    {centers.length === 0 && <tr><td colSpan={2} className="px-4 py-2 text-center text-gray-500">Trống</td></tr>}
                </tbody>
            </table>
        </div>
        <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-4 bg-gray-50 border-b"><h2 className="font-semibold text-lg">Máy (Machines)</h2></div>
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-100">
                    <tr><th className="px-4 py-2 text-left text-xs text-gray-500 uppercase">Tên Máy</th><th className="px-4 py-2 text-left text-xs text-gray-500 uppercase">Mã</th><th className="px-4 py-2 text-left text-xs text-gray-500 uppercase">Trạng thái</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                    {machs.map(m => (
                        <tr key={m.id}><td className="px-4 py-2 font-medium">{m.name}</td><td className="px-4 py-2 text-gray-500">{m.code}</td><td className="px-4 py-2"><span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">{m.isActive ? 'Hoạt động' : 'Tạm dừng'}</span></td></tr>
                    ))}
                    {machs.length === 0 && <tr><td colSpan={3} className="px-4 py-2 text-center text-gray-500">Trống</td></tr>}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
}
