# P12 DOCUMENT CENTER — FINAL REPORT

## 1. MỤC TIÊU
Xây dựng một Module Document Center tập trung (Single Source of Truth) để quản lý mọi file, hợp đồng, tài liệu nhân sự, hóa đơn, PO, và QC Record trên toàn hệ thống HomePro Manager, thay vì upload rải rác từng bảng.

## 2. KIẾN TRÚC & SCHEMA

Module được thiết kế với 2 bảng chính:
- `documents`: Chứa thông tin Metadata, Owner, Link (Polymorphic `entity_type` + `entity_id` để linh hoạt móc vào Project, BOQ, PO, Employee).
- `document_versions`: Hỗ trợ versioning, theo dõi ai update file và cho phép rollback hoặc tra cứu lịch sử sửa đổi (change logs).

## 3. RBAC & SECURITY
Document Center tuân thủ hoàn toàn ma trận phân quyền cốt lõi:
- **Employee**: Chỉ truy cập Document có `owner_id` là chính mình (ví dụ: Hợp đồng lao động, CCQĐ).
- **Manager**: Truy cập Document thuộc dự án do mình quản lý hoặc Document của nhân viên thuộc `department` của mình.
- **HR**: Truy cập mọi Document thuộc thư mục `EMPLOYEE` hoặc liên quan tới nhân sự.
- **Accountant**: Truy cập mọi Document thuộc thư mục `CONTRACT`, `ACCOUNTING`, `PO`.
- **Admin**: Truy cập toàn bộ hệ thống.
Tất cả các truy vấn danh sách đều được filter cứng tại DB layer.

## 4. INTEGRATION
- Bất kỳ module nào (như Leave Request cần xin đính kèm giấy khám bệnh, hoặc QC Issue cần upload ảnh lỗi) đều gọi trực tiếp Document Service để upload và nhận về `document_id`.

## 5. KẾT LUẬN & CHUYỂN PHASE
- **SCHEMA**: Hoàn tất (`documents`, `document_versions`).
- **RBAC**: Thiết kế chặt chẽ, không bị IDOR.
- **VERSIONING**: Tích hợp sẵn `latest_version`.

**P12 Document Center đã được thiết kế và tích hợp vào Core Schema thành công. Tự động chuyển sang Phase P13 (Real Project Pilot).**
