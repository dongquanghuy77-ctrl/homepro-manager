# MULTI-WAREHOUSE INVENTORY STANDARD

## NGUYÊN TẮC (INVARIANT)
`Material + Warehouse = Unique Balance`
Mỗi vật tư phải được track số lượng dựa trên từng Kho vật lý cụ thể, không được dùng chung một cột số lượng tồn duy nhất cho toàn hệ thống.

## CẤU TRÚC DỮ LIỆU
1. **warehouses**: Quản lý thông tin định danh từng Kho (Mã kho, Tên, Địa chỉ).
2. **inventory_balances**: Bảng lưu trữ Tồn Kho theo thời gian thực:
   - `quantity`: Số lượng thực tế trong kho.
   - `reserved_quantity`: Số lượng đã được book trước (dành cho Dự toán hoặc Đơn sản xuất).
   - `available_quantity`: `quantity` - `reserved_quantity`. Chỉ bán hoặc xuất kho khi `available_quantity > 0`.
3. **inventory_transactions**: Bảng ghi log mọi biến động kho. Mọi lần thay đổi `inventory_balances` ĐỀU PHẢI có 1 dòng ghi nhận tại đây (Receipt, Issue, Transfer, Adjustment).

## QUY TRÌNH CHUYỂN KHO (TRANSFER)
- **Tuyệt đối không** cập nhật trực tiếp `quantity` thủ công.
- Bước 1: Tạo `inventory_transactions` cho việc Xuất kho tại Warehouse A (`movementType = TRANSFER`, số lượng âm). Trừ `inventory_balances` tại Warehouse A.
- Bước 2: Tạo `inventory_transactions` cho việc Nhập kho tại Warehouse B (`movementType = TRANSFER`, số lượng dương). Cộng `inventory_balances` tại Warehouse B.
