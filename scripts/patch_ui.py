import re

with open("src/components/pwr/kanban/PwrWbsView.tsx", "r", encoding="utf-8") as f:
    code = f.read()

# 1. Colors replacement
color_map = {
    r"'rgba\(15,23,42,0\.6\)'": "'var(--color-surface)'",
    r"'#0f172a'": "'var(--color-surface)'",
    r"'rgba\(255,255,255,0\.07\)'": "'var(--color-border)'",
    r"'rgba\(255,255,255,0\.08\)'": "'var(--color-border)'",
    r"'rgba\(255,255,255,0\.05\)'": "'var(--color-border)'",
    r"'rgba\(255,255,255,0\.025\)'": "'var(--color-surface-2)'",
    r"'rgba\(255,255,255,0\.06\)'": "'var(--color-surface-3)'",
    r"'rgba\(255,255,255,0\.12\)'": "'var(--color-border-light)'",
    r"'#475569'": "'var(--color-text-muted)'",
    r"'#64748b'": "'var(--color-text-muted)'",
    r"'#94a3b8'": "'var(--color-text-secondary)'",
    r"'#f1f5f9'": "'var(--color-text)'",
    r"'#334155'": "'var(--color-text-disabled)'",
}

for old, new in color_map.items():
    code = re.sub(old, new, code)

# 2. Add Table Header before tasks map
header_ui = """
                      {/* --- DATA TABLE HEADER --- */}
                      {isCatExp && (
                        <div style={{
                          display: 'grid', gridTemplateColumns: 'minmax(200px, 4fr) 2fr 1fr 1fr 1fr', gap: 12,
                          padding: '8px 14px 8px 30px',
                          fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase',
                          borderBottom: '1px solid var(--color-border)', marginBottom: 4
                        }}>
                          <div>Tên công việc</div>
                          <div>Tiến độ</div>
                          <div>Hạn chót</div>
                          <div style={{ textAlign: 'center' }}>Ưu tiên</div>
                          <div style={{ textAlign: 'right' }}>Trạng thái</div>
                        </div>
                      )}
                      
                      {/* "?"? Level 3: Task Rows "?"? */}
"""
code = code.replace("{/* \"?\"? Level 3: Task Rows \"?\"? */}", header_ui)

# 3. Change Task Row from flex to Grid
task_row_old = """                                    display: 'flex', alignItems: 'center', gap: 12,
                                    padding: '9px 14px',"""
task_row_new = """                                    display: 'grid', gridTemplateColumns: 'minmax(200px, 4fr) 2fr 1fr 1fr 1fr', gap: 12, alignItems: 'center',
                                    padding: '6px 14px',"""
code = code.replace(task_row_old, task_row_new)

# 4. Remove flex: 1 from title to fit grid
title_old = "div style={{ flex: 1, minWidth: 0 }}>"
title_new = "div style={{ display: 'flex', gap: 8, alignItems: 'center', minWidth: 0 }}>"
code = code.replace(title_old, title_new)

# 5. Right side badges to grid columns
right_side_old = "div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>"
right_side_new = "div style={{ display: 'contents' }}>"
code = code.replace(right_side_old, right_side_new)

with open("src/components/pwr/kanban/PwrWbsView.tsx", "w", encoding="utf-8") as f:
    f.write(code)

print("PwrWbsView patched!")