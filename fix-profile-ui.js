const fs = require('fs');
let code = fs.readFileSync('src/components/pwr/station/ProfileTabUI.tsx', 'utf8');

// Replace useSession hook with getSession state
code = code.replace(/import { signOut, useSession } from 'next-auth\/react';/g, "import { signOut, getSession } from 'next-auth/react';");

// Remove the useSession hook call
code = code.replace(/const { data: session } = useSession\(\);/g, "const [userId, setUserId] = useState('UNKNOWN');");

// Modify generateTOTP
const oldGenerate = `const generateTOTP = () => {
    const userId = session?.user?.id || 'UNKNOWN';`;
const newGenerate = `const generateTOTP = (uid) => {
    const currentUserId = uid || userId || 'UNKNOWN';`;
code = code.replace(oldGenerate, newGenerate);

// Modify the JSON.stringify payload to use currentUserId
code = code.replace(/const payload = JSON\.stringify\({ u: userId, t: timeWindow, action: "STATION_AUTH" }\);/, 'const payload = JSON.stringify({ u: currentUserId, t: timeWindow, action: "STATION_AUTH" });');

// Modify useEffect to use getSession
const oldEffect = `useEffect(() => {
    if (session?.user) {
      generateTOTP();
      const timer = setInterval(() => {
        generateTOTP();
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [session]);`;
const newEffect = `useEffect(() => {
    let activeId = 'UNKNOWN';
    getSession().then(session => {
      if (session?.user) {
        // NextAuth might not expose id by default, fallback to name/email
        activeId = (session.user as any).id || session.user.name || session.user.email || 'UNKNOWN';
        setUserId(activeId);
        generateTOTP(activeId);
      }
    });
    
    const timer = setInterval(() => {
      generateTOTP(activeId);
    }, 1000);
    return () => clearInterval(timer);
  }, []);`;
code = code.replace(oldEffect, newEffect);

fs.writeFileSync('src/components/pwr/station/ProfileTabUI.tsx', code, 'utf8');
console.log('Fixed ProfileTabUI');
