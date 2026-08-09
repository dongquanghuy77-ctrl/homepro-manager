import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { settings } from '@/db/schema';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const list = await db.select().from(settings);
    const settingsMap: Record<string, string> = {};
    for (const s of list) {
      if (s.value) settingsMap[s.key] = s.value;
    }
    return NextResponse.json(settingsMap);
  } catch (err) {
    console.error('GET /api/settings error:', err);
    return NextResponse.json({ error: 'Không thể tải cài đặt' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json(); // Record<string, string>
    
    for (const [key, value] of Object.entries(body)) {
      await db
        .insert(settings)
        .values({ key, value: String(value) })
        .onConflictDoUpdate({
          target: settings.key,
          set: { value: String(value), updatedAt: new Date() },
        });
    }

    return NextResponse.json({ success: true, message: 'Đã lưu cài đặt thành công!' });
  } catch (err) {
    console.error('POST /api/settings error:', err);
    return NextResponse.json({ error: 'Không thể lưu cài đặt' }, { status: 500 });
  }
}
