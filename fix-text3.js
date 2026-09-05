const fs = require('fs');
let code = fs.readFileSync('src/components/pwr/station/StationWorkflowUI.tsx', 'utf8');

const regex = /<span style=\{\{ fontSize: 13, color: task\.priority === "HIGH" \? "#ef4444" : "#fbbf24", fontWeight: 600 \}\}>[\s\S]*?<\/span>/;

const properBlock = \<span style={{ fontSize: 13, color: task.priority === "HIGH" ? "#ef4444" : "#fbbf24", fontWeight: 600 }}>
  {task.priority === "HIGH" ? "\uD83D\uDD34 KH\u1EA8N C\u1EA4P" : task.priority === "MEDIUM" ? "\uD83D\uDFE1 \u01AFU TI\u00CAN" : "\uD83D\uDFE2 B\u00CCNH TH\u01AF\u1EDCNG"}
</span>\;

code = code.replace(regex, properBlock);

const regex2 = /<Play size=\{24\} color="#34d399" fill="#34d399" \/> \{stationId[^}]+\}/;
const properTitle = '<Play size={24} color="#34d399" fill="#34d399" /> {stationId === "CNC" ? "Máy CNC" : stationId === "DAN_CANH" ? "Máy Dán Cạnh" : stationId === "KHOAN_CAM" ? "Máy Khoan Cam" : stationId}';
code = code.replace(regex2, properTitle);

fs.writeFileSync('src/components/pwr/station/StationWorkflowUI.tsx', code, 'utf8');