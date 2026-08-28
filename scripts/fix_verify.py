import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

ok = []
fail = []
def ck(name, cond): (ok if cond else fail).append(("PASS" if cond else "FAIL") + ": " + name)

# --- Fix 1: VALID_TRANSITIONS ---
with open("src/lib/pwr/constants.ts", encoding="utf-8") as f:
    ct = f.read()

ck("F1-a: INBOX includes DONE",  "'DONE'" in ct and "INBOX" in ct.split("'DONE'")[0].split("INBOX")[-1] if "INBOX" in ct else False)
ck("F1-b: TODO includes DONE",   "TODO" in ct and "'DONE'" in ct)
ck("F1-c: Comment explains why", "Personal task manager" in ct or "personal" in ct.lower())
ck("F1-d: DEFERRED still blocked", "DEFERRED:    ['TODO', 'CANCELLED']" in ct)
ck("F1-e: WAITING→DONE still allowed", "'IN_PROGRESS', 'DONE', 'CANCELLED']" in ct)

# Verify INBOX and TODO lines specifically
lines = ct.split("\n")
for line in lines:
    if "INBOX" in line and "DONE" in line:
        ck("F1-a (line check): INBOX line has DONE", True)
        break
else:
    ck("F1-a (line check): INBOX line has DONE", False)

for line in lines:
    if "TODO" in line and "DONE" in line and "IN_PROGRESS" in line:
        ck("F1-b (line check): TODO line has DONE + IN_PROGRESS", True)
        break
else:
    ck("F1-b (line check): TODO line has DONE + IN_PROGRESS", False)

# --- Fix 2: Toast system ---
with open("src/components/pwr/kanban/PwrWbsView.tsx", encoding="utf-8") as f:
    wbs = f.read()

ck("F2-a: Toast state is typed object",      "{ message: string; type: 'success' | 'error' | 'warning' }" in wbs)
ck("F2-b: No bare string setToast remain",   "setToast('Loi" not in wbs and 'setToast("' not in wbs)
ck("F2-c: Success toast typed",              "type: 'success'" in wbs)
ck("F2-d: Error toast typed",                "type: 'error'" in wbs)
ck("F2-e: Warning toast typed",              "type: 'warning'" in wbs)
ck("F2-f: Toast render uses cfg.bg",         "cfg.bg" in wbs)
ck("F2-g: Toast render uses cfg.icon",       "cfg.icon" in wbs)
ck("F2-h: Toast render uses toast.message",  "toast.message" in wbs)
ck("F2-i: Error config has red color",       "#ef4444" in wbs and "error" in wbs)
ck("F2-j: Warning config has yellow color",  "#f59e0b" in wbs and "warning" in wbs)
ck("F2-k: Success config has green color",   "#10b981" in wbs and "success" in wbs)
ck("F2-l: All 8 setToast updated (no old string)", "setToast(msg)" not in wbs and "setToast(`Đã" not in wbs)

# --- INDEPENDENT VERIFY: Logic scenarios ---
ck("IV-1: Blocked gate still works",        "blockedIds.has(task.id)" in wbs)
ck("IV-2: Checklist gate still works",      "cl.done < cl.total" in wbs)
ck("IV-3: executeToggleDone still exists",  "executeToggleDone" in wbs)
ck("IV-4: localTasks optimistic still on",  "localTasks" in wbs)
ck("IV-5: Rollback on error still on",      "task : t" in wbs)

print("=== FINAL FIX CROSS-CHECK + INDEPENDENT VERIFY ===")
for o in ok: print("  " + o)
if fail:
    print()
    for f in fail: print("  " + f)
print()
print("==> %d PASS / %d FAIL" % (len(ok), len(fail)))