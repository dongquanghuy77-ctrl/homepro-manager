import { db } from '@/db';
import { 
  users, attendance, leaveRequests, overtimeRequests, projects, tasks, qcIssues, costs, 
  hrAuditLogs, salesOrders, purchaseOrders, materials, stockBalances, productionOrders,
  journalEntries
} from '@/db/schema';
import { eq, and, sql, inArray, desc } from 'drizzle-orm';
import { getTodayVN } from '@/lib/hr';
import { getAccessibleDepartmentIds } from '@/lib/rbac';

export class DashboardService {
  static async getOverview(session: any) {
    if (!session) throw new Error('Unauthorized');

    const { role, id: userId, department } = session;
    const today = getTodayVN();

    // 1. Enforce Data Scope based on RBAC
    let userConds: any[] = [];
    let projectConds: any[] = [];
    
    if (role === 'WORKER') {
      userConds.push(eq(users.id, userId));
      projectConds.push(eq(projects.id, 0)); // No project overview for worker
    } else if (role === 'MANAGER') {
      const accessibleDeptIds = await getAccessibleDepartmentIds(userId);
      if (accessibleDeptIds.length > 0) {
        userConds.push(inArray(users.departmentId, accessibleDeptIds));
      } else if (department) {
        userConds.push(eq(users.department, department));
      } else {
        userConds.push(eq(users.id, userId));
      }
    } else if (role === 'HR') {
      projectConds.push(eq(projects.id, 0)); 
    }

    // 2. HR & People Data
    const totalEmpRes = await db.select({ count: sql<number>`count(*)` }).from(users).where(userConds.length ? and(...userConds) : undefined);
    const presentRes = await db.select({ count: sql<number>`count(*)` })
      .from(attendance).leftJoin(users, eq(attendance.employeeId, users.id))
      .where(and(eq(attendance.workDate, today), inArray(attendance.status, ['PRESENT', 'LATE', 'HALF_DAY']), ...(userConds.length ? userConds : [])));
    const absentRes = await db.select({ count: sql<number>`count(*)` })
      .from(attendance).leftJoin(users, eq(attendance.employeeId, users.id))
      .where(and(eq(attendance.workDate, today), eq(attendance.status, 'ABSENT'), ...(userConds.length ? userConds : [])));
    const lateRes = await db.select({ count: sql<number>`count(*)` })
      .from(attendance).leftJoin(users, eq(attendance.employeeId, users.id))
      .where(and(eq(attendance.workDate, today), eq(attendance.status, 'LATE'), ...(userConds.length ? userConds : [])));
    const pendingLeaveRes = await db.select({ count: sql<number>`count(*)` })
      .from(leaveRequests).leftJoin(users, eq(leaveRequests.employeeId, users.id))
      .where(and(inArray(leaveRequests.status, ['PENDING', 'PENDING_HR']), ...(userConds.length ? userConds : [])));
    const pendingOvertimeRes = await db.select({ count: sql<number>`count(*)` })
      .from(overtimeRequests).leftJoin(users, eq(overtimeRequests.employeeId, users.id))
      .where(and(eq(overtimeRequests.status, 'PENDING'), ...(userConds.length ? userConds : [])));

    // 3. Projects
    const allProjects = await db.select().from(projects).where(projectConds.length ? and(...projectConds) : undefined);
    const allTasks = await db.select().from(tasks);
    const allQc = await db.select().from(qcIssues);

    // 4. Finance & Costs
    const allCosts = await db.select().from(costs);
    const allSales = await db.select().from(salesOrders);
    
    // 5. Operations
    const pendingPO = await db.select({ count: sql<number>`count(*)` }).from(purchaseOrders).where(eq(purchaseOrders.status, 'SUBMITTED'));
    const pendingProd = await db.select({ count: sql<number>`count(*)` }).from(productionOrders).where(eq(productionOrders.status, 'PLANNED'));
    const lowStockMats = await db.select().from(materials).innerJoin(stockBalances, eq(materials.id, stockBalances.materialId));

    // 6. Activities
    const activities = await db.select().from(hrAuditLogs).orderBy(desc(hrAuditLogs.createdAt)).limit(10);

    // --- AGGREGATION ---
    const totalEmployees = Number(totalEmpRes[0]?.count || 0);
    const presentToday = Number(presentRes[0]?.count || 0);
    const absentToday = Number(absentRes[0]?.count || 0);
    const lateToday = Number(lateRes[0]?.count || 0);
    const pendingLeave = Number(pendingLeaveRes[0]?.count || 0);
    const pendingOvertime = Number(pendingOvertimeRes[0]?.count || 0);

    const totalProjects = allProjects.length;
    const activeProjects = allProjects.filter(p => p.status === 'ACTIVE').length;
    const completedProjects = allProjects.filter(p => p.status === 'COMPLETED').length;
    let overdueProjects = 0;
    allProjects.forEach(p => {
      if (p.status !== 'COMPLETED' && p.deadline && new Date(p.deadline) < new Date()) overdueProjects++;
    });
    const overdueTasks = allTasks.filter(t => t.status !== 'COMPLETED' && t.endDate && new Date(t.endDate) < new Date());

    const openQc = allQc.filter(q => q.status === 'OPEN' || q.status === 'IN_PROGRESS');
    const criticalQc = openQc.filter(q => q.severity === 'CRITICAL');

    const totalCost = allCosts.reduce((acc, curr) => acc + (curr.amount || 0), 0);
    const totalRevenue = allSales.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);

