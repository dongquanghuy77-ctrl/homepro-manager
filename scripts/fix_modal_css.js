const fs = require('fs');

let css = fs.readFileSync('src/styles/globals.css', 'utf8');

const target = `.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
  animation: fadeIn 0.2s ease;
}

.modal {
  background: var(--color-surface);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-xl);
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: var(--shadow-lg);
  animation: slideUp 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}`;

const replacement = `.modal-overlay,
.modal-backdrop {
  position: fixed !important;
  inset: 0 !important;
  background: rgba(0, 0, 0, 0.75) !important;
  backdrop-filter: blur(5px) !important;
  z-index: 99999 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  padding: var(--space-4) !important;
  animation: fadeIn 0.2s ease;
}

.modal {
  position: relative !important;
  z-index: 100000 !important;
  background: var(--color-surface);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-xl);
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 25px 80px rgba(0, 0, 0, 0.8);
  animation: slideUp 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}`;

if (css.includes(target)) {
  css = css.replace(target, replacement);
  fs.writeFileSync('src/styles/globals.css', css, 'utf8');
  console.log('✅ Replaced modal z-index in globals.css successfully!');
} else {
  console.log('⚠️ Target string not found in globals.css');
}
