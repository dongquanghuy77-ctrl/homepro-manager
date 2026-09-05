const fs = require('fs');
let code = fs.readFileSync('src/app/api/pwr/auth/avatar/route.ts', 'utf8');

// Ensure pwrUserStats is imported
if (!code.includes('pwrUserStats')) {
  code = code.replace(/import \{ users \} from '@\/db\/schema';/, "import { users, pwrUserStats } from '@/db/schema';");
}

// Modify GET to join stats
const getRegex = /export async function GET[\s\S]*?const result = await db\.select\([\s\S]*?\.limit\(1\);\s*return NextResponse\.json\(\{ avatarUrl: result\[0\]\?\.avatarUrl \|\| null, name: result\[0\]\?\.name \|\| null \}\);\s*\} catch \(error: any\) \{/;
const newGet = `export async function GET(req: NextRequest) {
  try {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET || 'fallback_secret_for_homepro_12345!@#',
    });
    if (!token?.id) return NextResponse.json({ avatarUrl: null });
    const userId = parseInt(token.id as string);
    
    // Fetch user and stats
    const [userRow] = await db.select({ avatarUrl: users.avatarUrl, name: users.name }).from(users).where(eq(users.id, userId)).limit(1);
    const [statsRow] = await db.select().from(pwrUserStats).where(eq(pwrUserStats.userId, userId)).limit(1);
    
    return NextResponse.json({ 
      avatarUrl: userRow?.avatarUrl || null, 
      name: userRow?.name || null,
      totalPoints: statsRow?.totalPoints || 0,
      currentLevel: statsRow?.currentLevel || 1
    });
  } catch (error: any) {`;

code = code.replace(getRegex, newGet);
fs.writeFileSync('src/app/api/pwr/auth/avatar/route.ts', code, 'utf8');
