import React from 'react';
import { Trophy, Medal, Star } from 'lucide-react';

export function LeaderboardTabUI() {
  const leaderboardData = [
    { rank: 1, name: 'Trần Văn A', points: 1540, isMe: false },
    { rank: 2, name: 'Nguyễn Thị B', points: 1420, isMe: false },
    { rank: 3, name: 'Lê Hoàng C', points: 1380, isMe: false },
    { rank: 4, name: 'Đồng nghiệp Tổ 2', points: 1250, isMe: false }, // QA Safeguard: Anonymization
    { rank: 5, name: 'Đồng nghiệp Tổ 1', points: 1100, isMe: false },
    { rank: 12, name: 'Anh Huy (Bạn)', points: 120, isMe: true }, // Me
  ];

  return (
    <div style={{ padding: '20px 20px 100px 20px' }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ width: 64, height: 64, margin: '0 auto 16px', borderRadius: 20, background: 'rgba(251, 191, 36, 0.1)', border: '1px solid rgba(251, 191, 36, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Trophy size={32} color="#fbbf24" />
        </div>
        <h2 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 8px 0' }}>Bảng Vàng Tuần</h2>
        <p style={{ color: '#9ca3af', fontSize: 14, margin: 0 }}>Cạnh tranh lành mạnh, cùng nhau phát triển</p>
      </div>

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
    </div>
  );
}
