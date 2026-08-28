import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

ok = []
fail = []
def ck(name, cond): (ok if cond else fail).append(("PASS" if cond else "FAIL") + ": " + name)

# --- Fix 1: Backend Route ---
with open("src/app/api/pwr/tasks/[id]/route.ts", encoding="utf-8") as f:
    r = f.read()

ck("B1: removed status='DONE' in checklists update", ".set({ isDone: true })" in r and "status: 'DONE'" not in r.split(".set({ isDone: true })")[0].split("if (newStatus === 'DONE')")[-1])
ck("B2: linked_task_id replaced with taskId", "pwrChecklists.taskId" in r and "linked_task_id" not in r)

# --- Fix 2: Frontend WBS ---
with open("src/components/pwr/kanban/PwrWbsView.tsx", encoding="utf-8") as f:
    w = f.read()

ck("F1: blockedIds replaced by blockedMap", "blockedMap, setBlockedMap" in w and "setBlockedIds" not in w)
ck("F2: map is Record<number, string[]>", "Record<number, string[]>" in w)
ck("F3: extract blockers from API", "b.task.title" in w and "map((b: any) => b.task.title)" in w)
ck("F4: build map in .then", "const bMap: Record<number, string[]> = {};" in w and "setBlockedMap(bMap)" in w)
ck("F5: handleToggleDone reads blockedMap", "const blockers = blockedMap[task.id]" in w)
ck("F6: format names in toast", "blockers.join(', ')" in w)

print("=== FINAL FIX CROSS-CHECK + INDEPENDENT VERIFY ===")
for o in ok: print("  " + o)
if fail:
    print()
    for f in fail: print("  " + f)
print()
print("==> %d PASS / %d FAIL" % (len(ok), len(fail)))