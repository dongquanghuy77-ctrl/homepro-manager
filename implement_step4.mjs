import fs from 'fs';

// 1. UPDATE PwrIngestionClient.tsx
const uiPath = 'src/components/pwr/ingestion/PwrIngestionClient.tsx';
let uiContent = fs.readFileSync(uiPath, 'utf-8');

// Add batchName state
uiContent = uiContent.replace(
  /const \[newProjectType, setNewProjectType\] = useState<string>\('CÔNG TRÌNH'\);/,
  "const [newProjectType, setNewProjectType] = useState<string>('CÔNG TRÌNH');\n  const [batchName, setBatchName] = useState<string>('');"
);

// Add Batch Name UI
const batchNameUI = `                      <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--color-text-muted)' }}>Tên Lô / Đợt sản xuất (Tùy chọn):</label>
                        <input 
                          type="text" 
                          value={batchName}
                          onChange={(e) => setBatchName(e.target.value)}
                          placeholder="VD: Đợt 1 - Tủ Bếp Tầng 1"
                          style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)', outline: 'none', fontSize: 14 }}
                        />
                      </div>`;

uiContent = uiContent.replace(
  /<div>\s*<label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var\(--color-text-muted\)' }}>Tên Dự Án Mới:<\/label>([\s\S]*?)<\/div>/,
  "<div>\n                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--color-text-muted)' }}>Tên Dự Án Mới:</label>$1</div>\n" + batchNameUI
);

// Add batchName to payload
uiContent = uiContent.replace(
  /projectName: finalProjectName/,
  "projectName: finalProjectName,\n            batchName: batchName.trim() || parsedData.fileName.replace('.xlsx', '')"
);
fs.writeFileSync(uiPath, uiContent);
console.log('UI Form updated.');

// 2. UPDATE explode/route.ts
const explodePath = 'src/app/api/pwr/ingestion/explode/route.ts';
let explodeContent = fs.readFileSync(explodePath, 'utf-8');
explodeContent = explodeContent.replace(
  /const { fileName, items, batchId, projectId, projectName, isNewProject, newProjectType } = body;/,
  "const { fileName, items, batchId, projectId, projectName, isNewProject, newProjectType, batchName } = body;"
);
explodeContent = explodeContent.replace(
  /const commonProjectRef = finalProjectName \|\| `BATCH_\${batchId}`;/,
  "const commonProjectRef = finalProjectName || `BATCH_${batchId}`;"
);
explodeContent = explodeContent.replace(
  /const batchTag = `BATCH_\${batchId}`;/,
  "const batchTag = `BATCH_${batchName || batchId}`;"
);
fs.writeFileSync(explodePath, explodeContent);
console.log('API explode updated.');

// 3. CREATE Delete API
const deleteApiPath = 'src/app/api/pwr/projects/[id]/route.ts';
let deleteApiContent = fs.readFileSync(deleteApiPath, 'utf-8');
deleteApiContent = deleteApiContent.replace(
  /import { pwrProjects, pwrTasks } from "@\/db\/schema";/,
  "import { pwrProjects, pwrTasks, pwrMaterialTransactions, pwrMaterials } from \"@/db/schema\";\nimport { sql, inArray } from \"drizzle-orm\";"
);

