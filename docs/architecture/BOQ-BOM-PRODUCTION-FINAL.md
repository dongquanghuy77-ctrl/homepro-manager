# MASTER BOQ/BOM PRODUCTION SUBMODULE

## Mục tiêu hoàn thành
Đã hoàn thành xuất sắc toàn bộ logic Backend, Schema và E2E Test cho phân hệ BOQ/BOM thuộc hệ thống Quản lý Sản xuất HomePro Manager.
Chấp nhận vượt qua **FINAL ACCEPTANCE GATE**.

## Các cấu trúc dữ liệu chính (Schema)

1. **BOQ (Bill of Quantities)**:
   - `boqs`: Quản lý danh sách các BOQ của Dự án, phiên bản, trạng thái (DRAFT, APPROVED).
   - `boq_sections`: Các hạng mục con bên trong BOQ.
   - `boq_items`: Chi tiết từng hạng mục, liên kết với `Product` (Sản phẩm thành phẩm - FG) hoặc Material.

2. **BOM (Bill of Materials)**:
   - `boms`: Danh sách định mức nguyên liệu cho từng Product. Hỗ trợ đa phiên bản (`status` = ACTIVE, DRAFT, OBSOLETE).
   - `bom_items`: Chi tiết định mức. Hỗ trợ đa cấp độ bằng cách link `materialId` tới một Product khác có BOM riêng. Tích hợp `scrap_percentage` (tỷ lệ hao hụt) và `waste_percentage` (tỷ lệ phế phẩm).

3. **Production Orders & Work Orders**:
   - `production_orders`: Đơn lệnh sản xuất được sinh ra dựa trên BOQ và BOM. Gắn `bomId` để chốt version định mức. Thêm `qc_status` và `requires_qc` để ràng buộc chất lượng.
   - `work_orders`: Công đoạn sản xuất. Được gán vào `work_center_id`.
   
4. **Material Consumptions & Outputs**:
   - Log chi tiết nguyên vật liệu tiêu hao.
   - Khi hoàn thành Output, hệ thống tự động kiểm tra `qc_status` của lệnh sản xuất. Nếu chưa PASS, không cho phép nhập kho thành phẩm.

## Services Cốt Lõi (`src/lib/production/boq_bom_service.ts`)

- `createBoq()` / `approveBoq()`: Lifecycle của BOQ.
- `createBom()`: Tạo định mức, tự động de-activate phiên bản cũ, **kiểm tra Circular Dependency** (Chống lặp vòng).
- `explodeBom()`: Thuật toán đệ quy tính toán tổng nhu cầu nguyên vật liệu từ FG -> Sub-Assembly -> Raw Materials. Đã cộng dồn Hao hụt (Scrap & Waste).
- `checkAvailability()`: So sánh nhu cầu nguyên vật liệu (sau Explode) với tồn kho (`available_quantity`) trong Warehouse. Trả về chi tiết `shortage` (thiếu hụt) nếu có.
- `calculateBomStandardCost()`: Đệ quy tính tổng chi phí cấu thành sản phẩm dựa trên Unit Price của nguyên liệu thô và tỷ lệ hao hụt.

## Những Fix Quan Trọng Trong Suốt Quá Trình

1. **Drizzle-ORM Type Casting**: Khi lấy dữ liệu dạng NUMERIC từ Postgres bằng hàm raw SQL (`execute`), Postgres driver trả về dạng `String`. Cần `Number()` casting trước khi tính toán `completed_quantity` và tồn kho, tránh lỗi logic string comparison (VD: `'0.0000100' >= '100'`).
2. **Postgres ANY/ALL Tuple Bug**: `ANY($1)` không chạy nếu truyền một mảng JS trực tiếp vào thẻ SQL template (`sql` tag). Giải pháp: Chuyển sang Query Builder với `inArray` hoàn toàn native và type-safe.
3. **Database Migration**: Áp dụng file migration thủ công `apply_boq_bom_migration.ts` do Drizzle-kit `generate/push` gặp lỗi TTY trong môi trường CI/Automation.

## E2E Validation
- File `scripts/e2e_boq_bom_production.ts` đã verify thành công 16 case liên hoàn:
  - Tạo Material -> Tạo BOQ -> Tạo Multi-level BOM -> Tính Standard Cost -> Explode BOM -> Seed Inventory (vượt qua Transaction lock) -> Check Availability -> Tạo Lệnh SX -> Tiêu hao NVL -> Khai báo Phế phẩm -> Kiểm định QC -> Sinh Thành Phẩm -> Cập nhật trạng thái tự động.
