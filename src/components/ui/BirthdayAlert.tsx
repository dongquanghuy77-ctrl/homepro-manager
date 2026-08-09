'use client';

import { useState, useEffect } from 'react';
import { Cake, Calendar, Gift, Sparkles, ChevronRight } from 'lucide-react';

interface StaffUser {
  id: number;
  name: string;
  position?: string;
  birthDate?: string; // DD/MM/YYYY
  role: string;
}

export default function BirthdayAlert() {
  const [todayBirthdays, setTodayBirthdays] = useState<StaffUser[]>([]);
  const [monthBirthdays, setMonthBirthdays] = useState<{ user: StaffUser; day: number; month: number; age?: number }[]>([]);
  const [currentMonth, setCurrentMonth] = useState<number>(new Date().getMonth() + 1);

  useEffect(() => {
    async function checkBirthdays() {
      try {
        const res = await fetch('/api/users');
        if (!res.ok) return;
        const users: StaffUser[] = await res.json();

        const today = new Date();
        const currDay = today.getDate();
        const currMonth = today.getMonth() + 1; // 1-12
        const currYear = today.getFullYear();

        setCurrentMonth(currMonth);

        const todayList: StaffUser[] = [];
        const monthList: { user: StaffUser; day: number; month: number; age?: number }[] = [];

        for (const u of users) {
          if (!u.birthDate) continue;
          
          // Parse DD/MM/YYYY
          const parts = u.birthDate.split('/');
          if (parts.length < 2) continue;

          const day = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10);
          const year = parts[2] ? parseInt(parts[2], 10) : undefined;
          const age = year ? (currYear - year) : undefined;

          if (day === currDay && month === currMonth) {
            todayList.push(u);
          }

          if (month === currMonth) {
            monthList.push({ user: u, day, month, age });
          }
        }

        // Sort month birthdays chronologically by day of month
        monthList.sort((a, b) => a.day - b.day);

        setTodayBirthdays(todayList);
        setMonthBirthdays(monthList);
      } catch (err) {
        console.error('Check birthdays error:', err);
      }
    }

    checkBirthdays();
  }, []);

  if (monthBirthdays.length === 0) return null;

  return (
    <div style={{ marginBottom: 24 }}>
      {/* 1. Today Birthday Festive Banner */}
      {todayBirthdays.length > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, #8B5CF6 0%, #D946EF 50%, #F43F5E 100%)',
          borderRadius: 16,
          padding: '20px 24px',
          color: '#FFF',
          boxShadow: '0 10px 30px rgba(217, 70, 239, 0.35)',
          marginBottom: 16,
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute',
            right: -10,
            bottom: -10,
            opacity: 0.15,
            fontSize: 100,
            pointerEvents: 'none',
          }}>
            🎂
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: 'rgba(255, 255, 255, 0.25)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Cake size={28} color="#FFF" />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, opacity: 0.9 }}>
                <Sparkles size={14} /> CHÚC MỪNG SINH NHẬT HÔM NAY! 🎉
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, marginTop: 2 }}>
                {todayBirthdays.map((u) => u.name).join(', ')}
              </div>
              <div style={{ fontSize: 13, opacity: 0.95, marginTop: 2 }}>
                {todayBirthdays.map((u) => `${u.position || 'Nhân sự xưởng'} (${u.birthDate})`).join(' • ')} — Chúc bạn tuổi mới may mắn, thành công và dồi dào sức khỏe! 🥳🎈
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Month Birthday Summary Card */}
      <div className="card" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        <div className="card-header" style={{ paddingBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              padding: 6,
              borderRadius: 8,
              background: 'rgba(245, 158, 11, 0.15)',
              color: '#F59E0B',
              display: 'flex',
            }}>
              <Gift size={18} />
            </div>
            <div>
              <div className="card-title" style={{ fontSize: 15 }}>
                Sinh nhật nhân sự trong tháng {currentMonth} ({monthBirthdays.length})
              </div>
              <div className="card-subtitle" style={{ fontSize: 12 }}>
                Nhắc nhở chúc mừng sinh nhật cán bộ công nhân viên xưởng
              </div>
            </div>
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: 12,
          marginTop: 8,
        }}>
          {monthBirthdays.map(({ user, day, age }) => {
            const today = new Date().getDate();
            const isToday = day === today;
            return (
              <div
                key={user.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 14px',
                  borderRadius: 10,
                  background: isToday ? 'rgba(236, 72, 153, 0.12)' : 'var(--color-surface-2)',
                  border: isToday ? '1px solid #EC4899' : '1px solid var(--color-border-light)',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: isToday ? 'linear-gradient(135deg, #EC4899 0%, #D946EF 100%)' : 'rgba(59, 130, 246, 0.15)',
                  color: isToday ? '#FFF' : '#3B82F6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: 14,
                  flexShrink: 0,
                }}>
                  {day}
                </div>

                <div style={{ overflow: 'hidden' }}>
                  <div style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: isToday ? '#EC4899' : 'var(--color-text)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {user.name} {isToday && '🎉'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
                    {user.position || 'Nhân viên'} {age ? `(${age} tuổi)` : ''}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
