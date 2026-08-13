# HOMEPRO DOCUMENT ARCHITECTURE

Tài liệu này định nghĩa cách hệ thống lưu trữ, phân loại và bảo mật các văn bản, chứng từ, giấy tờ (Document Center).

## 1. VẤN ĐỀ HIỆN TẠI
- Hồ sơ, chứng từ đang lưu rải rác dưới dạng URL text (ví dụ `attachment_url` trong bảng `leave_requests`).
- Khi cần quản lý vòng đời tài liệu (hết hạn, bảo mật, versioning) thì cấu trúc hiện tại không đáp ứng được.

## 2. THIẾT KẾ MỚI: DOCUMENT CENTER
Mọi tài liệu số phải được lưu tập trung trong bảng `documents`, phục vụ như một kho dữ liệu trung tâm. Các module khác liên kết tới tài liệu thông qua cơ chế đa hình (Polymorphism).

### Cấu trúc Bảng `documents`
- `id` (PK)
- `document_number`: Mã số văn bản (nếu có)
- `document_type`: Loại tài liệu (Hợp đồng LĐ, Giấy phép, Chứng từ thuế, Đơn xin nghỉ...)
- `owner_module`: Tên module sở hữu tài liệu này (Ví dụ: `HR`, `PROJECT`, `COMPANY`)
- `owner_record`: ID của bản ghi sở hữu (Polymorphic ID)
- `file_url`: Đường dẫn S3/Storage
- `version`: Phiên bản tài liệu
- `status`: Trạng thái (ACTIVE, EXPIRED, ARCHIVED)
- `issue_date`: Ngày ban hành
- `effective_date`: Ngày có hiệu lực
- `expiry_date`: Ngày hết hạn
- `confidentiality`: Mức độ bảo mật (PUBLIC, INTERNAL, RESTRICTED, STRICT)
- `uploaded_by`: Người tải lên
- `retention_policy`: Chính sách lưu trữ (ví dụ: giữ 5 năm sau khi hết hạn)

## 3. QUY TẮC LIÊN KẾT (LINKING RULES)
- **Company Documents:** Các giấy phép kinh doanh, điều lệ công ty sẽ có `owner_module = 'COMPANY'`.
- **Employee Documents:** Hợp đồng lao động, CMND/CCCD có `owner_module = 'EMPLOYEE'` và `owner_record = user_id`.
- **Project Documents:** Bản vẽ thiết kế, hợp đồng khách hàng có `owner_module = 'PROJECT'` và `owner_record = project_id`.

## 4. QUYỀN TRUY CẬP (ACCESS CONTROL)
- Người dùng chỉ được tải/xem tài liệu nếu RBAC cho phép họ đọc `owner_record` tương ứng (Ví dụ: Manager chỉ thấy hợp đồng của nhân viên thuộc phòng mình).
- Tài liệu có `confidentiality = STRICT` (Báo cáo thuế, Bảng lương) chỉ có quyền Admin hoặc Finance Director mới được truy cập.
