// src/app/api/bom/report/route.ts
// API: So sánh ngân sách mục tiêu vs tổng BOM thực tế theo dự án

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { productionBomLines, projects } from '@/db/schema';
import { eq, sum, count } from 'drizzle-orm';
import { requireAuth, ALL_ROLES } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const { error } = await requireAuth(req, ALL_ROLES);
  if (error) return error;

  const projectId = req.nextUrl.searchParams.get('projectId');

  // Lấy tất cả dự án có BOM
  const allProjects = await db.select({
    id:                  projects.id,
    code:                projects.code,
    name:                projects.name,
    status:              projects.status,
    contractValue:       projects.contractValue,
    targetMaterialCost:  projects.targetMaterialCost,
    targetLaborCost:     projects.targetLaborCost,
  }).from(projects).orderBy(projects.code);

  // Tổng BOM theo dự án
  const bomTotals = await db.select({
    projectId:   productionBomLines.projectId,
    totalBom:    sum(productionBomLines.total),
    lineCount:   count(productionBomLines.id),
  }).from(productionBomLines).groupBy(productionBomLines.projectId);

  // Tổng BOM theo supply_type từng dự án
  const bomByType = await db.select({
    projectId:   productionBomLines.projectId,
    supplyType:  productionBomLines.supplyType,
    total:       sum(productionBomLines.total),
  }).from(productionBomLines).groupBy(productionBomLines.projectId, productionBomLines.supplyType);

  // Gộp kết quả
  const report = allProjects.map(proj => {
    const bom       = bomTotals.find(b => b.projectId === proj.id);
    const hpLines   = bomByType.find(b => b.projectId === proj.id && b.supplyType === 'HOMEPRO_PRODUCTION');
    const cdtLines  = bomByType.find(b => b.projectId === proj.id && b.supplyType === 'INSTALLATION_ONLY');

    const totalBom     = parseFloat((bom?.totalBom ?? '0') as string);
    const hpTotal      = parseFloat((hpLines?.total ?? '0') as string);
    const cdtTotal     = parseFloat((cdtLines?.total ?? '0') as string);
    const target       = proj.targetMaterialCost ?? 0;
    const budgetUsed   = target > 0 ? Math.round((totalBom / target) * 100) : null;
    const overBudget   = target > 0 && totalBom > target;

    return {
      projectId:         proj.id,
      projectCode:       proj.code,
      projectName:       proj.name,
      status:            proj.status,
      contractValue:     proj.contractValue ?? 0,
      targetMaterialCost: target,
      totalBom,
      hpProductionTotal: hpTotal,
      cdtSupplyTotal:    cdtTotal,
      lineCount:         Number(bom?.lineCount ?? 0),
      budgetUsedPct:     budgetUsed,
      overBudget,
      remaining:         target > 0 ? target - totalBom : null,
    };
  });

  // Nếu lọc theo 1 dự án, trả thêm breakdown theo zone
  let zoneBreakdown = null;
  if (projectId) {
    const zones = await db.select({
      zoneId:    productionBomLines.zoneId,
      zoneName:  productionBomLines.zoneName,
      total:     sum(productionBomLines.total),
      lineCount: count(productionBomLines.id),
    }).from(productionBomLines)
      .where(eq(productionBomLines.projectId, parseInt(projectId)))
      .groupBy(productionBomLines.zoneId, productionBomLines.zoneName)
      .orderBy(productionBomLines.zoneId);

    zoneBreakdown = zones.map(z => ({
      zoneId:    z.zoneId,
      zoneName:  z.zoneName,
      total:     parseFloat((z.total ?? '0') as string),
      lineCount: Number(z.lineCount),
    }));
  }

  return NextResponse.json({ report, zoneBreakdown });
}
