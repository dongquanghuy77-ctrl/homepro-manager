with open("src/app/api/pwr/ingestion/explode/route.ts", "r", encoding="utf-8") as f:
    content = f.read()

# Fix the broken string
content = content.replace("shortageNotes.join('\n')", "shortageNotes.join('\\n')")

with open("src/app/api/pwr/ingestion/explode/route.ts", "w", encoding="utf-8") as f:
    f.write(content)