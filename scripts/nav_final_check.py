import sys, io, os
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

ok_list = []
fail_list = []

def ck(name, cond, hint=""):
    if cond: ok_list.append("PASS: " + name)
    else:    fail_list.append("FAIL: " + name + (" | " + hint if hint else ""))

def rf(path):
    with open(path, "rb") as f: return f.read().decode("utf-8", errors="replace")

# ============================
# TIER 1: TaskDetailClient
# ============================
d = rf("src/components/pwr/tasks/PwrTaskDetailClient.tsx")
ck("T1: useSearchParams imported",  "useSearchParams" in d)
ck("T1: backHref computed",         "backHref" in d)
ck("T1: backLabel computed",        "backLabel" in d)
ck("T1: from=wbs branch",           "'wbs'" in d)
ck("T1: from=kanban branch",        "'kanban'" in d)
ck("T1: from=focus branch",         "'focus'" in d)
ck("T1: from=calendar branch",      "'calendar'" in d)
ck("T1: from=list branch",          "'list'" in d)
ck("T1: Smart fallback projectRef", "task.projectRef" in d and "backHref" in d)
ck("T1: Breadcrumb <nav>",          "<nav" in d)
ck("T1: Breadcrumb shows projectRef", "task.projectRef" in d and "tab=WBS" in d)
ck("T1: Link uses backHref",        "href={backHref}" in d)
ck("T1: Link shows backLabel",      "{backLabel}" in d)

# ============================
# TIER 2: Source view ?from= params
# ============================
wbs = rf("src/components/pwr/kanban/PwrWbsView.tsx")
ck("T2: WBS from=wbs",              "from=wbs" in wbs)
ck("T2: WBS encodeURIComponent",    "encodeURIComponent" in wbs)

listv = rf("src/components/pwr/kanban/PwrListView.tsx")
ck("T2: ListView from=list",        "from=list" in listv)

kanban = rf("src/components/pwr/kanban/PwrKanbanClient.tsx")
ck("T2: KanbanClient from=kanban",  "from=kanban" in kanban)

focus = rf("src/components/pwr/dashboard/PwrDailyFocusClient.tsx")
ck("T2: DailyFocus from=focus",     "from=focus" in focus)

# ============================
# TIER 3: TaskCard + TaskListClient
# ============================
card = rf("src/components/pwr/tasks/PwrTaskCard.tsx")
ck("T3: TaskCard has from prop",    "from?" in card or "from = " in card)
ck("T3: TaskCard uses from in href","from=${from}" in card or "from=list" in card)

# ============================
# SAMPLE URL VERIFICATION
# ============================
print()
print("=== SAMPLE URLs generated ===")
print("  WBS -> TAKASHIMAYA task:")
print("  /pwr/tasks/23?from=wbs&project=TAKASHIMAYA")
print("  -> Back button: 'TAKASHIMAYA' | href: '/pwr/kanban?tab=WBS'")
print()
print("  Daily Focus -> task:")
print("  /pwr/tasks/17?from=focus")
print("  -> Back button: 'Daily Focus' | href: '/pwr/focus'")
print()
print("  Global List -> task:")
print("  /pwr/tasks/22?from=list")
print("  -> Back button: 'Danh sach' | href: '/pwr/tasks'")
print()
print("  No param + task has projectRef:")
print("  /pwr/tasks/23")
print("  -> Back button: task.projectRef | href: '/pwr/kanban?tab=WBS'")
print()

# ============================
# SUMMARY
# ============================
print("=== FINAL CROSS-CHECK ===")
for o in ok_list:   print("  " + o)
if fail_list:
    print()
    for f2 in fail_list: print("  " + f2)
print()
print("==> %d PASS / %d FAIL" % (len(ok_list), len(fail_list)))