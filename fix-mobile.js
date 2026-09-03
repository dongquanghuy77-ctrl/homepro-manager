const fs = require('fs');
let c = fs.readFileSync('src/components/pwr/station/MobileStationClient.tsx', 'utf8');

c = c.substring(0, c.indexOf(`        <div style={{ flex: 1, overflowY: 'auto' }}>`)) + 
`        <div style={{ flex: 1, overflowY: 'auto' }}>
          {activeTab === 'TASKS' ? (
            <div style={{ padding: 20 }}>
              <StationWorkflowUI team={userStationRole} userName={userName || 'Thợ'} />
            </div>
          ) : activeTab === 'HOME' ? (
            <HomeTabUI userName={userName || 'Thợ'} />
          ) : activeTab === 'LEADERBOARD' ? (
            <LeaderboardTabUI />
          ) : activeTab === 'REPORTS' ? (
            <ReportsTabUI />
          ) : activeTab === 'PROFILE' ? (
            <ProfileTabUI />
          ) : null}
        </div>

      {/* Floating Bottom Nav */}
      <div style={{ 
        position: 'fixed', bottom: 0, left: 0, right: 0, 
        background: 'rgba(15,15,20,0.85)', backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        display: 'flex', justifyContent: 'space-around', padding: '16px 8px 24px 8px', zIndex: 100
      }}>
        <button onClick={() => setActiveTab('HOME')} style={{ background: 'transparent', border: 'none', color: activeTab === 'HOME' ? '#34d399' : '#6b7280', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <Home size={22} />
        </button>
        <button onClick={() => setActiveTab('TASKS')} style={{ background: 'transparent', border: 'none', color: activeTab === 'TASKS' ? '#34d399' : '#6b7280', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <ClipboardList size={22} />
        </button>
        <button onClick={() => setActiveTab('LEADERBOARD')} style={{ background: 'transparent', border: 'none', color: activeTab === 'LEADERBOARD' ? '#34d399' : '#6b7280', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <Trophy size={22} />
        </button>
        <button onClick={() => setActiveTab('REPORTS')} style={{ background: 'transparent', border: 'none', color: activeTab === 'REPORTS' ? '#34d399' : '#6b7280', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <BarChart2 size={22} />
        </button>
        <button onClick={() => setActiveTab('PROFILE')} style={{ background: 'transparent', border: 'none', color: activeTab === 'PROFILE' ? '#34d399' : '#6b7280', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <User size={22} />
        </button>
      </div>
    </div>
  );
}`;

fs.writeFileSync('src/components/pwr/station/MobileStationClient.tsx', c, 'utf8');
