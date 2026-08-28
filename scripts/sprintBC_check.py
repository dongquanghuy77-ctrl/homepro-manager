import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

ok = []
fail = []
def ck(name, cond): 
    (ok if cond else fail).append(("PASS" if cond else "FAIL") + ": " + name)

# Sprint B checks - PwrWbsView
with open("src/components/pwr/kanban/PwrWbsView.tsx", "rb") as f:
    wbs = f.read().decode("utf-8", errors="replace")

ck("B1: executeToggleDone extracted",          "executeToggleDone" in wbs)
ck("B2: warnTask state declared",              "warnTask" in wbs and "useState<PwrTask | null>" in wbs)
ck("B3: Gate1 blocked check",                  "Gate 1" in wbs and "blockedIds.has(task.id)" in wbs)
ck("B4: Gate2 checklist incomplete check",     "Gate 2" in wbs and "cl.done < cl.total" in wbs)
ck("B5: setWarnTask called on incomplete",     "setWarnTask(task)" in wbs)
ck("B6: Warning modal renders",                "Checklist chua hoan thanh" in wbs.encode("ascii","ignore").decode() or "warnTask" in wbs)
ck("B7: Huy button in modal",                  "setWarnTask(null)" in wbs)
ck("B8: Confirm button calls executeToggleDone","executeToggleDone(t)" in wbs)
ck("B9: Blocked toast message",                "bi chan" in wbs.encode("ascii","ignore").decode() or "tien dieu kien" in wbs.encode("ascii","ignore").decode())
ck("B10: Blocked cannot mark DONE",            "blockedIds.has(task.id)" in wbs and "return;" in wbs)

# Sprint C checks - PwrDailyFocusClient
with open("src/components/pwr/dashboard/PwrDailyFocusClient.tsx", "rb") as f:
    focus = f.read().decode("utf-8", errors="replace")

ck("C1: doneToday computed",                   "doneToday" in focus)
ck("C2: pctScore computed",                    "pctScore" in focus)
ck("C3: scoreColor thresholds (80, 50)",       "80" in focus and "50" in focus and "scoreColor" in focus)
ck("C4: Score emoji mapping",                  "scoreEmoji" in focus)
ck("C5: scoreLabel mapping",                   "scoreLabel" in focus)
ck("C6: Progress bar rendered",                "width: `${pctScore}%`" in focus)
ck("C7: Big % number displayed",               "{pctScore}" in focus)
ck("C8: Nang suat label",                      "NANG SUAT" in focus.encode("ascii","ignore").decode())

print("=== SPRINT B+C CROSS-CHECK ===")
for o in ok:   print("  " + o)
if fail:
    print()
    for f2 in fail: print("  " + f2)
print()
print("==> %d PASS / %d FAIL" % (len(ok), len(fail)))