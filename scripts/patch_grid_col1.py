import re

with open("src/components/pwr/kanban/PwrWbsView.tsx", "r", encoding="utf-8") as f:
    code = f.read()

old_button = """<button
                                    onClick={e => handleToggleDone(e, task)}"""
new_button = """{/* Column 1: Title Group */}\n                                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, overflow: 'hidden' }}>\n                                  <button
                                    onClick={e => handleToggleDone(e, task)}"""

code = code.replace(old_button, new_button)

old_close = """                                  </div>

                                  {/* Right side badges */}"""
new_close = """                                  </div>\n                                  </div>

                                  {/* Right side badges */}"""

code = code.replace(old_close, new_close)

with open("src/components/pwr/kanban/PwrWbsView.tsx", "w", encoding="utf-8") as f:
    f.write(code)

print("Title grouped into flex container!")