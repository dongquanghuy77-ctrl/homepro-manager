# DOCUMENT ARCHITECTURE

## 1. TỔNG QUAN
Document Center không phải là một ổ cứng chứa file (như Google Drive) với cấu trúc thư mục lộn xộn. Nó là một kho lưu trữ tập trung, trong đó mỗi **Tài liệu (Document)** là một Business Entity (Thực thể nghiệp vụ) được ràng buộc với dữ liệu Master Data và Transaction Data.

## 2. CẤU TRÚC PHÂN LOẠI (TAXONOMY)
Tài liệu được phân loại theo phòng ban và loại tài liệu, không phân chia ngẫu nhiên:

```text
Company
├── Legal (GPKD, Giấy tờ sở hữu, Bằng sáng chế)
├── HR (Hợp đồng lao động, Quyết định bổ nhiệm, Hồ sơ xin việc, Đơn từ y tế)
├── Contracts (Hợp đồng kinh tế Khách hàng, Hợp đồng Nhà cung cấp)
├── Accounting (Chứng từ, Phiếu Thu/Chi, Bảng kê)
├── Tax (Báo cáo thuế, Hóa đơn GTGT)
├── Bank (Sao kê, Séc, UNC)
├── Projects (Bản vẽ thiết kế, Bản vẽ thi công, Nhật ký công trình)
├── Purchasing (PO pdf, Báo giá NCC)
├── Warehouse (Phiếu nhập kho, Phiếu xuất kho ký nhận)
├── Production (Lệnh sản xuất, BOM PDF)
├── QC (Biên bản nghiệm thu, Báo cáo lỗi)
└── Audit (Biên bản họp, Thanh tra)
```

## 3. DOCUMENT METADATA (CƠ SỞ DỮ LIỆU TÀI LIỆU)
Mỗi file tải lên đều được lưu dưới dạng một Record trong bảng `documents`.
Không sử dụng filesystem truyền thống cho logic nghiệp vụ.

```sql
TABLE documents:
- document_id (PK)
- document_type (FK -> document_types)
- owner_module (enum: 'HR', 'PROJECT', 'ACCOUNTING'...)
- entity_type (e.g. 'project', 'employee', 'leave_request')
- entity_id (FK tới bảng cụ thể, linh hoạt)
- title (Tên tài liệu)
- file_url (Đường dẫn S3/GCP)
- status (DRAFT | PENDING_APPROVAL | APPROVED | ARCHIVED)
- version (1.0, 1.1, 2.0)
- created_by (FK -> users)
- approved_by (FK -> users)
- effective_date (Ngày hiệu lực)
- expiry_date (Ngày hết hạn - dùng cảnh báo)
- confidentiality (PUBLIC | INTERNAL | CONFIDENTIAL | STRICT)
- audit_log (Lịch sử view/download dạng JSON)
```

## 4. TÍCH HỢP XUYÊN SUỐT (CROSS-MODULE INTEGRATION)
- **Employee Profile**: Khi vào hồ sơ nhân viên, module HR query `documents` where `entity_type = 'employee' AND entity_id = emp.id` để lấy ra Hợp đồng lao động, Bằng cấp.
- **Leave Request**: Khi xem đơn xin nghỉ ốm, tự động hiển thị Giấy khám bệnh (Document).
- **Phân quyền tự động**: Quyền xem Document được thừa kế từ quyền truy cập Entity gốc. Nếu một người không có quyền xem Project A, họ sẽ tự động bị chặn quyền Download các bản vẽ thuộc Project A.
