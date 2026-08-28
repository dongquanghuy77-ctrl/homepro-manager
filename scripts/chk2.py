import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

# Check specifically what the modal contains NOW
with open("src/components/pwr/kanban/PwrCreateProjectModal.tsx", "rb") as f:
    text = f.read().decode("utf-8")

# Find truly bad mojibake only (not false positives from Vietnamese)
bad_patterns = ["Ã¡", "Ã´", "Ã³", "Ä\u0083", "Ã¢", "Ã ", "Æ°"]
for p in bad_patterns:
    if p in text:
        # show context
        idx = text.index(p)
        print("FOUND MOJIBAKE '" + p + "' at", idx, ":", repr(text[max(0,idx-10):idx+20]))

# Show key sections
print()
print("== Modal header/template section ==")
for line in text.split("\n"):
    line = line.strip()
    if line and any(kw in line for kw in ["label:", "desc:", "placeholder", "Tạo", "Tên", "Khách", "Deadline", "Ghi", "Không", "Dự án"]):
        if len(line) < 120:
            print(" ", line[:100])