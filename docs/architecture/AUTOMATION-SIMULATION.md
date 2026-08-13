# PHASE 4 — AUTOMATION SIMULATION

## 1. MỤC TIÊU
Đánh giá tính khả thi và rủi ro kiến trúc khi đưa các Luồng Tự Động Hóa (Automation Workflows) vào hệ thống ERP HomePro Manager.

## 2. ĐÁNH GIÁ CÁC WORKFLOWS

### Workflow 1: BOQ -> Material Req -> Inventory Check -> Shortage -> Purchase Recommendation
- **Kiến trúc hiện tại**: Hệ thống có bảng `boq_items` (kế hoạch vật tư) và `materials` (tồn kho). 
- **Gap**: Hiện tại người dùng phải tự nhìn vào BOQ và tạo Purchase Order bằng tay.
- **Giải pháp Automation**: Viết cronjob hoặc Background Job chạy vào mỗi cuối ngày. Tính tổng (Sum `qty_required` của toàn bộ active BOQ) - (Sum `stock_qty`). Nếu < 0, tự động chèn record vào bảng `purchase_recommendations`.
- **Rủi ro (Risk)**: Duplicate Recommendation nếu hệ thống chạy 2 lần. Cần `Idempotency Key` theo dạng `[MaterialID]-[Date]`.

### Workflow 2: Purchase Order -> Goods Receipt -> Inventory -> Production
- **Kiến trúc hiện tại**: Chưa có bảng `purchase_orders` và `goods_receipts` chuẩn. Module Procurement đang gộp chung với logic của BOQ (có `qty_ordered`, `qty_received` trong `boq_items`). 
- **Gap & Risk**: Không thể tự động hóa tốt nếu luồng mua sắm dính chặt vào BOQ. Khi mua hàng không thuộc dự án (như văn phòng phẩm), hệ thống bị lỗi kiến trúc.
- **Giải pháp**: Tách bạch hoàn toàn bảng `purchase_orders` và `inventory_transactions`. Automation trigger khi PO được phê duyệt -> tự động push notification cho Kho (Warehouse) chuẩn bị nhận hàng.

### Workflow 3: Attendance -> Payroll -> Accounting
- **Kiến trúc hiện tại**: Đã có `attendance` và `monthly_payroll`.
- **Giải pháp Automation**: Trigger event vào ngày mùng 1 hàng tháng: Tự động tổng hợp `attendance` của tháng trước -> tạo bản nháp (DRAFT) `monthly_payroll` -> gởi email báo HR vào kiểm tra.
- **Rủi ro (Idempotency)**: Nếu HR bấm "Calculate" thủ công trong lúc Job đang chạy, bảng lương bị lưu đè 2 lần. Phải áp dụng Distributed Lock (Redis) hoặc DB Row Lock `FOR UPDATE SKIP LOCKED`.

### Workflow 4: QC Failure -> Issue -> Owner -> Verification -> Close
- **Kiến trúc hiện tại**: Bảng `qc_issues`.
- **Automation**: Khi một `qc_issues` có `severity = CRITICAL` được tạo, dùng Observer Pattern bắn event gởi email hoặc push notification cho Project Manager ngay lập tức. Nếu quá 48h chưa chuyển status sang `RESOLVED`, hệ thống tự động leo thang (Escalate) cho BGĐ.

## 3. EVENT-DRIVEN ARCHITECTURE (EDA) REQUIREMENT
Hệ thống Next.js hiện tại sử dụng request-response thuần túy. Để các Automation này hoạt động mà không làm chậm API (ví dụ: tạo PO phải chờ gởi xong 5 emails mới trả về success), **BẮT BUỘC** phải áp dụng mô hình Event-Driven hoặc Message Queue (như BullMQ kết hợp Redis, hoặc AWS SQS / Inngest) ở Giai đoạn Scale. Không thể dùng hàm `await sendEmail()` đồng bộ trong Route Handlers.
