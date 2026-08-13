# MASTER ROADMAP SIMULATION FINAL REPORT

## 1. TRẢ LỜI CÁC CÂU HỎI KIẾN TRÚC

**1. HomePro hiện tại đã sẵn sàng đến đâu?**
Hệ thống sẵn sàng ở mức độ triển khai cho MỘT doanh nghiệp (In-house ERP) với quy mô dưới 50 nhân sự và 1 kho vật tư. Cấu trúc Database rất tốt ở mảng Nhân sự và Sản xuất cơ bản.

**2. Điểm yếu kiến trúc lớn nhất là gì?**
Sự gắn kết cứng (Tight Coupling) giữa các module (ví dụ Payroll gọi thẳng vào DB của Project/Cost). Thiếu kiến trúc Event-Driven (EDA) khiến luồng xử lý đồng bộ dễ đứt gãy nếu dữ liệu lớn.

**3. Database có cần thay đổi không?**
CÓ. Bắt buộc tách bảng `suppliers`, tách cấu trúc `inventory_balances` theo từng Kho (`warehouse_id`) thay vì gắn cứng vào danh mục `materials`.

**4. Có master data nào bị duplicate không?**
Hầu như không. Hệ thống đã chuẩn hóa `users` làm Single Source of Truth cho Employee. Tuy nhiên thông tin Khách hàng, NCC có dấu hiệu phân mảnh ở dạng text.

**5. Có module nào đang làm sai ownership không?**
Module Procurement (Mua sắm) đang bị gộp chung vào BOQ (Dự toán dự án) thông qua trường `qty_ordered` trong `boq_items`. Làm mất khả năng mua sắm văn phòng phẩm hoặc vật tư không thuộc dự án.

**6. Có cần event-driven architecture không?**
CÓ. Đặc biệt cho luồng duyệt song song, gửi thông báo, và kích hoạt Automation.

**7. Có cần queue/background jobs không?**
CÓ. Cực kỳ cần thiết cho việc tính lương (Payroll), tổng hợp chi phí dự án (Costing) và gửi thông báo/cảnh báo (Alerts). Không thể chạy các tác vụ này đồng bộ trên luồng Request/Response của Next.js.

**8. Dashboard hiện tại có đủ làm Control Tower không?**
CHƯA. Dashboard hiện tại báo cáo số liệu tốt nhưng thiếu bảng lưu trữ trạng thái Cảnh báo (Action Center Persisted Alerts). Giám đốc xem xong không có công cụ gán việc xử lý rủi ro (assign task based on alert).

**9. Automation nào nên làm trước?**
Luồng tự động sinh Cảnh báo thiếu vật tư (Shortage Detection) dựa trên tồn kho và Lệnh sản xuất.

**10. AI nào thực sự đáng tiền?**
"Cost Anomaly Detection" (Phát hiện chi phí bất thường) và "Project Risk Prediction" (Cảnh báo trễ hạn dự án). Các AI dạng Chatbot (Copilot) nên làm sau cùng.

**11. Có thể scale lên 100 users / 100 projects không?**
ĐƯỢC. Nhưng phải bổ sung Connection Pooling (PgBouncer) và Redis Cache, đồng thời xử lý triệt để bài toán Đa kho (Multi-warehouse) và tổ chức chi nhánh.

**12. Có thể chuyển thành SaaS không?**
KHÔNG. Kiến trúc hiện hành chưa hỗ trợ Multi-Tenant. Việc chuyển thành SaaS đòi hỏi đại tu toàn bộ Schema (thêm `tenant_id` + Row-Level Security) và hạ tầng.

**13. Điểm nào phải sửa TRƯỚC khi scale?**
- Tách `inventory_balances (warehouse_id, material_id, qty)`.
- Áp dụng Idempotency Key cho các tác vụ ghi dữ liệu (đã có ở `attendance`, cần áp dụng cho BOQ, PO, Payroll).
- Bổ sung Caching cho Dashboard.

