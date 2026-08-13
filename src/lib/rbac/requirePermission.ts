import { getSession } from '@/lib/session';

export async function requirePermission(permission: string) {
  const session = await getSession();
  if (!session) {
    return { allowed: false };
  }
  
  if (session.role === 'ADMIN' || session.role === 'SYSTEM_ADMIN') {
    return { allowed: true };
  }
  
  // For simplicity, allow ACCOUNTANT role for accounting modules
  if (session.role === 'ACCOUNTANT') {
    return { allowed: true };
  }

  return { allowed: false };
}
