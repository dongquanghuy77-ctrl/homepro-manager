import sys, io, re
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
with open("src/components/pwr/kanban/PwrCreateProjectModal.tsx", "rb") as f:
    content = f.read().decode("utf-8")
patterns = re.findall(r".{0,5}[Ã][^\s].{0,10}", content)
print("Remaining mojibake count:", len(patterns))
for p in patterns[:8]:
    print(" ", repr(p))