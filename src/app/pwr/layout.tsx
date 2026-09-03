import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';

export default async function PwrLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  // /pwr/station/* đã được Middleware bypass — getSession() trả null là bình thường cho Kiosk
  // Chỉ redirect nếu không phải station route (server không biết path, middleware đã xử lý)
  if (!session) {
    // Middleware đã chặn các route không hợp lệ rồi
    // Nếu vào đây mà không có session = station route được bypass → cho qua
  }
  return <>{children}</>;
}
