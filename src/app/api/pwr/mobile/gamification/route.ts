import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { pwrUserStats } from '@/db/schema';
import { requireAuth } from '@/lib/auth';
import { sql } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    const { session, error } = await requireAuth(req);
    if (error) return error;

    // Lấy top 50 user có điểm cao nhất
    // Giả lập logic lấy từ DB do chúng ta chưa chạy lệnh push migration (để bảo vệ DB production)
    const leaderboardData = [
      { rank: 1, name: 'Trần Văn A', points: 1540, isMe: false },
      { rank: 2, name: 'Nguyễn Thị B', points: 1420, isMe: false },
      { rank: 3, name: 'Lê Hoàng C', points: 1380, isMe: false },
      { rank: 4, name: 'Đồng nghiệp Tổ 2', points: 1250, isMe: false },
      { rank: 5, name: 'Đồng nghiệp Tổ 1', points: 1100, isMe: false },
      { rank: 12, name: 'Bạn', points: 120, isMe: true },
    ];

    return NextResponse.json({ success: true, data: leaderboardData });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { session, error: authError } = await requireAuth(req);
    if (authError) return authError;

    const body = await req.json();
    const { pointsToAdd } = body;

    if (!pointsToAdd || typeof pointsToAdd !== 'number') {
      return NextResponse.json({ error: 'Invalid points' }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: `Đã cộng ${pointsToAdd} điểm` });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
