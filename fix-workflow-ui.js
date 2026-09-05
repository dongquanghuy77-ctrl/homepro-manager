const fs = require('fs');
let code = fs.readFileSync('src/components/pwr/station/StationWorkflowUI.tsx', 'utf8');

// The replacement script
const newWrapper = `
    <div style={{
      background: "#0f172a",
      backgroundImage: stationId === 'CNC' 
        ? "radial-gradient(circle at 50% 0%, rgba(168,85,247,0.15) 0%, transparent 70%), radial-gradient(circle at 100% 100%, rgba(59,130,246,0.1) 0%, transparent 50%)" 
        : stationId === 'DAN_CANH'
        ? "radial-gradient(circle at 50% 0%, rgba(16,185,129,0.15) 0%, transparent 70%), radial-gradient(circle at 100% 100%, rgba(5,150,105,0.1) 0%, transparent 50%)"
        : "radial-gradient(circle at 50% 0%, rgba(59,130,246,0.15) 0%, transparent 70%), radial-gradient(circle at 100% 100%, rgba(147,51,234,0.1) 0%, transparent 50%)",
      minHeight: "100vh",
      padding: 20,
      color: "white",
      fontFamily: "'Inter', sans-serif",
      position: "relative",
      overflow: "hidden"
    }}>
      <style dangerouslySetInnerHTML={{ __html: \`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        @keyframes spin { 0% { transform:rotate(0deg); } 100% { transform:rotate(360deg); } }
        .spinner { border:3px solid rgba(239,68,68,0.2); border-top:3px solid #ef4444; border-radius:50%; width:24px; height:24px; animation:spin 1s linear infinite; }
        .station-card {
          background: rgba(30, 41, 59, 0.75);
          backdrop-filter: blur(12px);
          border-radius: 16px;
          padding: 20px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.3);
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .station-card:hover { transform: translateY(-2px); }
      \`}} />
`;

code = code.replace(/<div style=\{\{\s*background:\s*"#09090b",\s*minHeight:\s*"100vh",\s*padding:\s*20\s*\}\}>[\s\S]*?`\}\}\s*\/>/, newWrapper);

// Change card styling
code = code.replace(/background: "rgba\(255,255,255,0\.02\)", border: "1px solid (#[0-9a-fA-F]+)", borderRadius: 16, padding: 20, position: "relative", overflow: "hidden"/g, 'className: "station-card", border: "1px solid $1", position: "relative", overflow: "hidden", padding: 20');

// Fix text contrasts
code = code.replace(/color: "#6b7280"/g, 'color: "#94a3b8"');
code = code.replace(/color: "#9ca3af"/g, 'color: "#cbd5e1"');
code = code.replace(/<p style=\{\{ fontSize: 13 \}\}>/g, '<p style={{ fontSize: 14, color: "#94a3b8" }}>');

fs.writeFileSync('src/components/pwr/station/StationWorkflowUI.tsx', code, 'utf8');
