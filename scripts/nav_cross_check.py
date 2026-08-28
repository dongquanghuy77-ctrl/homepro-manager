import sys, io, os
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

checks = []
fails  = []

def ck(name, ok, detail=""):
    if ok: checks.append("PASS: " + name + (" (" + detail + ")" if detail else ""))
    else:  fails.append("FAIL: " + name + (" (" + detail + ")" if detail else ""))

# PwrTaskDetailClient
with open("src/components/pwr/tasks/PwrTaskDetailClient.tsx", "rb") as f:
    detail = f.read().decode("utf-8", errors="replace")

ck("useSearchParams imported", "useSearchParams" in detail)
ck("backHref variable", "backHref" in detail)
ck("backLabel variable", "backLabel" in detail)
ck("from=wbs handled", "'wbs'" in detail or '"wbs"' in detail)
ck("from=kanban handled", "'kanban'" in detail or '"kanban"' in detail)
ck("from=focus handled", "'focus'" in detail or '"focus"' in detail)
ck("from=calendar handled", "'calendar'" in detail or '"calendar"' in detail)
ck("Breadcrumb nav", "<nav" in detail and "Cong viec" in detail.encode("ascii","ignore").decode())
ck("Breadcrumb: projectRef", "task.projectRef" in detail)
ck("Breadcrumb: kanban?tab=WBS", "tab=WBS" in detail)

# PwrWbsView
with open("src/components/pwr/kanban/PwrWbsView.tsx", "rb") as f:
    wbs = f.read().decode("utf-8", errors="replace")
ck("WBS: from=wbs in links", "from=wbs" in wbs)
ck("WBS: encodeURIComponent", "encodeURIComponent" in wbs)

# PwrListView
with open("src/components/pwr/kanban/PwrListView.tsx", "rb") as f:
    listv = f.read().decode("utf-8", errors="replace")
ck("ListView: from=list", "from=list" in listv)

# PwrKanbanClient
with open("src/components/pwr/kanban/PwrKanbanClient.tsx", "rb") as f:
    kanban = f.read().decode("utf-8", errors="replace")
ck("KanbanClient: from=kanban", "from=kanban" in kanban)

# PwrTaskListClient
with open("src/components/pwr/tasks/PwrTaskListClient.tsx", "rb") as f:
    tasklist = f.read().decode("utf-8", errors="replace")
ck("TaskListClient: from=list", "from=list" in tasklist)

# DailyFocusClient
with open("src/components/pwr/dashboard/PwrDailyFocusClient.tsx", "rb") as f:
    focus = f.read().decode("utf-8", errors="replace")
ck("DailyFocus: from=focus", "from=focus" in focus)

print("=== INDEPENDENT CROSS-CHECK ===")
for c in checks: print("  " + c)
print()
for f2 in fails:  print("  " + f2)
print()
print("==> %d PASS / %d FAIL" % (len(checks), len(fails)))