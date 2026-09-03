import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/nextauth-options';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { put } from '@vercel/blob';

export const runtime = 'nodejs';
export const maxDuration = 30;

// Tối đa 300KB sau khi client đã nén
const MAX_SIZE_BYTES = 300 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif'];

export async function POST(req: NextRequest) {
  try {
    // 1. Xác thực NextAuth session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const userId = parseInt(session.user.id as string);
    if (isNaN(userId)) {
      return NextResponse.json({ error: 'Session không hợp lệ' }, { status: 401 });
    }

    // 2. Đọc file từ multipart
    const formData = await req.formData();
    const file = formData.get('avatar') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Không có file' }, { status: 400 });
    }

    // 3. Validate MIME type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Chỉ chấp nhận ảnh JPG, PNG, WEBP, GIF. Nhận được: ${file.type}` },
        { status: 400 }
      );
    }

    // 4. Validate kích thước
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: `Ảnh quá lớn (${Math.round(file.size / 1024)}KB). Tối đa 300KB.` },
        { status: 400 }
      );
    }

    // 5. Tính SHA-256 server-side để làm tên file (deduplication)
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashHex = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // 6. Upload lên Vercel Blob
    // Normalize ext: heic/heif → jpg (Blob public URL, HEIC kém hỗ trợ trên browser)
    const rawExt = file.type.split('/')[1];
    const ext = rawExt === 'jpeg' || rawExt === 'heic' || rawExt === 'heif' ? 'jpg' : rawExt;
    const blobPath = `avatars/user-${userId}/${hashHex.substring(0, 16)}.${ext}`;


    const { url } = await put(blobPath, arrayBuffer, {
      access: 'public',
      contentType: file.type,
      addRandomSuffix: false,
    });

    // 7. Cập nhật DB
    await db
      .update(users)
      .set({ avatarUrl: url, updatedAt: new Date() })
      .where(eq(users.id, userId));

    return NextResponse.json({
      success: true,
      avatarUrl: url,
      hash: hashHex.substring(0, 16),
    });

  } catch (error: any) {
    console.error('[Avatar Upload Error]', error);
    // Nếu Vercel Blob chưa được cấu hình → fallback thông báo rõ ràng
    if (error?.message?.includes('BLOB_READ_WRITE_TOKEN')) {
      return NextResponse.json(
        { error: 'Storage chưa được cấu hình. Liên hệ Admin.' },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: 'Lỗi server. Vui lòng thử lại.' },
      { status: 500 }
    );
  }
}

// GET: Lấy avatarUrl hiện tại của user đang login
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const userId = parseInt(session.user.id as string);
    const result = await db
      .select({ avatarUrl: users.avatarUrl, name: users.name })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!result[0]) {
      return NextResponse.json({ error: 'User không tồn tại' }, { status: 404 });
    }

    return NextResponse.json({
      avatarUrl: result[0].avatarUrl,
      name: result[0].name,
    });

  } catch (error) {
    console.error('[Avatar GET Error]', error);
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}
