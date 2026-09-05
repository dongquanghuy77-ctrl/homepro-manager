const fs = require('fs');
let code = fs.readFileSync('src/components/pwr/station/HomeTabUI.tsx', 'utf8');

// Fix text strings
code = code.replace(/MY Kiosk QC/g, "Mở Kiosk QC");
code = code.replace(/Tin `T hA'm nay/g, "Tiến độ hôm nay");
code = code.replace(/Vic khcn cp \(_u tiAn cao\)/g, "Việc khẩn cấp (Ưu tiên cao)");
code = code.replace(/X LA\?/g, "Xử Lý");
code = code.replace(/ChAo bu i sAng/g, "Chào buổi sáng");
code = code.replace(/Ngh% tra thA'i/g, "Nghỉ trưa thôi");
code = code.replace(/ChAo bu i chi\?u/g, "Chào buổi chiều");
code = code.replace(/ChAo bu i t`i/g, "Chào buổi tối");
code = code.replace(/\?A b-t thA'ng bAo thAnh cA'ng!/g, "Đã bật thông báo thành công!");
code = code.replace(/KhA'ng th b-t thA'ng bAo. Vui lAng cp quy\?n trAn trAnh duyt\./g, "Không thể bật thông báo. Vui lòng cấp quyền trên trình duyệt.");
code = code.replace(/Th XYng/g, "Thợ Xưởng");
code = code.replace(/YAu c u x\s*lA ngay ` khA'ng t_c chuy\?n/g, "Yêu cầu xử lý ngay để không tắc chuyền");

fs.writeFileSync('src/components/pwr/station/HomeTabUI.tsx', code, 'utf8');
console.log('Fixed HomeTabUI');
