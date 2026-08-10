// src/app/api/server-time/route.ts
// B\u01af\u1edaC 5: API l\u1ea5y gi\u1edd m\u00e1y ch\u1ee7 \u2014 ng\u0103n nh\u00e2n vi\u00ean t\u1ef1 ch\u1ec9nh gi\u1edd thi\u1ebft b\u1ecb \u0111\u1ec3 gian l\u1eadn gi\u1edd c\u00f4ng

import { NextResponse } from 'next/server';
import { requireAuth, ALL_ROLES } from '@/lib/auth';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic'; // Kh\u00f4ng cache, lu\u00f4n l\u1ea5y th\u1eddi gian th\u1ef1c

export async function GET(req: NextRequest) {
  // Ch\u1ec9 cho ph\u00e9p user \u0111\u00e3 \u0111\u0103ng nh\u1eadp
  const { error } = await requireAuth(req, ALL_ROLES);
  if (error) return error;

  // L\u1ea5y th\u1eddi gian theo m\u00fai gi\u1edd Vi\u1ec7t Nam t\u1eeb m\u00e1y ch\u1ee7
  const now = new Date();
  const vnTime = now.toLocaleString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }); // YYYY-MM-DD HH:mm:ss
  const hhmm = vnTime.split(' ')[1]?.substring(0, 5) ?? '00:00'; // HH:mm

  return NextResponse.json({
    time:      hhmm,                                          // "HH:mm" \u2014 d\u00f9ng cho TimePicker
    datetime:  vnTime,                                        // full datetime
    timestamp: now.getTime(),                                 // ms Unix
    tz:        'Asia/Ho_Chi_Minh',
  });
}
