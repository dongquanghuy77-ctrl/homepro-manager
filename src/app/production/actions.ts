'use server';

import { ProductionService } from '@/lib/production/services';
import { QcService } from '@/lib/quality/qc_service';
import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/session';

async function getUser() {
    const session = await getSession();
    if (!session) throw new Error('Unauthorized');
    return session;
}

export async function createProductionPlanAction(data: any) {
    const user = await getUser();
    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') throw new Error('Forbidden');
    await ProductionService.createProductionPlan({ ...data, userId: user.id });
    revalidatePath('/production/plans');
}

export async function generateOrdersAction(planId: number) {
    const user = await getUser();
    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') throw new Error('Forbidden');
    await ProductionService.generateProductionOrdersFromPlan(planId, user.id);
    revalidatePath('/production/orders');
    revalidatePath('/production/plans');
}

export async function releaseOrderAction(poId: number) {
    const user = await getUser();
    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') throw new Error('Forbidden');
    await ProductionService.releaseProductionOrder(poId);
    revalidatePath('/production/orders');
}

export async function consumeMaterialAction(data: any) {
    const user = await getUser();
    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') throw new Error('Forbidden');
    await ProductionService.consumeMaterial({ ...data, userId: user.id });
    revalidatePath('/production/issues');
}

export async function recordJobCardAction(data: any) {
    const user = await getUser();
    await ProductionService.recordJobCard({ ...data, userId: user.id });
    revalidatePath('/production/job-cards');
}

export async function logScrapAction(data: any) {
    const user = await getUser();
    await ProductionService.logScrap({ ...data, userId: user.id });
    revalidatePath('/production/scrap');
}

export async function produceOutputAction(data: any) {
    const user = await getUser();
    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') throw new Error('Forbidden');
    await ProductionService.produceOutput({ ...data, userId: user.id });
    revalidatePath('/production/receipts');
    revalidatePath('/production/orders');
}

export async function createQcIssueAction(data: any) {
    const user = await getUser();
    await QcService.createInspection({ ...data, inspectorId: user.id });
    revalidatePath('/qc');
}
