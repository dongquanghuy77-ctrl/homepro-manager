# AUDIT ARCHITECTURE

## 1. MỤC ĐÍCH
Tất cả các hành động có tác động tới dữ liệu Nhạy cảm (Tài chính, Thông tin hợp đồng) hoặc có tính Pháp lý (Duyệt phép, Kỷ luật, Xóa dữ liệu) đều phải được hệ thống lưu vết (Audit Trail). Quá trình Audit là bất biến (Immutable), không một User nào, kể cả ADMIN được quyền XÓA (Delete) record trong bảng Audit.

## 2. CÁC ĐỐI TƯỢNG BẮT BUỘC CÓ AUDIT
Các Module sau bắt buộc phải được theo dõi Audit cho các hành động CREATE, UPDATE, DELETE, APPROVE, REJECT:
- `EMPLOYEE_PROFILE` (Thay đổi lương, thăng chức).
- `ATTENDANCE_CORRECTION` (HR sửa giờ chấm công thủ công).
- `LEAVE_APPROVAL` (Quyết định duyệt/từ chối phép).
- `PAYROLL_CALCULATION` (Chốt bảng lương).
- `PURCHASE_ORDER` (Duyệt mua vật tư).
- `INVENTORY_ADJUSTMENT` (Điều chỉnh tồn kho).
- `PROJECT_COST` (Khai báo chi phí dự án).
- `FINANCIAL_JOURNAL` (Các bút toán kế toán).

## 3. CẤU TRÚC AUDIT LOG
Mỗi một thao tác Audit sẽ được lưu vào bảng (Ví dụ: `hr_audit_logs`, hoặc bảng chung `system_audit_logs`):

```sql
TABLE audit_logs:
- id (PK)
- action (String: VD 'ATTENDANCE_CORRECTED')
- entity_type (String: 'attendance', 'payroll')
- entity_id (Integer)
- actor_id (FK -> users)
- actor_name (String - Chống việc User bị xóa làm mất tên)
- old_value (JSON string)
- new_value (JSON string)
- ip_address (String)
- created_at (Timestamp)
```

## 4. XỬ LÝ KHI DỮ LIỆU ĐỔI BỞI SYSTEM
Nếu hệ thống (CRON Job, Workflow tự động) thay đổi dữ liệu (Ví dụ: Quá hạn duyệt tự động Reject), `actor_id` sẽ được gán là `NULL`, và ghi chú thêm 'SYSTEM_CRON' vào log.
