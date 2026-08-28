import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

with open("src/components/pwr/kanban/PwrWbsView.tsx", "rb") as f:
    code = f.read().decode("utf-8", errors="replace")

ok = []
fail = []
def ck(name, cond): 
    (ok if cond else fail).append(("PASS" if cond else "FAIL") + ": " + name)

# Sprint A checks
ck("A1: localTasks state declared",                   "localTasks" in code and "useState<PwrTask[]>(tasks)" in code)
ck("A2: pendingIds state declared",                   "pendingIds" in code and "useState<Set<number>>" in code)
ck("A3: Sync localTasks on tasks change (useEffect)", "setLocalTasks(tasks)" in code)
ck("A4: handleToggleDone function exists",            "handleToggleDone" in code)
ck("A5: e.preventDefault() called",                  "e.preventDefault()" in code)
ck("A6: e.stopPropagation() called",                  "e.stopPropagation()" in code)
ck("A7: Debounce check (pendingIds.has)",             "pendingIds.has(task.id)" in code)
ck("A8: Optimistic update setLocalTasks",             "setLocalTasks(prev" in code)
ck("A9: PATCH API called",                            "'PATCH'" in code and "api/pwr/tasks" in code)
ck("A10: Rollback on error",                          "Rollback on error" in code or "task : t" in code)
ck("A11: Toast feedback on success",                  "Hoan thanh" in code or "Hoàn thành" in code)
ck("A12: Button replaces static div",                 "<button" in code and "handleToggleDone" in code)
ck("A13: Button disabled during pending",             "disabled={pendingIds.has(task.id)}" in code)
ck("A14: projTasks uses localTasks",                  "localTasks.filter" in code)
ck("A15: Tooltip on button",                          "title={isDone" in code or "Bam de" in code.encode("ascii","ignore").decode())

print("=== SPRINT A CROSS-CHECK ===")
for o in ok:   print("  " + o)
if fail:
    print()
    for f in fail: print("  " + f)
print()
print("Result: %d PASS / %d FAIL" % (len(ok), len(fail)))