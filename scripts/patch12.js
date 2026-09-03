const fs = require('fs');
let content = fs.readFileSync('src/components/pwr/station/MobileStationClient.tsx', 'utf8');

const oldImg = `<img 
                    src={userAvatar} 
                    alt="Avatar" 
                    onError={(e) => {
                      // QA Safegard: Lỗi CDN -> Tự sinh ảnh từ Tên
                      e.currentTarget.src = \`https://ui-avatars.com/api/?name=\${encodeURIComponent(userName)}&background=3b82f6&color=fff&bold=true\`;
                    }}
                    style={{ width: 48, height: 48, minWidth: 48, borderRadius: '50%', border: '2px solid #374151', objectFit: 'cover' }} 
                  />`;

const newAvatar = `                  <div style={{ 
                    width: 48, height: 48, minWidth: 48, borderRadius: '50%', border: '2px solid #374151',
                    background: '#3b82f6', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 20, fontWeight: 'bold'
                  }}>
                    {userName ? userName.trim().split(' ').filter(Boolean).map((w, i, a) => i === 0 || i === a.length - 1 ? w[0] : '').join('').toUpperCase().substring(0,2) : '??'}
                  </div>`;

content = content.replace(oldImg, newAvatar);
fs.writeFileSync('src/components/pwr/station/MobileStationClient.tsx', content);
console.log('Replaced avatar with CSS initials');
