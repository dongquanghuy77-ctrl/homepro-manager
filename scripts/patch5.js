const fs = require('fs');
let content = fs.readFileSync('src/components/pwr/station/StationAuthUI.tsx', 'utf8');

// Add userProfile state after existing state declarations
const profileStateInsertion = `  const [userProfile, setUserProfile] = useState<{ id: number; name: string; role: string; username: string; phone: string | null } | null>(null);
`;
content = content.replace(
  '  const [authState, setAuthState] = useState<AuthState>(\'LOGIN\');',
  profileStateInsertion + '  const [authState, setAuthState] = useState<AuthState>(\'LOGIN\');'
);

// After signIn success, fetch real profile
const oldSignInSuccess = `          await update();
          setAuthState('WELCOME');`;
const newSignInSuccess = `          // Fetch real user profile from DB via NextAuth session
          try {
            const profileRes = await fetch('/api/pwr/auth/me');
            if (profileRes.ok) {
              const profileData = await profileRes.json();
              setUserProfile(profileData.user);
            }
          } catch (e) {
            // fallback to session data
          }
          setAuthState('WELCOME');`;
content = content.replace(oldSignInSuccess, newSignInSuccess);

// Update display: replace session?.user?.name with userProfile?.name
content = content.replace(
  /{session\?\.user\?\.name \|\| 'Đang tải\.\.\.'}/g,
  "{userProfile?.name || session?.user?.name || 'Đang tải...'}"
);

// Update initials: use userProfile?.name
content = content.replace(
  /{session\?\.user\?\.name \? getInitials\(session\.user\.name\) : \(phone === '0866903420' \? 'AD' : '\.\.\.'\)}/g,
  "{userProfile?.name ? getInitials(userProfile.name) : (session?.user?.name ? getInitials(session.user.name) : '...')}"
);

// Update Admin check: use userProfile?.role from DB instead of phone check
content = content.replace(
  /\(session\?\.user\?\.role === 'PWR_ADMIN' \|\| phone === '0866903420'\)/g,
  "(userProfile?.role === 'PWR_ADMIN' || (!userProfile && phone === '0866903420'))"
);
content = content.replace(
  /\(session\?\.user\?\.role !== 'PWR_ADMIN' && phone !== '0866903420'\)/g,
  "(userProfile?.role !== 'PWR_ADMIN' && !((!userProfile) && phone === '0866903420'))"
);

fs.writeFileSync('src/components/pwr/station/StationAuthUI.tsx', content);
console.log('Patched: Now uses /api/pwr/auth/me for real profile data');
