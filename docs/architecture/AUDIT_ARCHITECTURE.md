# HOMEPRO AUDIT ARCHITECTURE

## 1. MỤC TIÊU KIỂM TOÁN (AUDIT OBJECTIVES)
Mọi dữ liệu nghiệp vụ quan trọng trong hệ thống không thể bị thay đổi mà không để lại dấu vết. Bất kỳ ai thực hiện sửa đổi dữ liệu đã chốt đều phải chịu trách nhiệm giải trình.

## 2. KIẾN TRÚC LƯU TRỮ LOG
Hệ thống sử dụng cơ chế Event Sourcing một phần để lưu trữ log vào các bảng Audit chuyên dụng.
- **`hr_audit_logs`**: Lưu vết mọi thay đổi của Module Nhân sự (Tạo nhân viên mới, Sửa giờ chấm công, Duyệt đơn nghỉ phép).
- Cấu trúc log: 
  - `actor_id`: Ai làm?
  - `action`: Làm gì? (VD: `ATTENDANCE_CORRECTED`)
  - `entity_type` & `entity_id`: Đối tượng nào bị ảnh hưởng? (VD: `attendance`, ID 100)
  - `old_value` & `new_value`: Thay đổi như thế nào? (Lưu dưới dạng JSON để linh hoạt)
  - `ip_address`: Từ IP nào?
  - `created_at`: Khi nào?

## 3. CƠ CHẾ BẢO VỆ CHUẨN (IMMUTABILITY)
- Hệ thống áp dụng Soft Delete (ẩn khỏi UI) thay vì Hard Delete (xóa khỏi Database) đối với các giao dịch tài chính hoặc chứng từ đã duyệt.
- Những Transaction đã kết thúc vòng đời (VD: Đơn xin nghỉ đã `APPROVED`, Phiếu lương đã `PUBLISHED`) sẽ bị khóa (Locked). Các API Update/Delete sẽ từ chối thao tác trên các bản ghi này. Nếu sai sót, phải sử dụng cơ chế "Hủy/Đảo ngược" (Reversal) bằng cách tạo bản ghi mới để bù trừ, thay vì sửa trực tiếp bản ghi cũ.
