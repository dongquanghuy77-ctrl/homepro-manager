const fs = require('fs');
let content = fs.readFileSync('src/components/pwr/station/StationAuthUI.tsx', 'utf8');

// Remove useSession hook call
content = content.replace('  const { data: session, update } = useSession();\n', '');

// Remove useSession from import
content = content.replace(
  "import { signIn, useSession, getSession } from 'next-auth/react';",
  "import { signIn, getSession } from 'next-auth/react';"
);

// Any remaining session?.user?.name will fallback to userProfile?.name
// Let's just find and replace session?.user?.name with userProfile?.name just in case there are any left.
// Actually, I can just replace them.
content = content.replace(/session\?\.user\?\.name/g, 'userProfile?.name');

fs.writeFileSync('src/components/pwr/station/StationAuthUI.tsx', content);
console.log('Removed useSession to fix NextAuth SessionProvider crash');
