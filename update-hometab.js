const fs = require('fs');
let c = fs.readFileSync('src/components/pwr/station/HomeTabUI.tsx', 'utf8');

const replaceStr = `        <div style={{ position: "relative", zIndex: 1 }}>`;
const newStr = `        <button onClick={() => window.location.href = '/pwr/station/qc'} style={{ position: 'absolute', top: 20, right: 20, zIndex: 2, background: 'rgba(52,211,153,0.1)', color: '#34d399', border: '1px solid rgba(52,211,153,0.3)', padding: '6px 12px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Mở Kiosk QC</button>
        <div style={{ position: "relative", zIndex: 1 }}>`;

c = c.replace(replaceStr, newStr);
fs.writeFileSync('src/components/pwr/station/HomeTabUI.tsx', c, 'utf8');
