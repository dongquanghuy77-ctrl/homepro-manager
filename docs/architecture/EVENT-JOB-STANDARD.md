# EVENT / JOB ARCHITECTURE STANDARD

## NGUYÊN TẮC THIẾT KẾ
Không thực hiện các chuỗi tác vụ dài đồng bộ. (VD: Không `Tạo PO -> Gửi Email -> Gọi API ERP -> Thông báo Slack` trong một HTTP Request duy nhất).
**Quy tắc:** Commit Database Transaction thành công -> Phát sinh Domain Event -> Chạy Async Job.

## CẤU TRÚC ABSTRACTION
1. **Bảng `domain_events`**: Lưu trữ các Event dưới dạng In-box / Out-box.
   - `eventName`: Tên sự kiện (VD: `PurchaseApproved`, `PayrollCalculated`).
   - `payload`: Thông tin JSON để xử lý.
   - `status`: `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`.
   
2. **Event Worker / Handler**:
   - Hệ thống có một Background Job / Cron quét định kỳ bảng `domain_events` với `status = PENDING`.
   - Lấy Event ra, chuyển sang `PROCESSING`, gọi Handler tương ứng.
   - Xử lý thành công -> `COMPLETED`.
   
3. **Retry & Dead Letter**:
   - Thất bại -> Tăng `retryCount`. Nếu `retryCount < 3`, giữ nguyên `PENDING` để retry vòng sau.
   - Vượt quá `retryCount` -> Đưa về `FAILED` (Dead Letter) để Admin kiểm tra log.

## DANH SÁCH DOMAIN EVENTS CHUẨN
- `AttendanceRecorded`
- `LeaveApproved`
- `PayrollCalculated`
- `PurchaseApproved`
- `GoodsReceived`
- `InventoryTransferred`
- `ProductionCompleted`
- `QCFailed`
- `CostUpdated`
