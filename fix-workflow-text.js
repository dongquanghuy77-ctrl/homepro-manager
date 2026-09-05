const fs = require('fs');
let code = fs.readFileSync('src/components/pwr/station/StationWorkflowUI.tsx', 'utf8');

// Fix title display name
code = code.replace(
  /<Play size=\{24\} color="#34d399" fill="#34d399" \/> \{stationId\}/g,
  '<Play size={24} color="#34d399" fill="#34d399" /> {stationId === "CNC" ? "Máy CNC" : stationId === "DAN_CANH" ? "Máy Dán Cạnh" : stationId === "KHOAN_CAM" ? "Máy Khoan Cam" : stationId}'
);

// Fix unaccented words
code = code.replace(/Quay lai the chinh/g, 'Quay lại thẻ chính');
code = code.replace(/Dang cho:/g, 'Đang chờ:');
code = code.replace(/Hoan thanh:/g, 'Hoàn thành:');
code = code.replace(/Dang tai cong viec\.\.\./g, 'Đang tải công việc...');
code = code.replace(/Khong co cong viec nao!/g, 'Không có công việc nào!');
code = code.replace(/Manager chua giao task cho tram nay\./g, 'Quản đốc chưa giao việc cho trạm này.');
code = code.replace(/Han: /g, 'Hạn: ');
code = code.replace(/>Bat Dau</g, '>Bắt Đầu<');
code = code.replace(/>Hoan Thanh</g, '>Hoàn Thành<');
code = code.replace(/>Da hoan thanh</g, '>Đã hoàn thành<');
code = code.replace(/Bao loi vat tu/g, 'Báo lỗi vật tư');
code = code.replace(/Nhap ghi chu loi\.\.\./g, 'Nhập ghi chú lỗi...');
code = code.replace(/>Gui bao loi</g, '>Gửi báo lỗi<');
code = code.replace(/>Dang gui\.\.\.</g, '>Đang gửi...<');
code = code.replace(/>Dang nen anh\.\.\.</g, '>Đang nén ảnh...<');
code = code.replace(/\? Nhap So Luong Hoan Thanh/g, 'Nhập Số Lượng Hoàn Thành');
code = code.replace(/>san pham</g, '>sản phẩm<');
code = code.replace(/Xac Nhan Hoan Thanh/g, 'Xác Nhận Hoàn Thành');

// Fix priority icon ?? HIGH
code = code.replace(/\{task.priority === "HIGH" \? "\?\?" : task.priority === "MEDIUM" \? "\?\?" : "\?\?"\} \{task.priority\}/g, '{task.priority === "HIGH" ? "🔴 KHẨN CẤP" : task.priority === "MEDIUM" ? "🟡 ƯU TIÊN" : "🟢 BÌNH THƯỜNG"}');
code = code.replace(/\{task.priority === "CRITICAL" \? "\?\?" : task.priority === "HIGH" \? "\?\?" : task.priority === "MEDIUM" \? "\?\?" : "\?\?"\} \{task.priority\}/g, '{task.priority === "CRITICAL" ? "🔥 RẤT KHẨN CẤP" : task.priority === "HIGH" ? "🔴 KHẨN CẤP" : task.priority === "MEDIUM" ? "🟡 ƯU TIÊN" : "🟢 BÌNH THƯỜNG"}');

// Make sure to catch any remaining ??
code = code.replace(/\"\?\?\"/g, '"🔴"');

fs.writeFileSync('src/components/pwr/station/StationWorkflowUI.tsx', code, 'utf8');
