const fs = require('fs');
let code = fs.readFileSync('src/components/pwr/station/QcKioskUI.tsx', 'utf8');

const replacement = `return (
    <div className="app-container" style={{ minHeight: "100vh", position: "relative", fontFamily: "'Inter', sans-serif" }}>
      <style>{\`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        .app-container {
          background: url('https://images.unsplash.com/photo-1565152857467-932d433bce30?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80') center/cover no-repeat;
          position: relative;
        }
        .app-overlay {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 50% 30%, rgba(15, 10, 25, 0.8) 0%, rgba(5, 5, 10, 0.95) 100%);
          backdrop-filter: blur(10px);
          z-index: 0;
        }
        .qc-content {
          position: relative;
          z-index: 1;
          padding: 24px;
          color: #fff;
        }
      \`}</style>
      <div className="app-overlay" />
      <div className="qc-content">`;

code = code.replace(/return \(\s*<div style=\{\{ padding: 24, minHeight: "100vh", background: "#0a0a0f", color: "#fff" \}\}>/, replacement);
fs.writeFileSync('src/components/pwr/station/QcKioskUI.tsx', code, 'utf8');
