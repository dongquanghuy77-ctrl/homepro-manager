# PHASE 3 — ERP CONTROL TOWER SIMULATION

## 1. MỤC TIÊU
Đánh giá khả năng của Dashboard hiện tại trong việc đóng vai trò ERP Control Tower (Tháp điều khiển trung tâm) cho Ban Giám Đốc, không chỉ đơn thuần là hiển thị số liệu mà còn phải kích hoạt các hành động quản trị (Action Center).

## 2. ĐÁNH GIÁ NGUỒN DỮ LIỆU KPI (EXECUTIVE KPIs)

| KPI | Source / Bảng liên quan | Formula | Chủ sở hữu (Owner) | Đánh giá Risk |
| :--- | :--- | :--- | :--- | :--- |
| **Revenue** | `projects.contract_value` | SUM(contract_value) theo time_range | Accounting / Kế toán | Dữ liệu ghi nhận cứng ở dự án, chưa có khái niệm Ghi nhận doanh thu theo tiến độ (Percentage of Completion - POC) -> **Phải sửa ở giai đoạn Thương mại hóa**. |
| **Project Cost** | `costs`, `monthly_payroll` (gán theo project) | SUM(costs.amount) + Labor Cost | Quản lý dự án | Hợp lý. Tuy nhiên Labor Cost đang tính rải rác. |
| **Project Margin** | `projects`, `costs` | Revenue - Project Cost | BGĐ | Chuẩn xác nếu tính được Cost chính xác. |
| **Inventory Value** | `materials` | SUM(stock_qty * unit_price) | Kho / Procurement | Giá (unit_price) hiện là giá cố định (Fixed). Khi scale cần áp dụng FIFO hoặc Moving Average (MAC) -> **Critical Gap**. |
| **QC Defect Rate** | `qc_issues` | COUNT(qc_issues) / Tổng số Tasks | QC Manager | Khả thi, dễ lấy từ schema hiện tại. |

## 3. THIẾT KẾ ACTION CENTER MỞ RỘNG
Hệ thống hiện tại mới đưa ra các cảnh báo đơn giản. Một ERP Control Tower thực sự cần Workflow hóa các cảnh báo:

- **Problem**: "Dự án X vượt ngân sách vật tư mục tiêu (Target Material Cost)".
- **Severity**: CRITICAL.
- **Owner**: Project Manager của Dự án X.
- **Due Date**: Yêu cầu giải trình trong 24h.
- **Recommended Action**: Tạm ngưng xuất kho cho dự án này hoặc tạo Phiếu xin bổ sung ngân sách (Budget Amendment).
- **Trạng thái (Status)**: Yêu cầu tracking vòng đời của một Alert. => Hiện tại `DashboardService` tạo Alert on-the-fly mỗi khi load trang. **Không có bảng `system_alerts` để track xem PM đã đọc và xử lý chưa**. => **Design Flaw cho mức độ Enterprise**.

## 4. KẾT LUẬN & ĐỀ XUẤT
- **Caching**: Các KPI tính toán doanh thu, chi phí hiện phải quét toàn bộ bảng giao dịch. Cần một Data Warehouse mini hoặc `Materialized Views` chạy ngầm mỗi 15 phút (Refresh Strategy).
- **Persisted Alerts**: Bắt buộc xây dựng bảng `action_items` hoặc `system_alerts` lưu trạng thái của cảnh báo, nếu không Action Center sẽ chỉ mang tính chất Read-only và bị bỏ qua.
