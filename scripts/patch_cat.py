import re

with open("src/components/pwr/kanban/PwrWbsView.tsx", "r", encoding="utf-8") as f:
    code = f.read()

old_cat = """                      {/* ""?"? Category Pill Header ""?"? */}
                      <div
                        onClick={() => toggleCategory(projName, catKey)}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          padding: '5px 12px 5px 8px',
                          background: catStyle.bg,
                          border: `1px solid ${catStyle.color}30`,
                          borderRadius: 99, cursor: 'pointer',
                          marginBottom: 8, marginLeft: 4,
                          transition: 'opacity 0.2s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.opacity = '0.75'}
                        onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                      >
                        {isCatExp ? <ChevronDown size={13} color={catStyle.color} /> : <ChevronRight size={13} color={catStyle.color} />}
                        <CatIcon size={13} color={catStyle.color} />
                        <span style={{ fontSize: 12, fontWeight: 700, color: catStyle.color, letterSpacing: 0.3 }}>
                          {catStyle.label}
                        </span>
                        <span style={{ fontSize: 11, color: `${catStyle.color}90`, fontWeight: 500 }}>
                          {catDone}/{catTasks.length}
                        </span>
                      </div>"""

# Ensure unicode comments don't break regex
# I'll use regex to match from "onClick={() => toggleCategory(projName, catKey)}" up to "</div>" before "Level 3: Task Rows"
import re
pattern = r"\{/\*.*?Category Pill Header.*?\*/\}\s*<div\s*onClick=\{\(\) => toggleCategory\(projName, catKey\)\}.*?\{catDone\}/\{catTasks\.length\}\s*</span>\s*</div>"

new_cat = """{/* --- NEW CATEGORY HEADER --- */}
                      <div
                        onClick={() => toggleCategory(projName, catKey)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '10px 16px',
                          background: 'var(--color-surface-2)',
                          borderTop: '1px solid var(--color-border)',
                          borderBottom: '1px solid var(--color-border)',
                          cursor: 'pointer',
                          marginBottom: 0,
                        }}
                      >
                        {isCatExp ? <ChevronDown size={16} color="var(--color-text-muted)" /> : <ChevronRight size={16} color="var(--color-text-muted)" />}
                        <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-text)', letterSpacing: 0.5, textTransform: 'uppercase' }}>
                          {catStyle.label}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--color-text-muted)', background: 'var(--color-bg)', padding: '2px 8px', borderRadius: 12, fontWeight: 600 }}>
                          {catDone}/{catTasks.length} việc
                        </span>
                      </div>"""

code = re.sub(pattern, new_cat, code, flags=re.DOTALL)
with open("src/components/pwr/kanban/PwrWbsView.tsx", "w", encoding="utf-8") as f:
    f.write(code)

print("Category patched!")