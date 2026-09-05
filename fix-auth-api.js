const fs = require('fs');
let code = fs.readFileSync('src/app/api/pwr/auth/me/route.ts', 'utf8');

// Remove the bad appended patch block
const badBlockIndex = code.indexOf("import { hash } from 'bcryptjs';");
if (badBlockIndex !== -1) {
  code = code.substring(0, badBlockIndex);
}

// Add the import to the top
if (!code.includes("import { hash }")) {
  code = `import { hash } from 'bcryptjs';\n` + code;
}

// Add the patch function at the bottom
code += `
export async function PATCH(req: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.name && !session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const body = await req.json();
    const { password } = body;
    
    if (!password) {
      return NextResponse.json({ error: 'Missing password' }, { status: 400 });
    }

    const hashedPassword = await hash(password, 10);
    
    const condition = session.user.email ? eq(users.email, session.user.email) : eq(users.username, session.user.name);
    
    await db.update(users).set({ password: hashedPassword }).where(condition);
    
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
`;

fs.writeFileSync('src/app/api/pwr/auth/me/route.ts', code, 'utf8');
console.log('Fixed API route');
