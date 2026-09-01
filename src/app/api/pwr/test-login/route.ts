import { NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();
    console.log("TEST LOGIN: Received username:", username, "password length:", password?.length);

    if (!username || !password) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    
    const userRecs = await db.select().from(users).where(eq(users.username, username));
    const user = userRecs[0];
    
    if (!user) {
      console.log("TEST LOGIN: User not found");
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    
    const isValid = await bcrypt.compare(password, user.password);
    console.log("TEST LOGIN: isValid =", isValid);

    if (!isValid) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }
    
    return NextResponse.json({ success: true, user: { id: user.id, name: user.name } });
  } catch (err: any) {
    console.error("TEST LOGIN ERROR:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
