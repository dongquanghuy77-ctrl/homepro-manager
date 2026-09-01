import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { workerCode, pinCode } = await req.json();

    if (!workerCode || !pinCode) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // QA Agent Rule: Dead-man switch / expiration handled by JWT payload logic
    // Mocking auth since DB is not migrated
    if (pinCode === '1234') { // Fake valid PIN
      return NextResponse.json({ 
        success: true, 
        message: 'Đăng nhập thành công',
        user: { workerCode, stationRole: 'CNC', avatarUrl: '' }
      });
    }

    return NextResponse.json({ error: 'Mã PIN không đúng' }, { status: 401 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
