# TÀI LIỆU THIẾT KẾ HỆ THỐNG (SDD) - KIẾN TRÚC TÀI KHOẢN ADMIN TRẠM LÀM VIỆC
**Mã tài liệu:** `SDD-PWR-ADMIN-ISOLATION`
**Tác giả:** Antigravity & IAM Red Team Agent
**Trạng thái:** Chờ phê duyệt (Pending Approval)

---

## 1. MỤC TIÊU NGHIỆP VỤ (BUSINESS CONTEXT)
*   Yêu cầu từ Owner: Tạo một tài khoản Admin **dành riêng và cách ly hoàn toàn** cho module "Trạm Làm Việc" (PWR), không chung chạ quyền hạn với hệ thống quản trị tổng (HomePro).
*   Mục tiêu: Quản lý rủi ro, phân quyền rõ ràng, đảm bảo Admin của phân xưởng không thể can thiệp vào các hệ thống khác của công ty, và ngược lại.

## 2. PHÂN TÍCH LỖ HỔNG KIẾN TRÚC (TƯ DUY NGƯỢC & PHẢN BIỆN)
*Theo báo cáo độc lập từ IAM Red Team Agent.*

*   **Tư duy ngược (Reverse Thinking): Sự ngộ nhận về "Cách ly"**
    Thông thường, ta nghĩ rằng tạo một bảng CSDL riêng (vd: `pwr_admins`) và một luồng đăng nhập riêng là "cách ly an toàn nhất". Tuy nhiên, tư duy ngược chỉ ra rằng: Cách ly vật lý danh tính (Identity) làm **nhân đôi diện tấn công (Attack Surface)**. Thay vì bảo vệ 1 cánh cửa (Login chung), ta phải bảo vệ 2 cánh cửa. Bất kỳ lỗ hổng nào ở luồng cấp token, đổi mật khẩu của luồng mới đều có thể bị khai thác chéo.
*   **Tư duy phản biện (Critical Thinking): Vấn đề mở rộng (Anti-pattern)**
    Nếu hôm nay ta tạo bảng `pwr_admins` cho Trạm Làm Việc, ngày mai có thêm module "Kho", ta lại tạo bảng `inventory_admins`? Điều này dẫn đến cấu trúc dữ liệu phình to, code bị lặp lại (Spaghetti code) và cực kỳ khó tích hợp tính năng Đăng nhập một lần (SSO) trong tương lai.

## 3. ĐÁNH GIÁ 2 GIẢI PHÁP THIẾT KẾ
*   **Giải pháp A: Logical Isolation (Cách ly Logic - RBAC)**
    *   Giữ nguyên 1 bảng `users` và 1 cổng xác thực duy nhất.
    *   Sử dụng cơ chế Phân quyền dựa trên vai trò theo Không gian tên (Namespace-based RBAC). Ví dụ: User được cấp quyền `ADMIN` nhưng bị khóa chặt trong `NAMESPACE = PWR_STATION`.
*   **Giải pháp B: Physical Isolation (Cách ly Vật lý)**
    *   Tạo bảng riêng biệt (`pwr_admins`), viết lại toàn bộ API Đăng nhập, session riêng cho Admin này.

## 4. ĐỀ XUẤT CHUẨN ENTERPRISE (NGUYÊN LÝ OPEN-SOURCE)
Dựa trên triết lý thiết kế của các hệ thống quản trị danh tính mã nguồn mở hàng đầu thế giới (**Keycloak**, **Auth0**) và kiến trúc phân quyền của **Kubernetes**:
**TUYỆT ĐỐI KHÔNG CHỌN GIẢI PHÁP B (Cách ly vật lý).** Đó là một "Anti-pattern" (mẫu thiết kế lỗi) tồi tệ trong kỹ nghệ phần mềm.

**Kiến trúc được đề xuất (Giải pháp A tối ưu hóa):**
1. **Single Source of Truth (Nguồn sự thật duy nhất):** Mọi danh tính (Identity) đều nằm ở bảng `users`. Mọi lượt đăng nhập (AuthN) đều đi qua 1 cổng NextAuth.
2. **Namespace-based Role (Phân quyền theo không gian):** Thêm một cột `module_scope` hoặc dùng bảng trung gian (Pivot Table) để quy định rõ: *"Tài khoản này là Admin, nhưng vùng hoạt động (Scope) chỉ giới hạn trong phân xưởng PWR"*.
3. **Middleware Guard (Người gác cổng Logic):** Xây dựng một lá chắn Middleware. Khi tài khoản này đăng nhập thành công, nếu cố tình truy cập vào URL của hệ thống HomePro tổng (vd: `/admin/dashboard`), Middleware sẽ chặn lại và báo "Không có quyền". Tài khoản này chỉ được phép truy cập các URL bắt đầu bằng `/pwr/*`.

## 5. HÀNH ĐỘNG TIẾP THEO (NEXT STEPS)
*Yêu cầu sự phê duyệt từ Owner (Đồng Quang Huy) trước khi triển khai.*
- [ ] Chấp thuận kiến trúc Logical Isolation (Giữ nguyên bảng `users`, nâng cấp Middleware chặn URL).
- [ ] Chấp thuận kiến trúc Physical Isolation (Vẫn muốn tách bảng riêng bất chấp rủi ro kỹ thuật).
