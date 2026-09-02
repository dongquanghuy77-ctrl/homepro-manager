const fs = require('fs');
let content = fs.readFileSync('src/components/pwr/station/StationAuthUI.tsx', 'utf8');
const startString = '{/* WELCOME SCREEN */}';
const endString = '{/* FORGOT PASSWORD SCREEN */}';
const startIndex = content.indexOf(startString);
const endIndex = content.indexOf(endString);
if (startIndex === -1 || endIndex === -1) {
  console.error('Not found');
  process.exit(1);
}
const replacement = `          {/* WELCOME / TEAM SELECTION SCREEN */}
          {authState === 'WELCOME' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ fontSize: 13, color: colors.welcome, fontWeight: 700, letterSpacing: 2, marginBottom: 8, textTransform: 'uppercase' }}>
                XÁC NHẬN TỔ ĐỘI
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 32, textAlign: 'center' }}>
                Chào mừng trở lại,<br/>{phone || 'Đồng Quang Huy'}!
              </div>

              {/* Dynamic Avatar & Level (Simulated Real Data) */}
              <div style={{ position: 'relative', marginBottom: 40 }}>
                {/* Fallback Initials Avatar */}
                <div style={{ 
                  width: 100, height: 110, background: '#111', 
                  clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: \`2px solid \${colors.welcome}\`,
                  boxShadow: \`0 0 30px \${colors.welcome}40\`,
                  fontSize: 32, fontWeight: 800, color: colors.welcome
                }}>
                  {phone === '0866903420' ? 'AD' : 'ĐQ'}
                </div>
                {/* Level Badge */}
                <div style={{
                  position: 'absolute', bottom: -10, left: -10,
                  width: 48, height: 48, background: '#1e3a8a', border: \`3px solid \${colors.welcome}\`,
                  borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20, fontWeight: 900, color: '#fff', boxShadow: \`0 0 20px \${colors.welcome}\`
                }}>
                  {phone === '0866903420' ? '99' : '1'}
                </div>
              </div>

              {/* XP Bar (Simulated Real Data) */}
              {phone !== '0866903420' && (
                <div style={{ width: '100%', marginBottom: 32 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8, fontWeight: 700 }}>
                    <span style={{ color: colors.welcome, letterSpacing: 2 }}>LEVEL</span>
                    <span style={{ color: '#d1d5db' }}>0 / 100 XP</span>
                  </div>
                  <div style={{ width: '100%', height: 8, background: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: '0%', height: '100%', background: colors.welcome, boxShadow: \`0 0 15px \${colors.welcome}\` }} />
                  </div>
                </div>
              )}

              {/* Role / Team Selection */}
              {phone === '0866903420' ? (
                <div style={{ width: '100%', padding: 20, background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: 16, marginBottom: 32, textAlign: 'center' }}>
                  <div style={{ color: '#ef4444', fontWeight: 800, fontSize: 18, marginBottom: 8 }}>VAI TRÒ QUẢN TRỊ VIÊN (ADMIN)</div>
                  <div style={{ fontSize: 13, color: '#fca5a5' }}>Bạn có toàn quyền truy cập hệ thống. Hãy chuyển đến Bảng điều khiển Quản trị.</div>
                </div>
              ) : (
                <div style={{ width: '100%', marginBottom: 32 }}>
                  <div style={{ fontSize: 14, color: '#9ca3af', marginBottom: 16, textAlign: 'center' }}>Vui lòng chọn Tổ Đội (Ca làm việc):</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {['Tổ Cắt', 'Tổ Dán', 'Tổ Khoan'].map((team) => (
                      <button 
                        key={team}
                        onClick={() => {
                          localStorage.setItem('pwr_selected_team', team);
                          alert(\`Đã cấp quyền truy cập Phiên làm việc: \${team}\`);
                          router.push('/pwr/station/dashboard');
                        }}
                        style={{
                          width: '100%', padding: 16, borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)',
                          background: 'rgba(255,255,255,0.03)', color: '#fff', fontSize: 15, fontWeight: 600,
                          cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                        }}
                      >
                        {team} <ChevronRight size={18} color="#9ca3af" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button 
                onClick={() => {
                  if (phone === '0866903420') {
                    router.push('/pwr');
                  } else {
                    const savedTeam = localStorage.getItem('pwr_selected_team');
                    if (savedTeam) {
                      router.push('/pwr/station/dashboard');
                    } else {
                      alert('Vui lòng chọn 1 Tổ đội ở trên để tiếp tục!');
                    }
                  }
                }} 
                style={{ ...btnStyle, background: phone === '0866903420' ? 'linear-gradient(90deg, #991b1b, #ef4444)' : \`linear-gradient(90deg, #1e3a8a, \${colors.welcome})\`, boxShadow: phone === '0866903420' ? '0 8px 25px rgba(239,68,68,0.5)' : \`0 8px 25px rgba(59,130,246,0.5)\` }}
              >
                {phone === '0866903420' ? 'ĐẾN TRANG QUẢN TRỊ ADMIN' : 'VÀO TRẠM LÀM VIỆC'} <ChevronRight size={20} strokeWidth={3} />
              </button>
            </div>
          )}
`;
content = content.substring(0, startIndex) + replacement + content.substring(endIndex);
fs.writeFileSync('src/components/pwr/station/StationAuthUI.tsx', content);
console.log('Replaced successfully');
