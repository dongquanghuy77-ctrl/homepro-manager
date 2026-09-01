import { NextResponse } from 'next/server';

// Note: For MVP in serverless, we use a global variable.
// In production, this MUST be Redis (Upstash) because Vercel lambdas are stateless
// and multiple requests might hit different warm instances. 
// However, for a quick local/Vercel MVP demonstration, this often works well enough 
// if the container stays warm.
const mockStorage = new Map<string, any>();

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, phone, token } = body;

    if (action === 'REQUEST') {
      // Generate a short 6-char token for the QR code
      const newToken = Math.random().toString(36).substring(2, 8).toUpperCase();
      mockStorage.set(newToken, { phone, status: 'PENDING', createdAt: Date.now() });
      return NextResponse.json({ token: newToken });
    }

    if (action === 'APPROVE') {
      const data = mockStorage.get(token);
      if (!data) {
        return NextResponse.json({ error: 'Mã yêu cầu không tồn tại hoặc đã hết hạn' }, { status: 400 });
      }
      
      // Generate a 4-digit temporary PIN
      const tempPin = Math.floor(1000 + Math.random() * 9000).toString();
      mockStorage.set(token, { ...data, status: 'APPROVED', tempPin });
      
      return NextResponse.json({ success: true, tempPin, phone: data.phone });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');
    
    if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 });
    
    const data = mockStorage.get(token);
    if (!data) return NextResponse.json({ status: 'EXPIRED' });
    
    // Auto expire after 5 mins in memory
    if (Date.now() - data.createdAt > 5 * 60 * 1000) {
      mockStorage.delete(token);
      return NextResponse.json({ status: 'EXPIRED' });
    }

    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
