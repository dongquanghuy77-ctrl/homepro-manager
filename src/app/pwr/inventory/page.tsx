import { getSession } from '@/lib/session';
import { db } from '@/db';
import { pwrMaterials, pwrMaterialTransactions, users } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';
import PwrInventoryClient from '@/components/pwr/inventory/PwrInventoryClient';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function PwrInventoryPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const materials = await db.select().from(pwrMaterials).orderBy(pwrMaterials.id);

  const transactions = await db.select({
    id: pwrMaterialTransactions.id,
    materialId: pwrMaterialTransactions.materialId,
    taskId: pwrMaterialTransactions.taskId,
    transactionType: pwrMaterialTransactions.transactionType,
    quantity: pwrMaterialTransactions.quantity,
    balanceAfter: pwrMaterialTransactions.balanceAfter,
    notes: pwrMaterialTransactions.notes,
    createdAt: pwrMaterialTransactions.createdAt,
    userFullName: users.fullName,
  })
    .from(pwrMaterialTransactions)
    .leftJoin(users, eq(pwrMaterialTransactions.userId, users.id))
    .orderBy(desc(pwrMaterialTransactions.createdAt))
    .limit(100);

  return (
    <PwrInventoryClient 
      materials={materials} 
      transactions={transactions} 
    />
  );
}
