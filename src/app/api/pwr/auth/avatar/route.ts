import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { db } from '@/db';
import { users, pwrUserStats } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';
export const maxDuration = 30;

const MAX_SIZE_B64 = 500 * 1024;

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET || 'fallback_secret_for_homepro_12345!@#',
    });
    if (!token?.id) {
      return NextResponse.json({ error: 'Chua dang nhap (token null)' }, { status: 401 });
    }
    const userId = parseInt(token.id as string);
    if (isNaN(userId)) {
      return NextResponse.json({ error: 'Session khong hop le' }, { status: 401 });
    }
    const body = await req.json();
    const { dataUrl } = body as { dataUrl?: string };
    if (!dataUrl || !dataUrl.startsWith('data:image/')) {
      return NextResponse.json({ error: 'Khong phai dinh dang anh' }, { status: 400 });
    }
    if (dataUrl.length > MAX_SIZE_B64) {
      return NextResponse.json({ error: 'Anh qua lon' }, { status: 400 });
    }
    await db.update(users).set({ avatarUrl: dataUrl, updatedAt: new Date() }).where(eq(users.id, userId));
    return NextResponse.json({ success: true, avatarUrl: dataUrl });
  } catch (error: any) {
    console.error('[Avatar POST]', error?.message);
    return NextResponse.json({ error: 'Loi server: ' + (error?.message || 'unknown') }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET || 'fallback_secret_for_homepro_12345!@#',
    });
    if (!token?.id) return NextResponse.json({ avatarUrl: null });
    const userId = parseInt(token.id as string);
    
    // Fetch user and stats
    const [userRow] = await db.select({ avatarUrl: users.avatarUrl, name: users.name }).from(users).where(eq(users.id, userId)).limit(1);
    const [statsRow] = await db.select().from(pwrUserStats).where(eq(pwrUserStats.userId, userId)).limit(1);
    
    return NextResponse.json({ 
      avatarUrl: userRow?.avatarUrl || null, 
      name: userRow?.name || null,
      totalPoints: statsRow?.totalPoints || 0,
      currentLevel: statsRow?.currentLevel || 1
    });
  } catch (error: any) {
    console.error('[Avatar GET]', error?.message);
    return NextResponse.json({ avatarUrl: null });
  }
}
