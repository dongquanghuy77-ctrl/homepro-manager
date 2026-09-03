import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Star, Loader2 } from 'lucide-react';

interface LeaderboardEntry {
  rank: number;
  name: string;
  points: number;
  level?: number;
  isMe: boolean;
}

export function LeaderboardTabUI() {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/pwr/mobile/gamification')
      .then(r => r.json())
      .then(data => {
        setLeaderboardData(data.data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div style={{ padding: '20px 20px 100px 20px' }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ width: 64, height: 64, margin: '0 auto 16px', borderRadius: 20, background: 'rgba(251, 191, 36, 0.1)', border: '1px solid rgba(251, 191, 36, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Trophy size={32} color="#fbbf24" />
        </div>
        <h2 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 8px 0' }}>Bảng Vàng Tuần</h2>
        <p style={{ color: '#9ca3af', fontSize: 14, margin: 0 }}>Cạnh tranh lành mạnh, cùng nhau phát triển</p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
          <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
          <p>Đang tải bảng xếp hạng...</p>
        </div>
      ) : leaderboardData.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 32, color: '#9ca3af', background: 'rgba(255,255,255,0.05)', borderRadius: 16 }}>
          <Trophy size={40} color="#fbbf24" style={{ margin: '0 auto 12px' }} />
          <p>Chưa có dữ liệu xếp hạng. Hãy hoàn thành task đầu tiên!</p>
        </div>
      ) : (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {leaderboardData.map((user) => {
          const isTop3 = user.rank <= 3;
          let rankIcon = null;
          if (user.rank === 1) rankIcon = <Medal size={24} color="#fbbf24" />;
          else if (user.rank === 2) rankIcon = <Medal size={24} color="#94a3b8" />;
          else if (user.rank === 3) rankIcon = <Medal size={24} color="#b45309" />;
          else rankIcon = <span style={{ fontSize: 16, fontWeight: 700, color: '#6b7280', width: 24, textAlign: 'center' }}>{user.rank}</span>;

          return (
            <div key={user.rank} className="glass-card" style={{ 
              padding: '16px 20px', 
              display: 'flex', alignItems: 'center', gap: 16,
              background: user.isMe ? 'rgba(59, 130, 246, 0.15)' : undefined,
              borderColor: user.isMe ? 'rgba(59, 130, 246, 0.3)' : undefined
            }}>
              {rankIcon}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: isTop3 || user.isMe ? '#fff' : '#9ca3af' }}>{user.name}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Star size={16} color="#fbbf24" fill="#fbbf24" />
                <span style={{ fontSize: 16, fontWeight: 700 }}>{user.points}</span>
              </div>
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
}
