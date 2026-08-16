import * as fs from 'fs';
import * as path from 'path';

const basePath = path.join(process.cwd(), 'src/app/api/crm');

const models = [
  { name: 'leads', dbTarget: 'leads' },
  { name: 'opportunities', dbTarget: 'opportunities' },
  { name: 'quotes', dbTarget: 'quotes' },
  { name: 'contracts', dbTarget: 'contracts' },
];

for (const model of models) {
  const dirPath = path.join(basePath, model.name);
  fs.mkdirSync(dirPath, { recursive: true });

  // route.ts (GET, POST)
  const routeContent = `import { NextResponse } from 'next/server';
import { db } from '@/db';
import { ${model.dbTarget} } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';

export async function GET() {
  try {
    const data = await db.select().from(${model.dbTarget}).orderBy(desc(${model.dbTarget}.createdAt));
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const [newItem] = await db.insert(${model.dbTarget}).values(body).returning();
    return NextResponse.json(newItem);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
`;
  fs.writeFileSync(path.join(dirPath, 'route.ts'), routeContent);

  // [id]/route.ts (PUT, DELETE)
  const idDirPath = path.join(dirPath, '[id]');
  fs.mkdirSync(idDirPath, { recursive: true });

  const idRouteContent = `import { NextResponse } from 'next/server';
import { db } from '@/db';
import { ${model.dbTarget} } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id);
    const body = await req.json();
    const [updatedItem] = await db.update(${model.dbTarget})
      .set({ ...body, updatedAt: new Date() })
      .where(eq(${model.dbTarget}.id, id))
      .returning();
    return NextResponse.json(updatedItem);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id);
    await db.delete(${model.dbTarget}).where(eq(${model.dbTarget}.id, id));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
`;
  fs.writeFileSync(path.join(idDirPath, 'route.ts'), idRouteContent);
}

console.log('API scaffolding completed!');
