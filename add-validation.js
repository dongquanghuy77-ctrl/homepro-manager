const fs = require('fs');
let code = fs.readFileSync('src/components/pwr/manager/ManagerKanbanBoard.tsx', 'utf8');

const dropRegex = /const handleDrop = async \(e: React\.DragEvent, targetStationId: StationId\) => \{[\s\S]*?const stationConfig = STATIONS\.find\(s => s\.id === targetStationId\);/m;

const validationCode = `const handleDrop = async (e: React.DragEvent, targetStationId: StationId) => {
    e.preventDefault();
    const taskIdStr = e.dataTransfer.getData('text/plain');
    if (!taskIdStr) return;
    const taskId = parseInt(taskIdStr, 10);
    const taskToMove = tasks.find(t => t.id === taskId);

    const stationConfig = STATIONS.find(s => s.id === targetStationId);

    // RAO CHAN QA 2: Chong keo nham tram
    if (taskToMove && targetStationId !== 'INBOX') {
      const titleLower = taskToMove.title.toLowerCase();
      let expectedStation = null;
      if (titleLower.includes('[cnc]')) expectedStation = 'CNC';
      else if (titleLower.includes('[dán cạnh]') || titleLower.includes('[dan canh]')) expectedStation = 'DAN_CANH';
      else if (titleLower.includes('[khoan cam]')) expectedStation = 'KHOAN_CAM';
      else if (titleLower.includes('mua hàng') || titleLower.includes('khẩn cấp')) expectedStation = 'PURCHASING'; // Not a valid machine

      if (expectedStation && expectedStation !== targetStationId) {
        alert(\`Lỗi vận hành: Công việc này thuộc về \${expectedStation} nhưng bạn lại kéo vào \${targetStationId}. Hệ thống từ chối thao tác để tránh lỗi sản xuất!\`);
        setDraggedTaskId(null);
        return;
      }
    }`;

code = code.replace(dropRegex, validationCode);
fs.writeFileSync('src/components/pwr/manager/ManagerKanbanBoard.tsx', code, 'utf8');
