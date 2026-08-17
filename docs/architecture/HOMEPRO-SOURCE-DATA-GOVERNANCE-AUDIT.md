# HOMEPRO SOURCE DATA GOVERNANCE AUDIT
*Date: 2026-08-17*

## 1. MỤC TIÊU
Đảm bảo tính trọn vẹn của dữ liệu gốc trong toàn bộ vòng đời của hệ thống (Source Data Center → Staging → ERP). Mọi file, dòng dữ liệu, thiết kế phải được lưu trữ bất biến và có khả năng truy xuất ngược (Data Lineage) 100%.

## 2. HIỆN TRẠNG (AS-IS)
- Hệ thống database đang chạy với 105 tables trên Neon PostgreSQL.
- Dữ liệu ERP được lưu trữ tốt nhưng thiếu sự liên kết chặt chẽ với file gốc (ví dụ file báo giá BOQ, file PDF bản vẽ thiết kế).
- Thiếu các bảng quản trị Data Lineage để phục vụ kiểm toán (Audit).
- Tình trạng: Nguy cơ "black box" - dữ liệu có trong ERP nhưng không biết nguồn gốc từ đâu nếu có tranh chấp, sai sót cần đối chiếu.

## 3. KIẾN TRÚC MỚI (TO-BE: 4-TIER ARCHITECTURE)
Để khắc phục vấn đề trên, kiến trúc dữ liệu được nâng cấp thành 4 tầng bắt buộc:

1. **SOURCE DATA CENTER (Bất biến)**
   - Lưu trữ nguyên trạng các file (BOQ Excel, PDF, SKP, JPG).
   - Bảng `source_documents` làm sổ cái trung tâm (registry).
   - Phân rã dữ liệu thô thành `source_document_lines` (dòng 1, 2, 3... trong file Excel).

2. **STAGING AREA (Kiểm duyệt)**
   - Dữ liệu đã trích xuất, phân loại nhưng chưa vào ERP được lưu tại `staging_records`.
   - Nơi diễn ra các thao tác Manual Review / Human-in-the-loop đối với dữ liệu Confidence < 100%.
   - Xử lý xung đột (conflict resolution), map mã vật tư (material mapping), nhà cung cấp.

3. **MASTER DATA (Danh mục chuẩn)**
   - Các thực thể chuẩn (Materials, Suppliers, Customers, Projects).
   - Dữ liệu Staging sẽ được map vào các thực thể này.

4. **TRANSACTION DATA (Nghiệp vụ)**
   - Dữ liệu ERP vận hành (Purchase Orders, GRN, Production Tasks, Payroll).
   - Mọi transaction bắt buộc phải có `lineage_id` trỏ ngược lại Staging và Source.

## 4. CHI TIẾT CÁC BẢNG (SOURCE CENTER LAYER)
Đã triển khai thành công 6 bảng cốt lõi (Phase 1):
- `source_documents`: Quản lý siêu dữ liệu (metadata, storage path, status).
- `source_document_lines`: Dữ liệu phân rã chi tiết.
- `source_versions`: Quản lý version control cho file nguồn (tránh đè file).
- `staging_records`: Bộ đệm trung chuyển và kiểm duyệt.
- `data_lineage`: Mapping 1-1 giữa ERP record và Source.
- `source_audit_log`: Ghi nhận mọi thay đổi trạng thái và người thực hiện.

## 5. CHẤP NHẬN (ACCEPTANCE GATES)
- **Immutability:** KHÔNG UPDATE nội dung dữ liệu của file đã duyệt. Mọi thay đổi phải sinh ra `version` mới.
- **Traceability:** Từ một ID của BOQ Item, phải truy ngược ra `staging_records.id` -> `source_document_lines.id` -> `source_documents.id` -> file gốc.
- **Compliance:** Mọi API thao tác với Source Center phải tuân thủ chặt chẽ RBAC qua middleware (check session, JWT).

## 6. KHUYẾN NGHỊ / KẾ HOẠCH MIGRATION
- Migrate an toàn không phá vỡ 105 tables cũ.
- Thực hiện Regression Test sau khi deploy Phase 1 để đảm bảo các module cũ (HR, Payroll, Projects) không bị ảnh hưởng.
