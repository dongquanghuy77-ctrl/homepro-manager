# HOMEPRO ROADMAP & NEXT MODULES

Dựa trên kết quả System Audit, đây là Roadmap ưu tiên xây dựng các module tiếp theo đảm bảo kiến trúc vững chắc, không chồng chéo.

## PHASE 1: FOUNDATION (Hiện tại)
- **Mục tiêu:** Củng cố các Master Data còn thiếu để làm nền tảng cho Finance và Legal.
- **Next Steps:**
  1. Tạo `COMPANY MASTER` (Định danh công ty, Tài khoản ngân hàng, Mã số thuế).
  2. Tạo `DOCUMENT CENTER` (Bảng `documents` để xử lý tập trung mọi file/ảnh/giấy tờ đính kèm thay vì URL rải rác).
  3. Áp dụng chuẩn `MODULE_CONTRACT` cho toàn bộ mã nguồn hiện tại.

## PHASE 2: CORE FINANCE & ACCOUNTING
- **Mục tiêu:** Nhận dữ liệu tài chính từ Project và HR.
- **Next Steps:**
  1. Tạo `ACCOUNTING LEDGER` (Hệ thống tài khoản GL, Bút toán kép Double-entry).
  2. Tích hợp `Payroll` -> `Accounting` (Sinh chi phí lương tự động khi chốt lương).
  3. Tích hợp `Project Costs` -> `Accounting` (Hạch toán chi phí công trình).

## PHASE 3: SUPPLY CHAIN (INVENTORY & PROCUREMENT)
- **Mục tiêu:** Chuẩn hóa quy trình Mua hàng và Nhập xuất kho.
- **Next Steps:**
  1. Module `PURCHASING` (Yêu cầu mua hàng PR -> Đơn hàng PO -> Hóa đơn).
  2. Module `WAREHOUSE/INVENTORY` (Phiếu nhập, Phiếu xuất, Cân đối kho). Thay vì hiện tại `materials` chỉ có cột `stock_qty` tăng giảm thủ công, phải chuyển sang tính từ `Stock Ledger`.

## PHASE 4: ADVANCED PRODUCTION
- **Mục tiêu:** Nâng cấp quy trình sản xuất hiện tại (BOM & Tracking).
- **Next Steps:**
  1. Liên kết `Warehouse` vào `Material Tracking` (Xuất kho vật tư mới được scan QR thi công).
  2. Đo lường chi phí nhân công theo định mức `BOQ` vs thực tế từ `Work Logs`.
