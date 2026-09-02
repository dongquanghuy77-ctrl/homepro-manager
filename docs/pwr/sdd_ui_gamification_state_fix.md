# TÀI LIỆU THIẾT KẾ HỆ THỐNG (SDD) - KIẾN TRÚC UI/UX STATE GAMIFICATION
**Mã tài liệu:** `SDD-UI-GAMIFICATION-STATE-FIX`
**Tác giả:** Antigravity & UX Red Team Agent
**Trạng thái:** Chờ quyết định nghiệp vụ (Pending Business Decision)

---

## 1. MỤC TIÊU NGHIỆP VỤ (BUSINESS CONTEXT)
*   **Đối tượng phân tích:** Màn hình chào mừng (Welcome/Landing) của Trạm Làm Việc.
*   **Thành phần hiển thị:** Khối Gamification (Level 12, XP Progress), Danh sách tính năng, Nút "Đăng nhập ngay", Link "Đăng ký ngay".
*   **Mục tiêu:** Rà soát tính hợp lý, bóc tách cỗ máy trạng thái (State Machine) và ngăn chặn các lỗ hổng UX gây nhầm lẫn hoặc rò rỉ dữ liệu trong bối cảnh máy dùng chung (Kiosk) tại xưởng.

## 2. PHÂN TÍCH LỖ HỔNG (TƯ DUY NGƯỢC & PHẢN BIỆN)
*Theo báo cáo độc lập từ UX Red Team Agent.*

*   **Tư duy ngược: Trạng thái "Lượng tử" (Schrödinger's Auth State)**
    Hệ thống đang rơi vào trạng thái mâu thuẫn: Vừa nhận diện được người dùng (hiển thị đích danh Level 12, 1250 XP), lại vừa cư xử như thể không biết ai đang dùng máy (hiển thị nút "Đăng nhập ngay" và "Đăng ký ngay").
*   **Tư duy phản biện: Bóc tách 3 Lỗ hổng Trải nghiệm (UX Loopholes)**
    1.  **Lỗ hổng Quyền riêng tư (Data Leakage):** Nếu đây là thiết bị Kiosk xưởng dùng chung, việc lưu Cache và hiển thị Level của thợ ca trước cho thợ ca sau xem là vi phạm bảo mật, gây khó chịu cho người dùng ca trước.
    2.  **Lỗ hổng Lừa dối (Misleading Placeholder):** Nếu Level 12 chỉ là "ảnh minh họa" (Mockup) để khoe tính năng, nó vi phạm tính *Trung thực (Truthfulness)* của UX. Một thợ mới bấm "Đăng ký ngay" với kỳ vọng mình nhận được Level 12, nhưng vào trong lại thấy Level 1 sẽ dẫn đến hụt hẫng và mất niềm tin vào hệ thống (Cognitive Dissonance).
    3.  **Mâu thuẫn Lời kêu gọi (Contradictory CTAs):** Lời chào "Tiếp tục hành trình" ngầm định user cũ, nhưng link "Đăng ký ngay" lại dành cho user mới. Việc đặt chung 2 đối tượng này vào một bối cảnh Level 12 là một sự chắp vá logic.

## 3. THIẾT KẾ KIẾN TRÚC TỐI ƯU (CHUẨN OPEN-SOURCE)
Dựa trên nguyên tắc *Single Source of Truth* (Nguồn chân lý duy nhất cho UI State), kiến trúc UI cần được tách bạch dứt khoát thành 1 trong 2 kịch bản sau:

### Kịch bản A: Trạm Kiosk Dùng Chung (Generic Kiosk)
Dành cho máy Kiosk xưởng (Ai cũng có thể chạm vào).
*   **Trạng thái UI:** Unauthenticated (Hoàn toàn ẩn danh).
*   **Hành động:** 
    *   **XÓA BỎ** con số "Level 12" và "1250 XP". 
    *   **THAY BẰNG** hình ảnh một chiếc Cúp hoặc Huy hiệu chung chung mang dòng chữ *"Mở khóa cấp độ"*. 
    *   Giữ lại nút "Đăng nhập" và "Đăng ký".

### Kịch bản B: Trạm Nhận Diện (Soft-Authenticated Device)
Dành cho trường hợp Kiosk tự động nhận diện thợ vừa dùng (Remember Me) hoặc iPad cá nhân.
*   **Trạng thái UI:** Recognized (Đã nhận diện, chờ nhập mã).
*   **Hành động:** 
    *   **GIỮ LẠI** Level 12 và XP, nhưng PHẢI bổ sung Tên/Avatar người dùng (Vd: *"Chào mừng trở lại, Huy Đồng!"*).
    *   **ĐỔI TÊN NÚT** từ *"Đăng nhập ngay"* thành *"Nhập mã PIN để tiếp tục"*.
    *   **XÓA BỎ HOÀN TOÀN** nút "Đăng ký ngay". Thay thế bằng một link nhỏ: *"Không phải Huy Đồng? Chuyển tài khoản khác"*.

## 4. HÀNH ĐỘNG TIẾP THEO (NEXT STEPS)
*Yêu cầu Chủ hệ thống (Owner) đưa ra quyết định nghiệp vụ.*
- [ ] Chọn **Kịch bản A** (Kiosk ẩn danh).
- [ ] Chọn **Kịch bản B** (Nhận diện tự động, nhập mã PIN).
