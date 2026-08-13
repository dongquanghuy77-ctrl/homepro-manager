# PROCUREMENT STANDARD

## NGUYÊN TẮC: PO != BOQ
- **BOQ (Dự toán Vật tư)** là kế hoạch sử dụng vật tư của 1 Dự án. Được lập bởi Project Manager.
- **PO (Purchase Order - Đơn mua hàng)** là giao dịch mua sắm vật tư thực tế với Nhà cung cấp. Được lập bởi Procurement Department.

## QUY TRÌNH MUA SẮM CHUẨN
1. **Material Requirement**: Từ BOQ, sinh ra các Yêu cầu Vật tư (`purchase_requests`). 
2. **Purchase Order (PO)**: Từ Yêu cầu Vật tư, phòng Thu mua tạo Đơn Đặt Hàng (`purchase_orders`), trỏ tới 1 Nhà cung cấp (`suppliers`) cụ thể. PO này không bị ràng buộc cứng vào `boq_items`.
3. **Goods Receipt (GR)**: Khi hàng về kho, Kho tạo Phiếu Nhập Kho (`goods_receipts`). Ghi tăng Tồn kho thực tế (`inventory_balances`).
4. **Accounting (Invoice)**: Kế toán ghi nhận Hóa đơn Nhà cung cấp (`supplier_invoices`), xác nhận Công nợ và hạch toán vào Kế toán.

## NHÀ CUNG CẤP LÀ MASTER DATA
Bảng `suppliers` phải độc lập. Không được lưu tên nhà cung cấp dưới dạng Text đơn thuần trong bảng `materials`. Mọi PO đều phải tham chiếu tới `supplier_id`.
