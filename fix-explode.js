const fs = require('fs');
let code = fs.readFileSync('src/app/api/pwr/ingestion/explode/route.ts', 'utf8');

// Fix CNC creation:
// status: cncStatus -> stationTeam: 'CNC'
code = code.replace(/status: cncStatus,/g, "status: cncStatus, stationTeam: 'CNC',");

// Fix Dán Cạnh creation:
// status: edgeStatus -> status: 'WAITING', stationTeam: 'DAN_CANH', waitingFor: 'Chờ CNC cắt xong',
code = code.replace(/status: edgeStatus, waitingFor: edgeWaitingReason/g, "status: 'WAITING', stationTeam: 'DAN_CANH', waitingFor: 'Chờ CNC cắt xong'");

// Fix Khoan Cam creation:
// status: 'TODO', -> status: 'WAITING', stationTeam: 'KHOAN_CAM', waitingFor: 'Chờ dán cạnh xong',
code = code.replace(/title: `\[KHOAN CAM\] Khoan (.*?)`,\s*description: (.*?),\s*category: 'PRODUCTION', priority: 'HIGH', status: 'TODO',/g, "title: `[KHOAN CAM] Khoan $1`,\n               description: $2,\n               category: 'PRODUCTION', priority: 'HIGH', status: 'WAITING',\n               stationTeam: 'KHOAN_CAM',\n               waitingFor: 'Chờ dán cạnh xong',");

fs.writeFileSync('src/app/api/pwr/ingestion/explode/route.ts', code, 'utf8');
