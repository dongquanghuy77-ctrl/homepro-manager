const fs = require('fs');
let content = fs.readFileSync('src/components/pwr/station/StationAuthUI.tsx', 'utf8');

// 1. Import getSession alongside signIn, useSession
content = content.replace(
  "import { signIn, useSession } from 'next-auth/react';",
  "import { signIn, useSession, getSession } from 'next-auth/react';"
);

// 2. Replace the entire login success block to use getSession() directly
// Old: await update(); then fetch /api/pwr/auth/me
const oldBlock = `          // Fetch real user profile from DB via NextAuth session
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

const newBlock = `          // getSession() forces a fresh fetch from /api/auth/session
          // which returns the real name stored by NextAuth authorize()
          const freshSession = await getSession();
          if (freshSession?.user?.name) {
            setUserProfile({
              id: 0,
              username: phone,
              name: freshSession.user.name,
              role: (freshSession.user as any)?.role || 'WORKER',
              phone: phone,
            });
          }
          setAuthState('WELCOME');`;

content = content.replace(oldBlock, newBlock);

fs.writeFileSync('src/components/pwr/station/StationAuthUI.tsx', content);
console.log('Patched with getSession() approach');
