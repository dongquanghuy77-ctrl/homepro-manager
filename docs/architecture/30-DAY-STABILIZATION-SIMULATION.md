# PHASE 1 — 30-DAY STABILIZATION SIMULATION

## 1. MÔ PHỎNG NGÀY 1–7 (VẬN HÀNH BÌNH THƯỜNG)
**Phát hiện (Findings):**
- **UX/Workflow**: Các thao tác duyệt nghỉ phép, overtime và duyệt BOQ hiện đang đòi hỏi phải vào từng trang riêng biệt. Thiếu một "Unified Inbox" để duyệt hàng loạt.
- **Data Flow**: Việc tạo QC Issue đôi khi yêu cầu nhập lại Project/Task dù bối cảnh (context) đã ở trong Task đó. 
- **API Performance**: API lấy danh sách `attendance` trong 1 tháng của 1 phòng ban khá nặng do thực hiện quá nhiều JOIN và parse JSON.
- **Inconsistency Risk**: Nếu một nhân viên (Worker) đổi bộ phận (Department) vào giữa tháng, bảng chấm công và luồng duyệt có thể bị sai lệch người quản lý do `users.departmentId` bị update overwrite, dẫn đến quản lý cũ mất quyền duyệt dữ liệu đầu tháng. (P1 Risk).

## 2. MÔ PHỎNG NGÀY 8–15 (TẢI 100 USERS ĐỒNG THỜI)
**Phát hiện (Findings):**
- **Concurrent DB Connections**: Với 100 users liên tục click vào Dashboard, Next.js sinh ra hàng loạt connection tới PostgreSQL. Nếu không cấu hình Connection Pooling (PgBouncer) chuẩn xác, DB dễ bị cạn kiệt connection (P0 Risk).
- **Dashboard Load**: Truy vấn tính KPI toàn công ty quét qua toàn bộ bảng `work_logs`, `costs`, `boq_items`. Dù có Index, thời gian phản hồi API Dashboard tăng vọt lên > 1-2 giây.
- **RBAC Check Overhead**: Việc check permissions và `manager_departments` thực hiện lặp đi lặp lại ở mỗi API call thay vì được cache ở session (P2 Risk).

## 3. MÔ PHỎNG NGÀY 16–23 (MÔ PHỎNG LỖI)
**Phát hiện (Findings):**
- **Duplicate Requests**: Double-click vào nút "Duyệt đơn" (Approve Leave) hoặc "Chốt công" tạo ra 2 bản ghi `leave_approvals` hoặc chạy logic trừ phép 2 lần. Cần cơ chế **Idempotency** (như đã thiết kế ở `attendance` qua `idempotency_key`) cho TẤT CẢ các thao tác POST/PUT quan trọng (P0 Risk).
- **Partial Transaction**: Khi duyệt Payroll, nếu ghi vào `monthly_payroll` thành công nhưng lỗi khi bắn thông báo/trigger hạch toán kế toán, dữ liệu bị lệch (P1 Risk).
- **Network Failure**: Mobile App/Web trên điện thoại thợ xưởng (Worker) mất mạng khi bấm nút Check-in, do cơ chế offline sync (`isOfflineSync`) chỉ giới hạn lưu ở LocalStorage, thiếu cơ chế push retry đáng tin cậy.

## 4. MÔ PHỎNG NGÀY 24–30 (BẢO TRÌ & DEPLOYMENT)
**Phát hiện (Findings):**
- **Backup & Restore**: Dump CSDL chạy bình thường. Tuy nhiên, nếu restore lại, file đính kèm trên Document Center (lưu ở local filesystem hoặc third-party storage) có thể bị mất sync (mất file thực tế nhưng DB vẫn còn link). Cần cơ chế Soft Delete và Transactional File System (P2 Risk).

## 5. PHÂN LOẠI RỦI RO ĐỀ XUẤT SỬA CHỮA
- **[P0 = Critical]**: Thiếu Idempotency key ở các luồng Duyệt/Tạo dữ liệu tài chính/phép. Nguy cơ duplicate data.
- **[P0 = Critical]**: Thiếu Connection Pooling khi scale số lượng lớn concurrent users.
- **[P1 = High]**: Thay đổi Master Data (Employee Department) làm hỏng historical RBAC (cấp quản lý cũ không xem được dữ liệu cũ).
- **[P1 = High]**: Partial Transactions ở các luồng nghiệp vụ chéo (Payroll -> Accounting).
- **[P2 = Medium]**: API Dashboard chậm, cần caching/materialized views.
- **[P3 = Low]**: Thiếu Unified Inbox.
