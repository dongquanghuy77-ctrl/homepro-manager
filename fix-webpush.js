const fs = require('fs');
let c = fs.readFileSync('src/app/api/pwr/station/push-subscribe/route.ts', 'utf8');

c = c.replace(/webpush\.setVapidDetails\([\s\S]*?\);/, `// Lazy initialize webpush to prevent Vercel build crash
let isWebPushInitialized = false;
function initWebPush() {
  if (isWebPushInitialized) return;
  const pubKey = process.env.NEXT_PUBLIC_VAPID_KEY;
  const privKey = process.env.VAPID_PRIVATE_KEY;
  if (pubKey && privKey && pubKey.trim() !== "" && privKey.trim() !== "") {
    webpush.setVapidDetails("mailto:admin@homepro.vn", pubKey, privKey);
    isWebPushInitialized = true;
  } else {
    console.warn("VAPID keys missing, webpush notifications disabled.");
  }
}`);

c = c.replace(/export async function POST\(req: NextRequest\) \{/, `export async function POST(req: NextRequest) {\n  initWebPush();`);

fs.writeFileSync('src/app/api/pwr/station/push-subscribe/route.ts', c, 'utf8');
