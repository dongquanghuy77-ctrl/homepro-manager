import { NextResponse } from 'next/server';
import { db } from '@/db';
import { customers } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET() {
  try {
    const list = await db.select().from(customers).orderBy(desc(customers.createdAt));
    return NextResponse.json(list);
  } catch (error: any) {
    console.error('Fetch customers error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const newCustomer = await db.insert(customers).values({
      name: body.name,
      phone: body.phone,
      email: body.email,
      address: body.address,
      notes: body.notes,
      customerType: body.customerType || 'INDIVIDUAL',
    }).returning();
    
    return NextResponse.json(newCustomer[0]);
  } catch (error: any) {
    console.error('Create customer error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
