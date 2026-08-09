import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function POST() {
  const cookieStore = cookies();
  cookieStore.delete('homepro_user');
  return NextResponse.json({ success: true });
}
