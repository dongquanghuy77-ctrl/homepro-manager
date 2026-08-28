with open("src/app/api/pwr/ingestion/explode/route.ts", "r", encoding="utf-8") as f:
    lines = f.readlines()

new_lines = []
skip_next = False
for i, line in enumerate(lines):
    if skip_next:
        skip_next = False
        continue
        
    if "Hệ thống tự động phát hiện thiếu vật tư khi nổ Task:" in line or "H th`ng t `Tng phAt hin thiu v-t t khi n  Task:" in line:
        # replace this line and the next with a proper template literal
        new_lines.append("        description: `Hệ thống tự động phát hiện thiếu vật tư khi nổ Task:\\n${shortageNotes.join('\\n')}`,\n")
        skip_next = True
    else:
        new_lines.append(line)

with open("src/app/api/pwr/ingestion/explode/route.ts", "w", encoding="utf-8") as f:
    f.writelines(new_lines)