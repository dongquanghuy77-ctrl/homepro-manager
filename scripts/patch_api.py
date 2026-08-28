import re

with open("src/app/api/pwr/tasks/[id]/route.ts", "r", encoding="utf-8") as f:
    code = f.read()

pattern = r"(\s*// Status transition\s+if \(newStatus && newStatus !== existing\.status\) \{)(.*?)(updatePayload\.status = newStatus;)"

replacement = """\g<1>\g<2>
      // ==========================================
      // GATE LOGIC: Dependencies & Checklists
      // ==========================================
      if (!forceOverride) {
        // Gate 1: Check Dependencies if moving to IN_PROGRESS or DONE
        if (newStatus === 'IN_PROGRESS' || newStatus === 'DONE') {
          const blockers = await db.select({
            id: pwrTaskDependencies.id,
            status: pwrTasks.status,
            title: pwrTasks.title
          })
          .from(pwrTaskDependencies)
          .innerJoin(pwrTasks, eq(pwrTaskDependencies.dependsOnId, pwrTasks.id))
          .where(
            and(
              eq(pwrTaskDependencies.taskId, id),
              eq(pwrTaskDependencies.depType, 'BLOCKED_BY')
            )
          );
          
          const activeBlockers = blockers.filter(b => b.status !== 'DONE' && b.status !== 'CANCELLED');
          if (activeBlockers.length > 0) {
            return NextResponse.json({ error: `Bị chặn bởi: ${activeBlockers.map(b => b.title).join(', ')}` }, { status: 400 });
          }
        }
        
        // Gate 2: Check Checklists if moving to DONE
        if (newStatus === 'DONE') {
          const incompleteChecklists = await db.select().from(pwrChecklists)
            .where(and(eq(pwrChecklists.taskId, id), eq(pwrChecklists.isDone, false)));
          
          if (incompleteChecklists.length > 0) {
            return NextResponse.json({ error: `Còn ${incompleteChecklists.length} việc con chưa hoàn thành` }, { status: 400 });
          }
        }
      } else {
        // If overriding, we MUST create an explicit Override log
        await db.insert(pwrWorkLogs).values({
          taskId:      id,
          userId:      session.id,
          logType:     'ISSUE_LOG',
          content:     `[FORCE_PROCEED] Quản lý vượt rào: Chuyển sang ${newStatus}. Lý do: ${reason || 'Khẩn cấp'}`,
          isSystemLog: false, // Make it highly visible in reports
        });
      }
      // ==========================================

      \g<3>"""

new_code = re.sub(pattern, replacement, code, flags=re.DOTALL)

with open("src/app/api/pwr/tasks/[id]/route.ts", "w", encoding="utf-8") as f:
    f.write(new_code)
print("Patched route.ts")