import sys

with open("src/components/pwr/kanban/PwrWbsView.tsx", "r", encoding="utf-8") as f:
    content = f.read()

idx = content.find("  return (\n    <div style={{ padding: '8px 24px 60px'")
if idx == -1:
    idx = content.find("  return (\r\n    <div style={{ padding: '8px 24px 60px'")

if idx == -1:
    print("Could not find anchor")
    sys.exit(1)

with open("top_part.txt", "w", encoding="utf-8") as f:
    f.write(content[:idx])
    
print("Top part saved!")