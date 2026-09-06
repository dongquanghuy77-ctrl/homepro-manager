import { getSession } from '@/lib/session';
import { db } from '@/db';
import { pwrMaterials } from '@/db/schema';
import { redirect } from 'next/navigation';
import PwrStocktakeClient from '@/components/pwr/inventory/PwrStocktakeClient';

export const dynamic = 'force-dynamic';

export default async function PwrStocktakePage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const materials = await db.select().from(pwrMaterials).orderBy(pwrMaterials.name);

  return <PwrStocktakeClient materials={materials} />;
}
