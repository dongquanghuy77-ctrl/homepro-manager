# P0 ARCHITECTURE DEBT REFACTOR

## WHAT WAS FOUND
1. **Multi-Warehouse**: Hệ thống tồn kho (`stock_balances`, `stock_ledgers`) chưa hỗ trợ tracking theo `warehouse_id` hoàn chỉnh và thiếu các cột phân tách tồn kho thực tế, tồn kho giữ chỗ (reserved), và tồn kho khả dụng (available).
2. **Idempotency**: Các luồng tạo phiếu xin nghỉ, phiếu lương, PO, và giao dịch kho không có cơ chế chặn Double Submit (Duplicate Execution Risk).
3. **Procurement**: `boq_items` đang gánh cả logic theo dõi hàng đã đặt/hàng đã nhận, tạo ra sự phụ thuộc cứng (Tight Coupling) giữa module Dự án và module Mua sắm. Thiếu bảng Quản trị Nhà cung cấp độc lập.
4. **Event/Job**: Hệ thống thực hiện các tác vụ kéo dài dạng Request/Response đồng bộ, không có Event-Driven Abstraction.

## WHAT WAS CHANGED
1. **Schema Drizzle**: Đã thiết kế lại `schema.ts`.
2. **Inventory**: Refactor và ra mắt `inventory_balances` & `inventory_transactions` theo đúng chuẩn.
3. **Idempotency**: Thêm trường `idempotencyKey` với `UNIQUE` constraint vào `leaveRequests`, `monthlyPayroll`, `purchaseOrders`, `inventoryTransactions`.
4. **Procurement**: Tạo các bảng mới `suppliers`, `supplier_contacts`, `supplier_items`, `supplier_prices`.
5. **Event/Job**: Bổ sung bảng `domain_events` để quản lý các background jobs.

## WHAT WAS MIGRATED
Cấu trúc DB đã được migrate thông qua Drizzle-Kit. Các file audit script đã được chạy để đảm bảo integrity của dữ liệu cũ (Dữ liệu cũ đang được bảo toàn và refactor logic).

## WHAT WAS NOT CHANGED
Hệ thống UI frontend tạm thời giữ nguyên cho đến khi API kết nối ổn định (sẽ fix bug UI sau theo quy trình maintain). Module Attendance và Authentication vẫn giữ nguyên kiến trúc bảo mật P15.

## WHAT WAS DEPRECATED
Cấu trúc theo dõi `qty_ordered`, `qty_received` gắn chặt vào `boq_items` sẽ bị deprecate. Mọi thông tin PO/GR sẽ lấy từ `purchase_orders` và `goods_receipts`. Tương tự với `stock_balances` cũ.

## WHAT WAS VERIFIED
Các bảng mới đã được apply thành công. Schema TypeScript build typecheck PASS. Idempotency Key hoạt động.

## WHAT RISKS REMAIN
Quá trình chuyển đổi frontend API để tương thích với `inventory_balances` có thể phát sinh các lỗi nhỏ (Type Errors) do đổi tên biến. Backend xử lý Event (Background workers thực thụ như Inngest hay BullMQ) cần được triển khai nếu load tăng.

---
**Trạng thái Refactor: Đã Hoàn Thành (Database Layer & Schema)**
