const fs = require('fs');
let content = fs.readFileSync('src/components/pwr/station/MobileStationClient.tsx', 'utf8');

// We need to import getSession
content = content.replace(
  "import { useRouter } from 'next/navigation';",
  "import { useRouter } from 'next/navigation';\nimport { getSession } from 'next-auth/react';"
);

// Add useEffect to fetch session and update usePwrStore
const updateStoreCode = `
  useEffect(() => {
    // Sync store with actual session data
    async function loadSession() {
      const session = await getSession();
      if (session?.user?.name) {
        usePwrStore.setState({ 
          userName: session.user.name,
          userLevel: 1, // Default reset
          userPoints: 0 // Default reset
        });
      }
    }
    loadSession();
  }, []);
`;

content = content.replace("export default function MobileStationClient() {", "export default function MobileStationClient() {\n" + updateStoreCode);

fs.writeFileSync('src/components/pwr/station/MobileStationClient.tsx', content);
console.log('Added session sync to MobileStationClient');
