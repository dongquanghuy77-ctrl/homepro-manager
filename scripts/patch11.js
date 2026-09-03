const fs = require('fs');
let content = fs.readFileSync('src/components/pwr/station/MobileStationClient.tsx', 'utf8');

// Function to replace the avatar <img> tag with a CSS-based initials avatar
const avatarOldStr = `<img 
                      src={userAvatar || \\\`https://ui-avatars.com/api/?name=\\$\\{encodeURIComponent(userName)\\}\\&background=3b82f6\\&color=fff\\&bold=true\\\`} 
                      alt="Avatar" 
                      onError={(e) => {
                        e.currentTarget.src = \\\`https://ui-avatars.com/api/?name=\\$\\{encodeURIComponent(userName)\\}\\&background=3b82f6\\&color=fff\\&bold=true\\\`;
                      }}
                      style={{ width: 48, height: 48, minWidth: 48, borderRadius: '50%', border: '2px solid #374151', objectFit: 'cover' }} 
                    />`;

const avatarNewStr = `
                    <div style={{ 
                      width: 48, height: 48, minWidth: 48, borderRadius: '50%', 
                      border: '2px solid #374151', 
                      background: '#3b82f6', 
                      display: 'flex', alignItems: 'center', justifyContent: 'center', 
                      color: '#fff', fontWeight: 'bold', fontSize: 20 
                    }}>
                      {userName ? userName.trim().split(' ').filter(Boolean).map((w, i, a) => i === 0 || i === a.length - 1 ? w[0] : '').join('').toUpperCase().substring(0,2) : '??'}
                    </div>
`;

// It's safer to use regex to replace the img block
const regex = /<img[^>]*src=\{userAvatar[^>]*alt="Avatar"[^>]*\/>/s;
if (regex.test(content)) {
  content = content.replace(regex, avatarNewStr);
} else {
  console.log("Could not find the avatar img block");
}

fs.writeFileSync('src/components/pwr/station/MobileStationClient.tsx', content);
console.log('Patched avatar to use CSS initials');
