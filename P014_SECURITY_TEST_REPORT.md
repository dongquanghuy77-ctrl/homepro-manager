# P0.14 SECURITY TEST REPORT

Đã chạy `scripts/security_test_p014.ts` test trực tiếp trên môi trường Production (nhưng đảm bảo 100% READ-ONLY, sử dụng kỹ thuật validation bypass để test authorization của mutation).

**TOTAL TESTS:** 10
**PASS:** 8
**FAIL:** 2
**BLOCKED:** 0
**NOT TESTED:** 0

---

**IDOR:**
PASS (Worker bị chặn hoàn toàn khi truy cập resource của Worker khác).

**DEPARTMENT ISOLATION:**
FAIL (Manager hiện tại có thể xem hồ sơ nhân sự của TẤT CẢ phòng ban thay vì chỉ phòng ban mình quản lý).

**ROLE AUTHORIZATION:**
FAIL (Accountant bị chặn 403 khi truy cập hồ sơ nhân sự, trong khi Kế toán bắt buộc phải đọc được để tính lương).

**PAYROLL AUTHORIZATION:**
PASS (Logic RBAC bằng `DefaultAuthorizationService` hoạt động hoàn hảo, chặn chính xác Manager, Worker, Accountant khỏi việc tính lương POST).

**LEAST PRIVILEGE:**
FAIL (Tham khảo `ADMIN_USERS_REVIEW.md`, tài khoản `viewer` có quyền ADMIN).

---

### CRITICAL FINDINGS:
1. **Department Isolation Broken (API Employee GET):** Endpoint `/api/hr/employees/[id]` vẫn đang sử dụng code legacy (hardcode `if (session.role !== 'MANAGER')`). Hậu quả là mọi MANAGER đều có thể xem toàn bộ hồ sơ của công ty.
2. **Accountant Blocked (API Employee GET):** Tương tự lỗi trên, ACCOUNTANT không nằm trong chuỗi hardcode cho phép, dẫn đến việc Kế toán bị cấm hoàn toàn quyền xem hồ sơ nhân viên, làm gãy quy trình lấy thông tin lương.

### HIGH FINDINGS:
1. **Over-privileged User (`viewer`):** Tài khoản `viewer` được gán Role `ADMIN` ở Production, mang theo khả năng tính lương và sửa xoá.

### MEDIUM FINDINGS:
Chưa có.

---

**KẾT LUẬN CUỐI CÙNG:**

**HOLD — SECURITY GAP**

Do phát hiện lỗi Critical (Cross-department access cho phép Manager xem chéo, và Accountant bị block), hệ thống chưa đạt chuẩn an toàn 100%. Yêu cầu sửa lỗi Authorization Logic trên mã nguồn trước khi tiếp tục.
