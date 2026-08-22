import React from 'react';
import { getSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { ActionCenter } from '@/components/dashboard/ActionCenter';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { headers } from 'next/headers';

import { DashboardService } from '@/lib/dashboard/services';

export const dynamic = 'force-dynamic';

async function getDashboardData(session: any) {
  try {
    return await DashboardService.getOverview(session);
  } catch (error) {
    console.error('Fetch dashboard data error', error);
    return null;
  }
}

export default async function MasterDashboardPage() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  if (session.username === 'quan.mai' || session.username === 'duy.le') {
    redirect('/pwr/dashboard');
  }

  const data = await getDashboardData(session);
  
  if (!data) {
    return (
      <DashboardShell role={session.role} user={session.name}>
        <div className="card text-center p-12 text-red-500">
          Lỗi tải dữ liệu Dashboard. Vui lòng thử lại sau.
        </div>
      </DashboardShell>
    );
  }

  const { permissions, kpis, actions, activity } = data;

  return (
    <DashboardShell role={session.role} user={session.name}>
      
      {/* KPI COMMAND CENTER */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {permissions.canViewHr && (
          <>
            <KpiCard title="Nhân sự hôm nay" value={kpis.hr.presentToday} icon="👥" link="/hr" trend={{ value: `${kpis.hr.totalEmployees} tổng`, isPositive: true }} />
            <KpiCard title="Đi muộn" value={kpis.hr.lateToday} icon="⏰" color="#F59E0B" bg="#FEF3C7" link="/hr" />
            <KpiCard title="Nghỉ phép chờ duyệt" value={kpis.hr.pendingLeave} icon="✉️" color="#3B82F6" bg="#DBEAFE" link="/leave" />
          </>
        )}
        
        {permissions.canViewProjects && (
          <>
            <KpiCard title="Dự án đang chạy" value={kpis.projects.activeProjects} icon="🏗️" color="#10B981" bg="#D1FAE5" link="/projects" />
            <KpiCard title="Công việc trễ hạn" value={kpis.projects.overdueTasks} icon="🚨" color="#EF4444" bg="#FEE2E2" link="/tasks" />
          </>
        )}
        
        {permissions.canViewFinance && kpis.finance?.totalCost !== null && (
          <KpiCard title="Chi phí dự án" value={`${(kpis.finance.totalCost / 1000000).toFixed(1)}M`} icon="💰" color="#8B5CF6" bg="#EDE9FE" />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* ACTION CENTER */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <ActionCenter actions={actions} />
          
          {/* CHARTS OVERVIEW */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {permissions.canViewProjects && (
              <ChartCard 
                title="Tình trạng công việc" 
                type="pie" 
                data={[
                  { name: 'Hoàn thành', value: kpis.projects.totalTasks - kpis.projects.overdueTasks }, // Simplification for demo
                  { name: 'Quá hạn', value: kpis.projects.overdueTasks }
                ]}
                colors={['#10B981', '#EF4444']}
              />
            )}
            {permissions.canViewHr && (
              <ChartCard 
                title="Tỉ lệ đi làm hôm nay" 
                type="pie" 
                data={[
                  { name: 'Có mặt', value: kpis.hr.presentToday },
                  { name: 'Vắng', value: kpis.hr.absentToday }
                ]}
                colors={['#3B82F6', '#9CA3AF']}
              />
            )}
          </div>
        </div>

        {/* RECENT ACTIVITY */}
        <div className="lg:col-span-1">
          <ActivityFeed activities={activity} />
        </div>
      </div>
      
    </DashboardShell>
  );
}
