# PRODUCTION MODULE AUDIT & HARDENING PLAN
**Date:** 2026-08-15
**System:** HOMEPro MANAGER ERP

## 1. Mục đích Audit
Đánh giá tình trạng hiện tại của Module Sản Xuất (Production Module) dựa trên Schema, API, UI và logic thực thi, nhằm chuẩn bị cho đợt tái cấu trúc và Hardening lớn nhất (Phase 1-20).

## 2. Kết Quả Phân Loại Tính Năng (Feature Classification)
*Thang điểm: A (Production Ready) | B (Functional but incomplete) | C (Partially implemented) | D (UI/mock only) | F (Broken)*

| Feature / Component | Status | Existing Tables / Logic | Gaps & Technical Debt to Fix |
| :--- | :---: | :--- | :--- |
| **BOM (Định mức)** | **B** | `boms`, `bomItems` | Thiếu `waste_percentage` (hao hụt), chi phí chuẩn, work center liên kết trực tiếp, phân loại nhóm. |
| **Work Centers** | **C** | `machines` | Chưa có khái niệm `work_centers` (Tổ/Khu). Máy móc đứng đơn lẻ. Thiếu hourly cost, capacity, queue. |
| **Production Orders** | **B** | `productionOrders` | Thiếu priority, người phụ trách, department. Chưa có status liên kết trực tiếp với QC. |
| **Work Orders (Lệnh SX)** | **C** | `workOrders` | Thiếu `dependencies` (ràng buộc công đoạn trước/sau). Thiếu material tracking theo từng WO. Thiếu QC required flag. |
| **Job Cards / Shop Floor** | **D** | N/A (Dùng UI của WO) | Cần 1 hệ thống Shop-floor riêng cho công nhân: START, PAUSE, REPORT SCRAP, REQUEST MATERIAL. |
| **Material Consumption** | **C** | `materialConsumptions` | Có lưu actual/scrap nhưng lỏng lẻo. Cần link cứng với Inventory Transaction (idempotent). Phải tính variance (chênh lệch định mức). |
| **Scrap / Defect** | **C** | `scrap_quantity` (inline) | Thiếu bảng `scrap_logs` lưu reason, photo, employee, timestamp. |
| **QC Integration** | **C** | `qc_issues` | Có QC Issue nhưng chưa tạo thành chốt chặn (Hard Gate). Phải khóa Production Order nếu QC Fail chưa Rework. |
| **Finished Goods** | **B** | `productionOutputs` | Đã có output nhưng chưa bảo vệ duplicate stock idempotent. Cần strict integration. |
| **Production Costing** | **C** | `projectCosts` (chung) | Thiếu bảng Breakdown tính Standard vs Actual (Material + Labor + Machine + Overhead). |
| **BOQ Integration** | **B** | Custom Scripts | Đang tính tổng dựa trên Script. Cần track quantity remaining realtime. |
| **Dashboard** | **D** | N/A | Thiếu Dashboard chuyên biệt cho Sản Xuất (Efficiency, Variance, WIP). |

## 3. Lộ trình Hardening (Phase 2 - Phase 14)

### Database Schema Changes (Phase 2, 3, 5, 9, 10, 12)
1. **Work Centers:** Tạo bảng `work_centers` (Khu/Tổ) và link `machines` vào `work_centers`.
2. **BOM & Routings:** Bổ sung `waste_percentage` vào `bom_items`. Bổ sung link `work_center_id` vào `routing_steps`.
3. **Work Order Dependencies:** Thêm logic/bảng phụ để WO-2 không được chạy nếu WO-1 chưa xong. Bổ sung các cột trạng thái chi tiết.
4. **Job Cards (Shop Floor):** Tạo bảng `job_cards` hoặc mở rộng `work_orders` thành Job Card, lưu chi tiết worker timelog.
5. **Scrap Logs:** Tạo bảng `scrap_logs` chuyên sâu.
6. **Costing:** Tạo bảng `production_costings` để lưu Standard vs Actual.

### API & Workflow (Phase 4, 7, 8, 11, 13)
1. **Material Issue (Inventory):** Tái lập toàn bộ logic xuất kho sản xuất → Gắn chặt Transaction (idempotent) vào Material Consumption. Không cho tồn kho âm.
2. **QC Gate:** Hard block khi chuyển trạng thái WO/PO sang COMPLETED.
3. **Variance Calculation:** API tự động tính độ lệch % vật tư và chi phí.

### UI & UX (Phase 6, 14, 18)
1. **Shop Floor Tablet/Mobile UI:** Giao diện cho thợ xưởng (Tiếng Việt 100%).
2. **Production Dashboard:** Bảng điều khiển hiệu suất.
3. **Font/Diacritics Verification:** Đảm bảo render tiếng Việt trên mọi thiết bị.

---
**Next Step:** Bắt tay vào Phase 2 & 3 (Master Data - BOM & Work Centers). Mở rộng Schema `src/db/schema.ts` theo đúng ERP Standard và migrate data.
