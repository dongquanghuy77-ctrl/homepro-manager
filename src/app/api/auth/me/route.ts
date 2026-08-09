import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET() {
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get('homepro_user');

  if (!sessionCookie || !sessionCookie.value) {
    return NextResponse.json({ user: null });
  }

  try {
    const userPayload = JSON.parse(sessionCookie.value);
    return NextResponse.json({ user: userPayload });
  } catch {
    return NextResponse.json({ user: null });
  }
}
