import sys, io, os, re
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

# =====================================================
# COMPREHENSIVE CROSS-CHECK: All PWR UI text labels
# =====================================================
CHECKS = [
    # File path, expected Vietnamese string, feature name
    ("src/components/pwr/kanban/PwrCreateProjectModal.tsx", "Tạo dự án mới",         "Modal: tieu de"),
    ("src/components/pwr/kanban/PwrCreateProjectModal.tsx", "Tên dự án",              "Modal: label ten"),
    ("src/components/pwr/kanban/PwrCreateProjectModal.tsx", "Không dùng template",    "Modal: template none"),
    ("src/components/pwr/kanban/PwrCreateProjectModal.tsx", "Dự án nhỏ",              "Modal: template light"),
    ("src/components/pwr/kanban/PwrCreateProjectModal.tsx", "Dự án vừa",              "Modal: template standard"),
    ("src/components/pwr/kanban/PwrCreateProjectModal.tsx", "Dự án lớn",              "Modal: template full"),
    ("src/components/pwr/kanban/PwrCreateProjectModal.tsx", "Deadline bàn giao",      "Modal: deadline label"),
    ("src/components/pwr/kanban/PwrCreateProjectModal.tsx", "Ghi chú",                "Modal: ghi chu"),
    ("src/components/pwr/kanban/PwrCreateOperationalModal.tsx", "Tạo việc vận hành",  "OpModal: tieu de"),
    ("src/components/pwr/kanban/PwrCreateOperationalModal.tsx", "Tiêu đề",            "OpModal: label"),
    ("src/components/pwr/kanban/PwrMyWorkCenter.tsx", "Công việc cá nhân",            "WorkCenter: header"),
    ("src/components/pwr/kanban/PwrMyWorkCenter.tsx", "Quá hạn",                      "WorkCenter: overdue"),
    ("src/components/pwr/kanban/PwrMyWorkCenter.tsx", "Hôm nay",                      "WorkCenter: today"),
    ("src/components/pwr/kanban/PwrWbsView.tsx", "Cấu trúc dự án",                    "WBS: title"),
    ("src/components/pwr/kanban/PwrKanbanClient.tsx", "Hộp thư",                      "Kanban: inbox"),
    ("src/components/pwr/kanban/PwrCalendarClient.tsx", "Lịch công việc",             "Calendar: title"),
    ("src/lib/pwr/constants.ts", "Hộp thư đến",                                       "Constants: INBOX label"),
    ("src/lib/pwr/constants.ts", "Đang làm",                                          "Constants: IN_PROGRESS"),
    ("src/lib/pwr/constants.ts", "Hoàn thành",                                        "Constants: DONE"),
    ("src/lib/pwr/constants.ts", "Khẩn cấp",                                          "Constants: CRITICAL"),
    ("src/lib/pwr/constants.ts", "Sản xuất",                                          "Constants: PRODUCTION"),
    ("src/components/pwr/tasks/PwrTaskForm.tsx", "Tiêu đề",                           "TaskForm: label"),
    ("src/components/pwr/tasks/PwrTaskDetailClient.tsx", "Lịch sử thay đổi",          "Detail: audit"),
    ("src/components/pwr/reports/PwrDailyReportClient.tsx", "Báo cáo hàng ngày",      "Report: daily title"),
    ("src/components/pwr/kanban/PwrVanHanhSection.tsx", "Vận Hành",                   "VanHanh: section"),
]

MOJIBAKE_PATTERNS = ["Ã¡", "Ã´", "Ã³", "Ã²", "Ä\u0083", "Ã¢", "á»", "Æ°", "Ä'"]

passed = 0
failed = 0

print("=== TEXT LABEL CHECKS ===")
for filepath, expected, feature in CHECKS:
    if not os.path.exists(filepath):
        print("  SKIP (missing file): " + feature)
        continue
    with open(filepath, "rb") as f:
        text = f.read().decode("utf-8", errors="replace")
    
    # Check expected text present
    has_text = expected in text
    # Check no mojibake
    has_mj = any(p in text for p in MOJIBAKE_PATTERNS)
    
    if has_text and not has_mj:
        passed += 1
        print("  PASS: " + feature)
    elif not has_text:
        failed += 1
        print("  FAIL (text missing): " + feature + " | expected: " + repr(expected))
    else:
        failed += 1
        print("  FAIL (mojibake): " + feature)

print()
print("=== MOJIBAKE SCAN (all PWR files) ===")
for root, dirs, files in os.walk("src"):
    # only pwr dirs
    dirs[:] = [d for d in dirs if "pwr" in d.lower() or root.endswith("pwr")]
    for fname in files:
        if not fname.endswith((".tsx", ".ts")): continue
        fp = os.path.join(root, fname)
        with open(fp, "rb") as f:
            text = f.read().decode("utf-8", errors="replace")
        if any(p in text for p in MOJIBAKE_PATTERNS):
            print("  STILL BROKEN: " + fp)
            failed += 1

print()
print("=== FINAL: %d PASS, %d FAIL ===" % (passed, failed))