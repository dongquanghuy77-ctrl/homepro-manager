# IDEMPOTENCY STANDARD

## TẠI SAO PHẢI CÓ IDEMPOTENCY?
Tránh hiện tượng Duplicate Execution khi hệ thống có độ trễ, mất mạng hoặc user double-click nút Submit. 
Ví dụ: Tránh việc gửi 2 PO giống hệt nhau hoặc tạo 2 bảng lương cho cùng một nhân viên trong cùng một tháng.

## PHẠM VI ÁP DỤNG
Toàn bộ các giao dịch tài chính, nhân sự quan trọng:
- Attendance (Chấm công)
- Leave Requests (Nghỉ phép)
- Monthly Payroll (Bảng lương)
- Purchase Orders (Đơn mua hàng)
- Inventory Transactions (Giao dịch kho)
- QC Issues
- Journal Entries (Kế toán)

## CƠ CHẾ HOẠT ĐỘNG
1. Client (Mobile / Web) sinh ra một chuỗi `idempotencyKey` duy nhất (ví dụ UUID hoặc `[UserId]-[Action]-[Timestamp]`) trước khi gửi Request.
2. Tại Drizzle Schema, trường `idempotency_key` được đặt ràng buộc `UNIQUE`.
3. Nếu Client gửi 2 request với cùng 1 `idempotencyKey`:
   - Lần 1: Database Insert thành công. Server xử lý và trả về 200 OK.
   - Lần 2: Database báo lỗi `duplicate key constraint`. Hệ thống bắt lỗi này và thay vì ném Error 500, sẽ catch và báo "Request already processed" hoặc trả về Entity của lần 1. 

*Không được để Database tự tăng ID rồi tạo duplicate rows.*
