# ARCHITECTURE GATE 2 VALIDATION

Tài liệu này xác nhận việc tuân thủ các nguyên tắc thiết kế trước khi bắt tay vào code các module tiếp theo, đặc biệt là Company Master.

## 1. MỤC TIÊU CỦA GATE 2
- Đảm bảo 100% tuân thủ Single Source of Truth (SSOT).
- Chặn đứng tình trạng duplicate data, copy data sang bảng tạm.
- Không cho phép phát triển module theo kiểu "làm giao diện trước, data tính sau".
- Quy hoạch lại dòng chảy tài chính (Financial Flow) rõ ràng, tuyệt đối không cho module vận hành tự định nghĩa hạch toán.

## 2. CHECKLIST KIỂM TRA ĐỒNG BỘ
- [x] Đã xác định Master Data Ownership (xem `MASTER_DATA_OWNERSHIP.md`).
- [x] Đã thiết lập Dependency Graph chuẩn (xem `DEPENDENCY_GRAPH.md`).
- [x] Đã xác định Financial Ownership (xem `FINANCIAL_OWNERSHIP.md`).
- [x] Quy hoạch lại Document Center (Sẽ liên kết bằng Polymorphic UUID hoặc Code).
- [x] Audit Requirements: Bắt buộc áp dụng `hr_audit_logs` (hiện tại) và `system_audit_logs` (tương lai) cho các Master Data và Transaction Data thay đổi trạng thái.

## 3. NGUYÊN TẮC BẢO VỆ MODULE HIỆN TẠI
- **P0.14 (Attendance)** & **P0.18 (Leave)**: Không được sửa logic duyệt, không được sửa schema hiện hành (`attendance`, `leave_requests`).
- **Auth & RBAC**: Tiếp tục sử dụng `users` và `manager_departments`. Mọi API mới của Company Master phải dùng `requireAuth()` và validate Role (`ADMIN` hoặc người được cấp quyền).

## 4. KẾT LUẬN GATE 2
Hệ thống ĐẠT TIÊU CHUẨN để tiến hành triển khai **COMPANY MASTER**. Mọi bảng mới (Company, CompanyBankAccount, CompanyLegalProfile) sẽ được xây dựng xoay quanh nguyên tắc SSOT và làm gốc (Master) cho các module Finance/HR sau này.
