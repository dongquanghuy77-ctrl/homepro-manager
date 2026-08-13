# HOMEPRO MODULE CONTRACT STANDARD

Tài liệu này quy định chuẩn giao tiếp và giới hạn trách nhiệm (Module Contract) cho mọi module trong hệ thống HomePro.
Mọi module mới BẮT BUỘC phải tuân thủ hợp đồng này trước khi viết bất kỳ dòng code nào.

## 1. THÔNG TIN CHUNG (MODULE IDENTITY)
- **1.1. Module ID:** (Mã định danh duy nhất, VD: `HR-ATT`)
- **1.2. Module Name:** (Tên module, VD: `Attendance`)
- **1.3. Business Owner:** (Phòng ban/Người chịu trách nhiệm nghiệp vụ)
- **1.4. Technical Owner:** (Người chịu trách nhiệm kỹ thuật)

## 2. PHẠM VI (SCOPE & BOUNDARY)
- **2.1. Purpose:** (Mục đích tồn tại của module, giải quyết bài toán gì?)
- **2.2. Scope:** (Những chức năng/tính năng nằm TRONG phạm vi)
- **2.3. Out of Scope:** (Những chức năng KHÔNG thuộc trách nhiệm của module này)

## 3. DỮ LIỆU & KIẾN TRÚC (DATA & ARCHITECTURE)
- **3.1. Master Data sử dụng:** (Các bảng Master Data mà module READ/REFERENCE tới. Tuyệt đối không copy dữ liệu)
- **3.2. Source of Truth:** (Dữ liệu nào module này sở hữu và làm nguồn duy nhất cho toàn hệ thống?)
- **3.3. Database Tables / Models:** (Danh sách bảng, model chính do module quản lý)

## 4. GIAO DIỆN HỆ THỐNG (SYSTEM INTERFACES)
- **4.1. API Endpoints:** (Danh sách các API xuất ra cho FE hoặc các module khác gọi)
- **4.2. UI Routes:** (Danh sách URL/Routes trên Frontend)
- **4.3. Input:** (Dữ liệu đầu vào cần thiết)
- **4.4. Output:** (Dữ liệu đầu ra/Báo cáo/Sự kiện sinh ra)

## 5. NGHIỆP VỤ & QUY TRÌNH (BUSINESS LOGIC)
- **5.1. Workflow:** (Sơ đồ luồng đi của dữ liệu/nghiệp vụ)
- **5.2. Status Machine:** (Các trạng thái của object chính, VD: PENDING -> APPROVED -> CANCELLED)
- **5.3. Validation Rules:** (Quy tắc kiểm tra tính hợp lệ của dữ liệu)
- **5.4. Error Handling:** (Cách xử lý khi có lỗi nghiệp vụ)

## 6. PHÂN QUYỀN & BẢO MẬT (SECURITY & COMPLIANCE)
- **6.1. RBAC:** (Các Roles có quyền thao tác trên module)
- **6.2. Permission Matrix:** (Ma trận phân quyền chi tiết: CREATE, READ, UPDATE, DELETE, APPROVE, EXPORT)
- **6.3. Audit Requirements:** (Các hành động cần được ghi log Audit)
- **6.4. Security Requirements:** (Quy định bảo mật riêng biệt nếu có)

## 7. TÀI LIỆU & THÔNG BÁO (DOCUMENTS & NOTIFICATIONS)
- **7.1. Document/File Requirements:** (Các tài liệu đính kèm, sử dụng DOCUMENT CENTER)
- **7.2. Notification Requirements:** (Các sự kiện cần gửi thông báo: In-app, Email, Zalo...)

## 8. SỰ PHỤ THUỘC (DEPENDENCIES)
- **8.1. Dependencies (Upstream):** (Các module khác mà module này phụ thuộc vào. VD: `Payroll` phụ thuộc `Attendance`)
- **8.2. Dependents (Downstream):** (Các module khác phụ thuộc vào module này. VD: `Accounting` phụ thuộc `Payroll`)

## 9. TÁC ĐỘNG TÀI CHÍNH & PHÁP LÝ (FINANCIAL & LEGAL IMPACT)
- **9.1. Financial Impact:** (Module này có sinh ra doanh thu/chi phí không?)
- **9.2. Accounting Impact:** (Dữ liệu từ đây sẽ ghi nhận vào tài khoản kế toán nào?)
- **9.3. Tax Impact:** (Ảnh hưởng đến báo cáo thuế không?)
- **9.4. Reporting Impact:** (Đầu vào cho các báo cáo quản trị nào?)

## 10. YÊU CẦU KỸ THUẬT & VẬN HÀNH (NON-FUNCTIONAL & OPS)
- **10.1. Transaction/Consistency Rules:** (Quy tắc toàn vẹn dữ liệu, Rollback khi lỗi)
- **10.2. Idempotency Requirements:** (Bảo vệ API khỏi việc gọi trùng lặp/Double-click)
- **10.3. Migration Requirements:** (Yêu cầu di chuyển dữ liệu nếu có)
- **10.4. Performance Requirements:** (Chỉ tiêu hiệu năng: TPS, response time...)
- **10.5. Search/Filter Requirements:** (Yêu cầu tìm kiếm, lọc, phân trang)

## 11. KIỂM THỬ & TRIỂN KHAI (TESTING & DEPLOYMENT)
- **11.1. Test Requirements:** (Unit Test, Integration Test cần có)
- **11.2. UAT Acceptance Criteria:** (Tiêu chí nghiệm thu UAT)
- **11.3. Rollback Strategy:** (Kịch bản lùi phiên bản khi deploy lỗi)
- **11.4. Production Deployment Requirements:** (Các thiết lập môi trường, flag cần bật)
- **11.5. Version/Change History:** (Lịch sử cập nhật của Module Contract này)
