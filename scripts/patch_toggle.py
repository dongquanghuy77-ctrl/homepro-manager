import re

with open("src/components/pwr/kanban/PwrWbsView.tsx", "r", encoding="utf-8") as f:
    code = f.read()

# Add Moon/Sun to imports
import_old = "import { useState, useEffect } from 'react';"
import_new = "import { useState, useEffect } from 'react';\nimport { Sun, Moon } from 'lucide-react';"
code = code.replace(import_old, import_new)

# Add Toggle state & button inside PwrWbsView
toggle_logic = """
  const [theme, setTheme] = useState<'dark'|'light'>('dark');
  useEffect(() => {
    const t = localStorage.getItem('pwr-theme') || 'dark';
    setTheme(t as 'dark'|'light');
    document.documentElement.setAttribute('data-theme', t);
  }, []);
  const toggleTheme = () => {
    const n = theme === 'dark' ? 'light' : 'dark';
    setTheme(n);
    localStorage.setItem('pwr-theme', n);
    document.documentElement.setAttribute('data-theme', n);
  };
"""

state_block = "  const [pendingIds,   setPendingIds]   = useState<Set<number>>(new Set());"
code = code.replace(state_block, state_block + "\n" + toggle_logic)

button_ui = """
      {/* --- THEME TOGGLE --- */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button onClick={toggleTheme} style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px',
          background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8,
          color: 'var(--color-text)', cursor: 'pointer', fontSize: 12, fontWeight: 600
        }}>
          {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          {theme === 'dark' ? 'Giao diện Sáng' : 'Giao diện Tối'}
        </button>
      </div>
      
      {/* Empty State */}
"""
code = code.replace("{/* \"?\"?\"? Empty State \"?\"?\"? */}", button_ui)
# Note: due to unicode comments, I should use a more stable anchor.
code = code.replace("{/* ─── Empty State ─── */}", button_ui)
code = code.replace("{/* \u2500\u2500\u2500 Empty State \u2500\u2500\u2500 */}", button_ui)

with open("src/components/pwr/kanban/PwrWbsView.tsx", "w", encoding="utf-8") as f:
    f.write(code)

print("Toggle patched!")