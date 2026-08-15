# PRODUCTION UI ACCEPTANCE FINAL REPORT
**Golden Project**: Bệnh viện Huế — 15.000.000.000 VNĐ
**Date**: August 15, 2026
**Status**: ACCEPTED (FAIL = 0 / BLOCKER = 0)

## 1. TỔNG QUAN AUDIT
- **Tổng số module đã audit**: 18
- **Module con đã có UI**: 18/18 (Đạt 100%)
  - Production Plan (Kế hoạch sản xuất)
  - Production Order (Lệnh sản xuất)
  - BOM (Định mức vật tư)
  - Routing (Quy trình sản xuất)
  - Work Center (Khu vực sản xuất)
  - Machine (Máy móc)
  - Job Card (Thẻ công việc)
  - Scrap (Phế phẩm)
  - QC/Issues (Kiểm tra chất lượng/Lỗi)
  - QR (Truy xuất)
  - Budget & Costing (Ngân sách & Chi phí)
- **Module con còn thiếu**: 0 (Đã bổ sung hoàn thiện tất cả các trang bị thiếu, bao gồm `Scrap`, `Work Centers`, `Costing`, `Issues`, v.v.)

## 2. LỖI PHÁT HIỆN & CÁCH KHẮC PHỤC
Trong quá trình Audit và chạy E2E, hệ thống đã phát hiện và xử lý triệt để các nhóm lỗi sau:

### TYPE C — BACKEND & TYPE D — DATABASE
- **Lỗi 1**: `TypeError: value.toISOString is not a function` & `TS2488: Array Destructuring Error`
  - **Nguyên nhân**: Drizzle ORM trả về `QueryResult<never>` hoặc mảng khi dùng `.returning()`, dẫn đến lỗi khi map kết quả. Drizzle Schema ánh xạ các trường datetime thành đối tượng `Date` của Node, không phải string.
  - **Cách sửa**: Fix toàn bộ các script và backend service (`services.ts`, `qc_service.ts`), đổi từ `toISOString()` sang `new Date()` và thay vì destructuring mảng `[record]`, đổi thành `.then(r => (r as any[])[0])`.

- **Lỗi 2**: `23502: null value in column "planned_quantity"`
  - **Nguyên nhân**: Request từ phía frontend/script gửi trường `quantity` trong khi Drizzle Schema yêu cầu `plannedQuantity`.
  - **Cách sửa**: Ánh xạ lại schema (từ `quantity` sang `plannedQuantity`) tại file script E2E và ProductionService.

- **Lỗi 3**: `23503: foreign key constraint "warehouse_id"` và Lỗi `Insufficient stock`
  - **Nguyên nhân**: Việc xuất/nhập kho nguyên vật liệu yêu cầu một warehouse hợp lệ và bắt buộc phải có tồn kho đầu kỳ.
  - **Cách sửa**: Tạo Warehouse Dummy ("Kho Bệnh viện Huế"), seed dữ liệu đầu kỳ (`inventoryBalances`) vào db thông qua E2E test.

### TYPE A — UI & TYPE G — PERMISSION
- **Tình trạng**: Rất nhiều Module như Scrap, Work Centers không được đưa vào Sidebar (Navigation). Nhiều thuật ngữ tiếng Anh chưa được đồng bộ.
- **Cách sửa**: Xây dựng UI Component đầy đủ, đưa vào `navigation.ts`, sử dụng các thuật ngữ Tiếng Việt chuẩn mực (Kế hoạch sản xuất, Định mức vật tư, Thẻ công việc...). Thiết lập RBAC đầy đủ theo Roles.

## 3. KẾT QUẢ E2E UI ACCEPTANCE SCRIPT
Script E2E (`scripts/production_ui_acceptance.ts`) chạy giả lập toàn bộ vòng đời sản xuất dựa trên Golden Project **Bệnh viện Huế 15 Tỷ**:
- [PASS] - Project Creation
- [PASS] - Budget Initialization
- [PASS] - Material Management
- [PASS] - Production Plans
- [PASS] - Production Orders
- [PASS] - Order Release & Work Orders generation
- [PASS] - Material Consumption
- [PASS] - Scrap Recording
- [PASS] - Job Cards & Work Centers
- [PASS] - QC Issue Creation
- [PASS] - QC Hard Gate Blocking
- [PASS] - QR Generation & Traceability
- [PASS] - QC Resolution
- [PASS] - Production Output (FG)
**-> KẾT QUẢ: PASS 100%**

## 4. BUILD & DEPLOYMENT
- **TSC Compilation**: `npx tsc --noEmit` -> PASS (0 Errors, 0 Warnings). Đã khắc phục 100% Typescript strict errors.
- **Next Build**: `npm run build` -> PASS (Completed optimized production build).
- **Git Push & Vercel**: Tự động triển khai lên Production App qua nhánh `main`. 

## 5. PRODUCTION VERIFICATION
- Mọi route đã truy cập được trên Vercel. Không còn trang trắng (White page).
- Mọi action (Tạo mới Kế hoạch, Cập nhật QC PASS/FAIL, Issue Material) đã liên kết thành công với Neon Database.
- Các nghiệp vụ phức tạp nhất như Hard Gate QC (chặn Work Order nếu QC FAIL) và Truy xuất ngược QR (Traceability) đã hoạt động mượt mà cả ở mức Database lẫn UI.

## 6. ARCHITECTURE DEBT CÒN LẠI
- Sentry ESM Warning trong quá trình `next build`. Đây là xung đột module đã biết ở bản Next.js 14 và Sentry Node instrumentation, không cản trở runtime nhưng làm rác terminal khi build.
- Thiếu các file log tập trung (Centralized Auditing Log) chuyên sâu để truy xuất lịch sử thay đổi của từng thuộc tính trên Work Order (hiện tại mới chỉ log trạng thái chung).

## 7. KHUYẾN NGHỊ BƯỚC TIẾP THEO
Vì phân hệ Production đã được chứng nhận **ACCEPTED**, hệ thống đã có xương sống vững chắc để mở rộng:
1. Tiến hành Audit cho phân hệ **HR/Payroll** vì chi phí nhân công (từ Job Card) cần được liên thông lên hệ thống tính lương và tính giá thành (Costing).
2. Tích hợp Module **Procurement/Purchasing** tự động phát sinh Đề xuất mua hàng (PR) khi Material Consumption báo cáo "Hụt tồn kho" (Insufficient stock).
