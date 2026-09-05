const fs = require('fs');
let code = fs.readFileSync('src/components/pwr/station/StationWorkflowUI.tsx', 'utf8');

// The file currently has garbled text like KH"N C P.
// Let's replace the whole block by finding the span.
const regex = /<span style=\{\{ fontSize: 13, color: task\.priority === "HIGH" \? "#ef4444" : "#fbbf24", fontWeight: 600 \}\}>[\s\S]*?<\/span>/;

const properBlock = <span style={{ fontSize: 13, color: task.priority === "HIGH" ? "#ef4444" : "#fbbf24", fontWeight: 600 }}>\n                      {task.priority === "HIGH" ? "🔴 KHẨN CẤP" : task.priority === "MEDIUM" ? "🟡 ƯU TIÊN" : "🟢 BÌNH THƯỜNG"}\n                    </span>;

code = code.replace(regex, properBlock);

// Also fix station ID block
const regex2 = /<Play size=\{24\} color="#34d399" fill="#34d399" \/> \{stationId[^}]+\}/;
const properTitle = '<Play size={24} color="#34d399" fill="#34d399" /> {stationId === "CNC" ? "Máy CNC" : stationId === "DAN_CANH" ? "Máy Dán Cạnh" : stationId === "KHOAN_CAM" ? "Máy Khoan Cam" : stationId}';
code = code.replace(regex2, properTitle);

fs.writeFileSync('src/components/pwr/station/StationWorkflowUI.tsx', code, 'utf8');