const newDeleteFunc = `
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const { session, error } = await requireAuth(req as any, ALL_ROLES);
  if (error) return error;
  const id     = parseInt(params.id, 10);
  const url    = new URL(req.url);
  const action = url.searchParams.get("action") ?? "archive";
  
  const [proj] = await db.select().from(pwrProjects)
    .where(and(eq(pwrProjects.id, id), eq(pwrProjects.userId, session.id)));
  if (!proj) return NextResponse.json({ error: "Khong tim thay du an" }, { status: 404 });
  
  if (action === "hard_delete") {
    let deletedTaskCount = 0;
    let revertedMaterialsCount = 0;
    
    await db.transaction(async (tx) => {
      const tasksInProj = await tx.select({ id: pwrTasks.id }).from(pwrTasks)
        .where(eq(pwrTasks.projectId, id));
        
      if (tasksInProj.length > 0) {
        const taskIds = tasksInProj.map(t => t.id);
        
        const transactions = await tx.select().from(pwrMaterialTransactions)
          .where(and(
            inArray(pwrMaterialTransactions.taskId, taskIds),
            inArray(pwrMaterialTransactions.transactionType, ['RESERVE', 'PENDING_IMPORT'])
          ));
          
        const revertMap = new Map<number, number>();
        for (const tr of transactions) {
          if (tr.transactionType === 'RESERVE' && tr.quantity) {
            revertMap.set(tr.materialId, (revertMap.get(tr.materialId) || 0) + tr.quantity);
          }
        }
        
        for (const [matId, qty] of revertMap.entries()) {
          await tx.update(pwrMaterials)
            .set({ reservedLevel: sql\`\${pwrMaterials.reservedLevel} - \${qty}\` })
            .where(eq(pwrMaterials.id, matId));
          revertedMaterialsCount++;
        }
        
        await tx.delete(pwrMaterialTransactions).where(inArray(pwrMaterialTransactions.taskId, taskIds));
        await tx.delete(pwrTasks).where(inArray(pwrTasks.id, taskIds));
        deletedTaskCount = taskIds.length;
      }
      
      await tx.delete(pwrProjects).where(eq(pwrProjects.id, id));
    });
    
    return NextResponse.json({ deleted: true, projectId: id, deletedTaskCount, revertedMaterialsCount });
  }

  const now = new Date();
  await db.update(pwrProjects)
    .set({ status: "ARCHIVED", updatedAt: now } as any)
    .where(and(eq(pwrProjects.id, id), eq(pwrProjects.userId, session.id)));
  return NextResponse.json({ archived: true, projectId: id });
}
`;
deleteApiContent = deleteApiContent.replace(/export async function DELETE[\s\S]*$/, newDeleteFunc);
fs.writeFileSync(deleteApiPath, deleteApiContent);
console.log('API projects updated.');

// 4. Update Kanban UI (PwrWbsView.tsx)
const kanbanPath = 'src/components/pwr/kanban/PwrWbsView.tsx';
let kanbanContent = fs.readFileSync(kanbanPath, 'utf-8');
const kanbanDeleteLogic = `
  const handleDeleteProject = async (projectId: number, projectName: string) => {
    const confirmCode = window.prompt(\`CẢNH BÁO: Bạn chuẩn bị XÓA TOÀN BỘ DỰ ÁN "\${projectName}".\\nViệc này sẽ xóa toàn bộ Task và hoàn trả số lượng vật tư đang giữ chỗ trong kho.\\nNhập chữ "XOA" để xác nhận:\`);
    if (confirmCode !== 'XOA') {
      if (confirmCode !== null) alert('Nhập sai từ khóa xác nhận. Hủy xóa.');
      return;
    }
    
    try {
      const res = await fetch(\`/api/pwr/projects/\${projectId}?action=hard_delete\`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setToast({ message: \`Đã xóa dự án và hoàn trả vật tư thành công!\`, type: 'success' });
      setTimeout(() => setToast(null), 3000);
      onRefresh?.();
    } catch (e: any) {
      alert("Lỗi khi xóa: " + e.message);
    }
  };
`;
kanbanContent = kanbanContent.replace(
  /  const today = new Date\(\)\.toISOString\(\)\.slice\(0, 10\);/,
  kanbanDeleteLogic + "\n  const today = new Date().toISOString().slice(0, 10);"
);

kanbanContent = kanbanContent.replace(
  /\{p\} <span style=\{\{ fontSize: 13, fontWeight: 500, color: 'var\(--color-text-muted\)', background: 'var\(--color-surface\)', padding: '2px 8px', borderRadius: 12 \}\}>\{pTasks\.length\} việc<\/span>([\s\S]*?)<\/div>\n\s*<div style=\{\{ display: 'flex', gap: 16, fontSize: 13, fontWeight: 600, color: 'var\(--color-text-muted\)' \}\}>/,
  `{p} <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-muted)', background: 'var(--color-surface)', padding: '2px 8px', borderRadius: 12 }}>{pTasks.length} việc</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {pTasks[0]?.projectId && (
              <button 
                onClick={() => handleDeleteProject(pTasks[0].projectId!, p)}
                style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <Trash2 size={14} /> Xóa Dự Án
              </button>
            )}
            <div style={{ display: 'flex', gap: 16, fontSize: 13, fontWeight: 600, color: 'var(--color-text-muted)' }}>`
);

fs.writeFileSync(kanbanPath, kanbanContent);
console.log('Kanban UI updated.');
