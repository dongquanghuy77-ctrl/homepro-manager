# TÀI LIỆU THIẾT KẾ HỆ THỐNG (SDD) - KIẾN TRÚC PHIÊN LÀM VIỆC THEO NGỮ CẢNH (SESSION SCOPING)
**Mã tài liệu:** `SDD-PWR-SESSION-SCOPING-PERSONA`
**Tác giả:** Antigravity & Session Architect Red Team
**Trạng thái:** Chờ phê duyệt (Pending Approval)

---

## 1. MỤC TIÊU NGHIỆP VỤ (BUSINESS CONTEXT)
*   **Vấn đề 1 (Quản lý Kiosk):** Thợ xưởng cần linh động luân chuyển tổ đội (Ví dụ: Từ Tổ Cắt sang Tổ Dán) ngay tại màn hình Kiosk. Hệ thống cần ghi nhớ, hiển thị tổ đội hiện tại và cho phép thay đổi.
*   **Vấn đề 2 (Quản trị Admin):** Cùng một hệ thống Đăng nhập, nhưng nếu tài khoản là Admin, Giao diện (UI) phải khác biệt hoàn toàn để phục vụ công tác quản lý thay vì thực thi tác vụ.

## 2. PHÂN TÍCH LỖ HỔNG (TƯ DUY NGƯỢC)

### 2.1. Rủi ro của việc "Tự do chọn Tổ đội"
Nếu thiết kế tính năng chọn tổ đội một cách hời hợt (chỉ dùng giao diện Frontend để lọc dữ liệu), hệ thống sẽ đối mặt với 3 rủi ro cực kỳ nguy hiểm:
1.  **Gian lận KPI (Fraud):** Một thợ có thể cố tình chọn sai tổ để "nhận vơ" số lượng sản phẩm của bạn bè, hoặc trốn tránh KPI của tổ chính.
2.  **Vi phạm An toàn Lao động (Safety Bypass):** Một thợ chưa từng được huấn luyện dùng máy Khoan lại cố tình chọn "Tổ Khoan". Nếu hệ thống vô tình cấp quyền truy cập máy móc/tài liệu tổ này, nguy cơ tai nạn rất cao.
3.  **Rò rỉ Dữ liệu (Privilege Escalation):** Thợ rà quét tìm và chọn "Tổ Kiểm Định QC" để tự phê duyệt sản phẩm lỗi của chính mình.

### 2.2. Rủi ro của việc gộp chung UI Admin và Worker
*   Nhiều hệ thống thường dùng chung 1 mã nguồn giao diện (UI), sau đó dùng CSS hoặc biến `isAdmin` để ẩn/hiện nút bấm.
*   **Lỗ hổng:** Kẻ tấn công nội bộ (Insider Threat) có thể dùng Developer Tools (F12) trên trình duyệt để sửa biến `isAdmin = true` và gọi trộm các API quản trị bị ẩn.

## 3. THIẾT KẾ KIẾN TRÚC TỐI ƯU (CHUẨN OPEN-SOURCE)

### 3.1. Kiến trúc "Phiên làm việc theo Ngữ cảnh" (Contextual Session Scoping / AssumeRole)
Lấy cảm hứng từ chuẩn `AWS AssumeRole` của Amazon:
*   **Mô hình Dữ liệu:** Thuộc tính "Tổ Đội" (Team) không được dán cứng vào người dùng (User). Nó thuộc về **Phiên làm việc (Session)**.
*   **Luồng hoạt động:**
    1.  **Xác thực gốc (Base Auth):** Thợ quẹt thẻ/nhập PIN thành công. 
    2.  **Đề xuất Tổ đội (Team Suggestion):** Hệ thống ưu tiên hiển thị Tổ Đội mà HR/Quản lý phân công hôm nay (Daily Roster), hoặc Tổ mặc định.
    3.  **Xin quyền & Chuyển đổi (Assume Role):** Nếu thợ bấm chọn luân chuyển sang "Tổ Dán", yêu cầu này gửi xuống Server. Server kiểm tra danh sách `Eligible_Teams` (Chứng chỉ kỹ năng của thợ này có được phép làm Tổ Dán không?).
    4.  **Cấp phát Token mới:** Nếu hợp lệ, Server hủy Token cũ, phát hành một Token mới có dán nhãn `Scope=To_Dan`. Mọi thao tác tiếp theo của thợ này sẽ bị khóa chặt trong quyền hạn của Tổ Dán.

### 3.2. Kiến trúc Định tuyến Chân dung (Persona Routing)
Để giải quyết bài toán UI của Admin:
*   **Bảo mật từ Cửa ngõ (API Gateway / Middleware):** Hệ thống không dùng chung UI. 
*   **Luồng hoạt động:** Khi Server cấp quyền thành công, Middleware đọc Token. 
    *   Nếu là Worker: Trình duyệt bị ép (force redirect) chuyển hướng sang luồng UI của Kiosk (`/pwr/station/...`).
    *   Nếu là Admin: Trình duyệt được định tuyến sang Không gian Quản trị (`/pwr/admin/...`). 
*   **Zero-Trust UI:** Thợ không thể nhìn thấy bất kỳ dòng code giao diện (HTML/JS) nào của Admin, triệt tiêu hoàn toàn khả năng hack qua Developer Tools.

## 4. HÀNH ĐỘNG TIẾP THEO (NEXT STEPS)
*Yêu cầu Chủ hệ thống (Owner) phê duyệt phương án.*
- [ ] Áp dụng kiến trúc `AssumeRole` (Kiểm duyệt quyền khi chọn Tổ đội) thay vì chỉ thay đổi UI đơn thuần.
- [ ] Áp dụng kiến trúc `Persona Routing` (Tách hẳn giao diện và đường dẫn cho Admin).
