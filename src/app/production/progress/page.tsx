import { db } from '@/db';
import { productionPlans, projects } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';
import { format } from 'date-fns';

export const dynamic = 'force-dynamic';

export default async function ProductionProgressPage() {
  const plans = await db.select({
      id: productionPlans.id,
      code: productionPlans.code,
      project: projects.name,
      start: productionPlans.startDate,
      end: productionPlans.endDate,
      status: productionPlans.status
  }).from(productionPlans)
    .leftJoin(projects, eq(productionPlans.projectId, projects.id))
    .orderBy(desc(productionPlans.createdAt));

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <h1 className="text-2xl font-bold mb-6">Tiến Độ Sản Xuất</h1>
      <div className="bg-white rounded-lg shadow overflow-hidden p-6">
        <h3 className="font-semibold text-lg mb-4">Tiến độ theo Kế hoạch</h3>
        <div className="space-y-4">
            {plans.map(p => {
                let progress = 0;
                if (p.status === 'COMPLETED') progress = 100;
                else if (p.status === 'IN_PROGRESS') progress = 50;
                
                return (
                <div key={p.id} className="border p-4 rounded-lg">
                    <div className="flex justify-between mb-2">
                        <span className="font-medium">{p.code} - {p.project}</span>
                        <span className="text-sm text-gray-500">{p.start ? format(new Date(p.start), 'dd/MM/yyyy') : ''} - {p.end ? format(new Date(p.end), 'dd/MM/yyyy') : ''}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div className={`h-2.5 rounded-full ${progress === 100 ? 'bg-green-600' : 'bg-blue-600'}`} style={{ width: `${progress}%` }}></div>
                    </div>
                    <div className="mt-2 flex justify-between text-xs text-gray-500">
                        <span>{progress}% Hoàn thành</span>
                        <span>Trạng thái: {p.status}</span>
                    </div>
                </div>
            )})}
            {plans.length === 0 && <p className="text-gray-500 text-center">Chưa có kế hoạch</p>}
        </div>
      </div>
    </div>
  );
}