**14. Điểm nào có thể để sau?**
AI Chatbot, App di động chuyên sâu (Native App), Chuyển sang mô hình SaaS.

---

## 2. PRIORITY MATRIX (MA TRẬN ƯU TIÊN KIẾN TRÚC)

| Priority | NOW (Trước khi Scale) | NEXT (6-12 Tháng) | LATER (Tương lai) | DO NOT BUILD |
| :--- | :--- | :--- | :--- | :--- |
| **CRITICAL** | Tách Multi-Warehouse DB. Bổ sung Idempotency. | Event-Driven / Message Queue. | Multi-tenant RLS (nếu làm SaaS). | Data Warehouse riêng biệt (thừa thãi). |
| **HIGH** | Connection Pooling (PgBouncer). | Tách `Purchase Orders` độc lập khỏi `boq_items`. | Phân chia Micro-frontends/Packages. | AI tự động đổi dữ liệu tài chính. |
| **MEDIUM** | Cache Dashboard KPI. Bảng `system_alerts`. | Module Quản lý Nhà cung cấp (Suppliers). | Máy học Dự báo thời gian hoàn thành. | Module Chấm công nhận diện khuôn mặt (Dùng thiết bị ngoài tốt hơn). |
| **LOW** | Unified Inbox để duyệt đơn. | Tích hợp chữ ký số vào Document Center. | AI Management Copilot. | Thay thế Next.js bằng Framework khác. |

---

## 3. FINAL DECISION ENGINE

1. **KEEP**: Toàn bộ kiến trúc HR (Attendance, Leave, Payroll). Logic Single Source of Truth của `users`.
2. **REFACTOR**: Cấu trúc Inventory (tách kho). Luồng Mua sắm (tách Purchase Order khỏi BOQ). 
3. **CONSOLIDATE**: Các truy vấn Dashboard (Chuyển sang cơ chế Materialized Views hoặc Aggregation Cronjobs thay vì Realtime Queries).
4. **AUTOMATE**: Cảnh báo rủi ro (Risk Alerts), Cảnh báo thiếu hụt vật tư.
5. **DEPRECATE**: Tính toán chi phí trực tiếp trên giao diện Client.
6. **REPLACE**: Cơ chế Request-Response đồng bộ bằng Message Queue cho các luồng xử lý nặng.
7. **DEFER**: AI Chatbot, Scale lên SaaS Multi-tenant (Tạm hoãn).
8. **DO NOT BUILD**: Trí tuệ nhân tạo (AI) có quyền thay đổi dữ liệu tài chính/nhân sự mà không qua phê duyệt của con người.

---

## 4. KẾT LUẬN TRẠNG THÁI (FINAL STATE)

### TRẠNG THÁI: YELLOW

**Giải thích:**
Hệ thống HomePro Manager hiện tại (P15) đã vượt qua bài test vận hành Single-Company xuất sắc và có nền tảng Master Data rất chuẩn. 
Tuy nhiên, để bước sang các giai đoạn tiếp theo trong Master Roadmap (ERP Control Tower, Automation, Scale), hệ thống chứa một số Architecture Debt (Nợ kiến trúc) quan trọng cần giải quyết ngay:
1. Thiếu cơ chế Multi-warehouse.
2. Tight-coupling giữa Procurement và BOQ.
3. Thiếu Idempotency key ở các tác vụ tài chính.
4. Chưa có Event-Driven Architecture (Message Queue) để xử lý Automation.

**Quyết định**: 
Có thể tiếp tục triển khai, NHƯNG phải thực hiện việc REFACTOR các hạng mục thuộc nhóm **NOW (CRITICAL/HIGH)** trước khi xây thêm bất kỳ Module nghiệp vụ lớn nào khác. Không được ép mã nguồn hiện tại chạy thành mô hình SaaS.
