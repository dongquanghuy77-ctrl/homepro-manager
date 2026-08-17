import { NextResponse } from 'next/server';
import { db } from '@/db';
import { leads, customers, opportunities } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id);
    const [item] = await db.select().from(leads).where(eq(leads.id, id));
    if (!item) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }
    return NextResponse.json(item);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id);
    const body = await req.json();
    
    if (body.action === 'convert') {
      const [lead] = await db.select().from(leads).where(eq(leads.id, id));
      if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
      
      // Create customer
      const [customer] = await db.insert(customers).values({
        name: lead.name,
        phone: lead.phone,
        email: lead.email,
        address: lead.address,
        notes: lead.notes,
        assignedTo: lead.assignedTo,
      }).returning();
      
      // Create opportunity
      const [opportunity] = await db.insert(opportunities).values({
        name: `Cơ hội từ ${lead.name}`,
        customerId: customer.id,
        leadId: lead.id,
        estimatedValue: lead.estimatedValue,
        assignedTo: lead.assignedTo,
        status: 'NEW',
        source: lead.source,
      }).returning();
      
      // Update lead status
      await db.update(leads).set({ status: 'CONVERTED', updatedAt: new Date() }).where(eq(leads.id, id));
      
      return NextResponse.json({ success: true, customer, opportunity });
    }

    const [updatedItem] = await db.update(leads)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(leads.id, id))
      .returning();
      
    if (!updatedItem) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(updatedItem);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id);
    const [item] = await db.select().from(leads).where(eq(leads.id, id));
    if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    
    await db.delete(leads).where(eq(leads.id, id));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