    let lowStockCount = 0;
    lowStockMats.forEach(r => {
      if ((r.stock_balances?.onHand || 0) <= (r.materials?.minStock || 0)) {
        lowStockCount++;
      }
    });

    const pendingPurchaseCount = Number(pendingPO[0]?.count || 0);
    const pendingProductionCount = Number(pendingProd[0]?.count || 0);

    // --- ACTIONS / ALERTS ---
    const actionItems: { id: string; severity: "MEDIUM" | "CRITICAL" | "HIGH" | "LOW"; module: string; message: string; link: string; }[] = [];
    if (overdueProjects > 0 && (role === 'ADMIN' || role === 'MANAGER')) {
      actionItems.push({ id: 'act-proj', severity: 'HIGH', module: 'PROJECT', message: `${overdueProjects} dự án trễ hạn`, link: '/projects' });
    }
    if (pendingLeave > 0 && (role === 'ADMIN' || role === 'MANAGER' || role === 'HR')) {
      actionItems.push({ id: 'act-leave', severity: 'MEDIUM', module: 'HR', message: `${pendingLeave} đơn nghỉ chờ duyệt`, link: '/leave' });
    }
    if (pendingOvertime > 0 && (role === 'ADMIN' || role === 'MANAGER' || role === 'HR')) {
      actionItems.push({ id: 'act-ot', severity: 'MEDIUM', module: 'HR', message: `${pendingOvertime} đơn tăng ca chờ duyệt`, link: '/overtime' });
    }
    if (criticalQc.length > 0 && (role === 'ADMIN' || role === 'MANAGER' || role === 'QC')) {
      actionItems.push({ id: 'act-qc', severity: 'CRITICAL', module: 'QC', message: `${criticalQc.length} lỗi QC nghiêm trọng`, link: '/qc' });
    }
    if (overdueTasks.length > 0 && (role === 'ADMIN' || role === 'MANAGER' || role === 'WORKER')) {
      const myOverdueTasks = role === 'WORKER' ? overdueTasks.filter(t => t.assignee === session.name) : overdueTasks;
      if (myOverdueTasks.length > 0) {
        actionItems.push({ id: 'act-task', severity: 'HIGH', module: 'TASK', message: `${myOverdueTasks.length} công việc quá hạn`, link: '/tasks' });
      }
    }
    if (lowStockCount > 0 && (role === 'ADMIN' || role === 'MANAGER' || role === 'WAREHOUSE' || role === 'PURCHASING')) {
      actionItems.push({ id: 'act-inv', severity: 'HIGH', module: 'INVENTORY', message: `${lowStockCount} vật tư sắp hết`, link: '/vat-tu' });
    }
    if (pendingPurchaseCount > 0 && (role === 'ADMIN' || role === 'MANAGER' || role === 'PURCHASING')) {
      actionItems.push({ id: 'act-po', severity: 'MEDIUM', module: 'PROCUREMENT', message: `${pendingPurchaseCount} PO chờ duyệt`, link: '/procurement' });
    }
    if (pendingProductionCount > 0 && (role === 'ADMIN' || role === 'MANAGER' || role === 'PRODUCTION')) {
      actionItems.push({ id: 'act-prod', severity: 'MEDIUM', module: 'PRODUCTION', message: `${pendingProductionCount} lệnh sản xuất chờ xử lý`, link: '/production' });
    }

    return {
      metadata: { timestamp: new Date().toISOString(), role, user: session.name },
      permissions: {
        canViewHr: ['ADMIN', 'MANAGER', 'HR'].includes(role),
        canViewProjects: ['ADMIN', 'MANAGER', 'WORKER'].includes(role),
        canViewFinance: ['ADMIN', 'ACCOUNTANT', 'BOD'].includes(role),
        canViewOperations: ['ADMIN', 'MANAGER', 'PRODUCTION', 'WAREHOUSE', 'PURCHASING'].includes(role)
      },
      kpis: {
        hr: { totalEmployees, presentToday, absentToday, lateToday, pendingLeave, pendingOvertime },
        projects: { totalProjects, activeProjects, completedProjects, overdueProjects, totalTasks: allTasks.length, overdueTasks: overdueTasks.length },
        finance: { totalCost: ['WORKER', 'HR'].includes(role) ? null : totalCost, totalRevenue: ['WORKER', 'HR'].includes(role) ? null : totalRevenue },
        operations: { lowStockCount, pendingPurchaseCount, pendingProductionCount },
        quality: { openIssues: openQc.length, criticalIssues: criticalQc.length }
      },
      actions: actionItems,
      activity: activities.map(a => ({
        id: a.id, 
        action: a.action, 
        actorName: a.actorName || 'System', 
        time: (a.createdAt || new Date()).toISOString()
      }))
    };
  }
}
