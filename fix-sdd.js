const fs = require('fs');
let c = fs.readFileSync('C:/Users/HP/.gemini/antigravity/brain/ea4d8fba-c994-4165-ae65-b33fe4cb7e51/sdd_urgent_tasks.md', 'utf8');

c = c.replace(/## 5. Cần Xác nhận từ User[\s\S]*$/, `## 5. Quyết định Vận hành (Chốt từ User)
> [!NOTE]
> **Quyết định:** Lệnh Bù Vật Tư / Rework (Khẩn cấp) sẽ được giao lại THẲNG cho người thợ làm hỏng để họ tự sửa.
> **Thuật toán Routing áp dụng:** Khi QC đánh Fail và báo Rework, hệ thống sẽ tự động sinh một Task ưu tiên CRITICAL và gán (assign) thẳng về User ID của người thợ vừa thi công công đoạn đó.
`);

fs.writeFileSync('C:/Users/HP/.gemini/antigravity/brain/ea4d8fba-c994-4165-ae65-b33fe4cb7e51/sdd_urgent_tasks.md', c, 'utf8');
