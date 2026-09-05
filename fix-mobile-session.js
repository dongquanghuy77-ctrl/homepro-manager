const fs = require('fs');
let code = fs.readFileSync('src/components/pwr/station/MobileStationClient.tsx', 'utf8');

const regex = /\/\/\s*L\u00E2\u0301y avatar URL t\u00F9 DB[\s\S]*?usePwrStore\.setState\(\{ userAvatar: data\.avatarUrl \}\);\s*\}\s*\}\s*\} catch \(e\) \{/i;
// Oh wait, Vietnamese accents in code might be garbled in regex. Let's use flexible regex.

const flexRegex = /try \{\s*const res = await fetch\('\/api\/pwr\/auth\/avatar'\);\s*if \(res\.ok\) \{\s*const data = await res\.json\(\);\s*if \(data\.avatarUrl\) \{\s*usePwrStore\.setState\(\{ userAvatar: data\.avatarUrl \}\);\s*\}\s*\}\s*\} catch \(e\) \{/;

const replacement = `try {
          const res = await fetch('/api/pwr/auth/avatar');
          if (res.ok) {
            const data = await res.json();
            usePwrStore.setState({ 
              userAvatar: data.avatarUrl || null,
              userPoints: data.totalPoints || 0,
              userLevel: data.currentLevel || 1
            });
          }
        } catch (e) {`;

code = code.replace(flexRegex, replacement);
fs.writeFileSync('src/components/pwr/station/MobileStationClient.tsx', code, 'utf8');
