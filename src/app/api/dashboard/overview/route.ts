import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, attendance, leaveRequests, overtimeRequests, projects, tasks, qcIssues, costs, hrAuditLogs } from '@/db/schema';
import { getSession } from '@/lib/session';
import { eq, and, sql, lte, gte, desc, inArray } from 'drizzle-orm';
import { getTodayVN } from '@/lib/hr';
import { getAccessibleDepartmentIds } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { role, id: userId, department } = session as any;
    const today = getTodayVN();

    // 1. Enforce Data Scope based on RBAC
    let userConds: any[] = [];
    let projectConds: any[] = [];
    
    if (role === 'WORKER') {
      userConds.push(eq(users.id, userId));
      projectConds.push(eq(projects.id, 0)); // No project overview for worker, or only assigned ones. For now, empty array
    } else if (role === 'MANAGER') {
      // Get departments manager can see
      const accessibleDeptIds = await getAccessibleDepartmentIds(userId);
      if (accessibleDeptIds.length > 0) {
        userConds.push(inArray(users.departmentId, accessibleDeptIds));
      } else if (department) {
        userConds.push(eq(users.department, department));
      } else {
        userConds.push(eq(users.id, userId)); // fallback
      }
      // Manager only sees projects they manage (if any logic exists, for now all active)
      // We will let Manager see all projects for simplicity unless specified
    } else if (role === 'HR') {
      // HR sees all employees, no project/cost
      projectConds.push(eq(projects.id, 0)); 
    } else if (role === 'ACCOUNTANT') {
      // Sees all cost, maybe all employees for payroll
    } else if (role === 'ADMIN' || role === 'BOD') {
      // Sees everything
    }

    // ---------------------------------------------------------
    // 2. FETCH DATA IN PARALLEL
    // ---------------------------------------------------------
    
    // HR Data
    const totalEmpPromise = db.select({ count: sql<number>`count(*)` }).from(users).where(userConds.length ? and(...userConds) : undefined);
    
    const presentPromise = db.select({ count: sql<number>`count(*)` })
      .from(attendance).leftJoin(users, eq(attendance.employeeId, users.id))
      .where(and(eq(attendance.workDate, today), inArray(attendance.status, ['PRESENT', 'LATE', 'HALF_DAY']), ...(userConds.length ? userConds : [])));
      
    const absentPromise = db.select({ count: sql<number>`count(*)` })
      .from(attendance).leftJoin(users, eq(attendance.employeeId, users.id))
      .where(and(eq(attendance.workDate, today), eq(attendance.status, 'ABSENT'), ...(userConds.length ? userConds : [])));

    const latePromise = db.select({ count: sql<number>`count(*)` })
      .from(attendance).leftJoin(users, eq(attendance.employeeId, users.id))
      .where(and(eq(attendance.workDate, today), eq(attendance.status, 'LATE'), ...(userConds.length ? userConds : [])));

    const pendingLeavePromise = db.select({ count: sql<number>`count(*)` })
      .from(leaveRequests).leftJoin(users, eq(leaveRequests.employeeId, users.id))
      .where(and(inArray(leaveRequests.status, ['PENDING', 'PENDING_HR']), ...(userConds.length ? userConds : [])));

    const pendingOvertimePromise = db.select({ count: sql<number>`count(*)` })
      .from(overtimeRequests).leftJoin(users, eq(overtimeRequests.employeeId, users.id))
      .where(and(eq(overtimeRequests.status, 'PENDING'), ...(userConds.length ? userConds : [])));

    // Project Data
    const projectsPromise = db.select().from(projects).where(projectConds.length ? and(...projectConds) : undefined);
    const tasksPromise = db.select().from(tasks);
    
    // Quality Data
    const qcPromise = db.select().from(qcIssues);

    // Finance Data (Cost)
    const costsPromise = db.select({ amount: costs.amount }).from(costs);

    // Activity
    const activitiesPromise = db.select().from(hrAuditLogs).orderBy(desc(hrAuditLogs.createdAt)).limit(10);

    // Run parallel
    const [
      [totalEmpRes], [presentRes], [absentRes], [lateRes], [pendingLeaveRes], [pendingOvertimeRes],
      allProjects, allTasks, allQc, allCosts, activities
    ] = await Promise.all([
      totalEmpPromise, presentPromise, absentPromise, latePromise, pendingLeavePromise, pendingOvertimePromise,
      projectsPromise, tasksPromise, qcPromise, costsPromise, activitiesPromise
    ]);

    // ---------------------------------------------------------
    // 3. AGGREGATE & FORMAT
    // ---------------------------------------------------------
    
    // HR KPIs
    const totalEmployees = Number(totalEmpRes?.count || 0);
    const presentToday = Number(presentRes?.count || 0);
    const absentToday = Number(absentRes?.count || 0);
    const lateToday = Number(lateRes?.count || 0);
    const pendingLeave = Number(pendingLeaveRes?.count || 0);
    const pendingOvertime = Number(pendingOvertimeRes?.count || 0);

    // Project KPIs
    const activeProjects = allProjects.filter(p => p.status === 'ACTIVE').length;
    let overdueProjects = 0;
    allProjects.forEach(p => {
      if (p.status !== 'COMPLETED' && p.deadline && new Date(p.deadline) < new Date()) {
        overdueProjects++;
      }
    });
    
    const overdueTasks = allTasks.filter(t => t.status !== 'COMPLETED' && t.endDate && new Date(t.endDate) < new Date());

    // Quality KPIs
    const openQc = allQc.filter(q => q.status === 'OPEN' || q.status === 'IN_PROGRESS');
    const criticalQc = openQc.filter(q => q.severity === 'CRITICAL');

    // Finance KPIs
    const totalCost = allCosts.reduce((acc, curr) => acc + (curr.amount || 0), 0);

    // ACTION ITEMS GENERATION
    const actionItems = [];
    if (overdueProjects > 0 && (role === 'ADMIN' || role === 'MANAGER')) {
      actionItems.push({ id: 'act-proj', severity: 'HIGH', module: 'PROJECT', message: `${overdueProjects} dự án trễ hạn`, link: '/projects' });
    }
    if (pendingLeave > 0 && (role === 'ADMIN' || role === 'MANAGER' || role === 'HR')) {
      actionItems.push({ id: 'act-leave', severity: 'MEDIUM', module: 'HR', message: `${pendingLeave} đơn nghỉ chờ duyệt`, link: '/leave' });
    }
    if (pendingOvertime > 0 && (role === 'ADMIN' || role === 'MANAGER' || role === 'HR')) {
      actionItems.push({ id: 'act-ot', severity: 'MEDIUM', module: 'HR', message: `${pendingOvertime} đơn tăng ca chờ duyệt`, link: '/overtime' });
    }
    if (criticalQc.length > 0 && (role === 'ADMIN' || role === 'MANAGER')) {
      actionItems.push({ id: 'act-qc', severity: 'CRITICAL', module: 'QC', message: `${criticalQc.length} lỗi QC nghiêm trọng`, link: '/qc' });
    }
    if (overdueTasks.length > 0 && (role === 'ADMIN' || role === 'MANAGER' || role === 'WORKER')) {
      const myOverdueTasks = role === 'WORKER' ? overdueTasks.filter(t => t.assignee === session.name) : overdueTasks;
      if (myOverdueTasks.length > 0) {
        actionItems.push({ id: 'act-task', severity: 'HIGH', module: 'TASK', message: `${myOverdueTasks.length} công việc quá hạn`, link: '/tasks' });
      }
    }

    // Response structure following architecture principles
    return NextResponse.json({
      metadata: {
        timestamp: new Date().toISOString(),
        role: role,
        user: session.name
      },
      permissions: {
        canViewHr: ['ADMIN', 'MANAGER', 'HR'].includes(role),
        canViewProjects: ['ADMIN', 'MANAGER', 'WORKER'].includes(role), // worker views their tasks
        canViewFinance: ['ADMIN', 'ACCOUNTANT', 'BOD'].includes(role)
      },
      kpis: {
        hr: { totalEmployees, presentToday, absentToday, lateToday, pendingLeave, pendingOvertime },
        projects: { activeProjects, overdueProjects, totalTasks: allTasks.length, overdueTasks: overdueTasks.length },
        quality: { openIssues: openQc.length, criticalIssues: criticalQc.length },
        finance: { totalCost: role === 'WORKER' ? null : totalCost } // Hide finance from worker
      },
      actions: actionItems,
      activity: activities.map(a => ({
        id: a.id,
        action: a.action,
        actorName: a.actorName,
        time: a.createdAt
      }))
    });

  } catch (error: any) {
    console.error('Dashboard Overview Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
