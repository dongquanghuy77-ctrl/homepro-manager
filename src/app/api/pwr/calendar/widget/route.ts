import { NextResponse } from 'next/server';
import { db } from '@/db';
import { pwrTasks } from '@/db/schema';
import { eq, and, isNull, gte, lte } from 'drizzle-orm';
import { getTodayVN, TERMINAL_STATUSES } from '@/lib/pwr/constants';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  // Default to a hardcoded user ID if none provided, since this is for Huy's personal desktop
  // In a real multi-user app, we'd use a secure token.
  const userId = searchParams.get('userId') || '1'; 
  const today = getTodayVN();

  try {
    const allTasks = await db.select().from(pwrTasks)
      .where(isNull(pwrTasks.deletedAt));

    // Filter tasks for today: either dueDate is today, or it's active
    const todayTasks = allTasks.filter(t => {
      if (TERMINAL_STATUSES.includes(t.status as any)) {
        // If done/cancelled today, show it
        if (t.completedAt && new Date(t.completedAt).toISOString().split('T')[0] === today) return true;
        return false;
      }
      // If active and due today or overdue or no date but in progress
      if (t.dueDate && t.dueDate <= today) return true;
      if (t.status === 'IN_PROGRESS' || t.status === 'TODO') return true;
      return false;
    });

    // Sort by start time if available, then by priority
    todayTasks.sort((a, b) => {
      const timeA = (a as any).startTime || '99:99';
      const timeB = (b as any).startTime || '99:99';
      return timeA.localeCompare(timeB);
    });

    // Format output exactly for Rainmeter Regex parsing
    let output = '';
    for (let i = 0; i < 5; i++) {
      const task = todayTasks[i];
      let timeStr = '';
      let titleStr = '';
      
      if (task) {
        titleStr = task.title.replace(/"/g, "'").substring(0, 45); // Clean for rainmeter
        
        const sTime = (task as any).startTime || (String(8 + (task.id % 9)).padStart(2, '0') + ':00');
        const eTime = (task as any).endTime   || (String(9 + (task.id % 9)).padStart(2, '0') + ':00');
        
        if (task.dueDate && task.dueDate < today && !(task as any).startTime) {
           timeStr = 'QUÁ HẠN';
        } else {
           timeStr = `${sTime} - ${eTime}`;
        }
      }

      output += `"t${i+1}_time":"${timeStr}","t${i+1}_title":"${titleStr}"`;
      if (i < 4) output += `,`;
    }

    return new NextResponse(`{${output}}`, {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  } catch (e) {
    return new NextResponse('{"error":"Server Error"}', { status: 500 });
  }
}
