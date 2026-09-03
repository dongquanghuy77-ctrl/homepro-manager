const fs = require('fs');
let c = fs.readFileSync('src/components/pwr/station/HomeTabUI.tsx', 'utf8');
c = c.replace(`const logout = () => window.location.href = '/api/auth/signout'; // Fallback if no logout in store`, `import { signOut } from "next-auth/react";\n\n  const logout = () => signOut({ callbackUrl: "/pwr/station/login" });`);
// Also need to put import at the top
c = c.replace(`import { signOut } from "next-auth/react";\n\n  const logout`, `const logout`);
c = `import { signOut } from "next-auth/react";\n` + c;
fs.writeFileSync('src/components/pwr/station/HomeTabUI.tsx', c, 'utf8');
