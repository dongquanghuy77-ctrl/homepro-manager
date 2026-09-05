const fs = require('fs');

function fixFile(file) {
  if (!fs.existsSync(file)) return;
  let code = fs.readFileSync(file, 'utf8');
  code = code.replaceAll("DAn C?nh", "Dán Cạnh");
  code = code.replaceAll("?A3ng GA3i", "Đóng Gói");
  code = code.replaceAll("MAy CNC", "Máy CNC");
  code = code.replaceAll("T C_t", "Tổ Cắt");
  code = code.replaceAll("T DAn", "Tổ Dán");
  code = code.replaceAll("T Khoan", "Tổ Khoan");
  code = code.replaceAll("Trang ch ", "Trang chủ ");
  code = code.replaceAll("Hng", "Hạng");
  code = code.replaceAll("Bo co", "Báo cáo");
  code = code.replaceAll("H S ", "Hồ Sơ ");
  code = code.replaceAll("Trm", "Trạm");
  
  // MobileStationClient specific
  code = code.replaceAll("Th XYng", "Thợ Xưởng");
  code = code.replaceAll("T  C_t", "Tổ Cắt");
  code = code.replaceAll("T  DAn", "Tổ Dán");
  
  fs.writeFileSync(file, code, 'utf8');
}

fixFile('src/components/pwr/station/MobileStationClient.tsx');
fixFile('src/components/pwr/station/StationWorkflowUI.tsx');
console.log('Fixed more UI files with replaceAll');
