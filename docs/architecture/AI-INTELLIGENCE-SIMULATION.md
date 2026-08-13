# PHASE 5 — AI INTELLIGENCE SIMULATION

## 1. MỤC TIÊU
Đánh giá mức độ sẵn sàng và kiến trúc bảo mật khi tích hợp AI vào ERP HomePro Manager (chủ yếu là GenAI / LLM hoặc Machine Learning). Đảm bảo AI tạo ra giá trị mà không xâm phạm quyền riêng tư và giới hạn phân quyền.

## 2. ĐÁNH GIÁ CÁC USE CASE

### Use Case 1: Project Risk Prediction
- **Logic**: Đọc dữ liệu từ `tasks`, `qc_issues`, `costs` và `materials`. Nếu phát hiện "Tỷ lệ chậm tiến độ" + "Số QC Issue > 3" -> Gắn cờ (Flag) "Risk Score High".
- **Kiến trúc**: Không cần LLM. Chỉ cần thuật toán Heuristic hoặc Machine Learning Model (Random Forest) chạy ngầm (Cron) cập nhật trường `risk_score` vào bảng `projects`. 
- **Đánh giá**: Hoàn toàn khả thi với schema hiện tại.

### Use Case 2: Cost Anomaly Detection
- **Logic**: Phát hiện giá vật tư thay đổi đột biến hoặc giờ OT vượt chuẩn.
- **Đánh giá**: Data hiện tại của bảng `costs` và `boq_items` khá phẳng. Để AI làm tốt, cần thêm bảng `price_history` ghi log sự thay đổi giá vật tư theo thời gian. 

### Use Case 3: Material Forecast (Dự báo vật tư)
- **Logic**: Dựa trên lịch sử xuất nhập tồn dự báo khi nào vật tư sẽ cạn.
- **Đánh giá**: Chưa khả thi. Bảng `materials` chỉ lưu tồn kho hiện tại (`stock_qty`). Muốn dự báo chuỗi thời gian (Time-series Forecasting), hệ thống cần xây dựng xong bảng `inventory_transactions` chi tiết ở Phase 2 (Data Governance).

### Use Case 4: Management Copilot (Hỏi đáp tự nhiên)
- **Logic**: Giám đốc gõ: *"Dự án nào đang lỗ?"*, AI truy vấn DB và trả về kết quả.
- **Rủi ro Bảo mật (AI Security)**: Nếu cấp quyền trực tiếp Text-to-SQL (RAG) vào DB, AI có thể bị "Jailbreak" để moi dữ liệu lương nhân sự (`monthly_payroll`) mà người hỏi (ví dụ: Trưởng phòng) không được quyền xem.
- **Kiến trúc bắt buộc**: AI KHÔNG được truy vấn DB trực tiếp. Hệ thống phải:
  1. User hỏi -> LLM parse ra Intent (ví dụ: GET_LOSING_PROJECTS).
  2. LLM trả về tham số hàm (Function Calling / Tool Use).
  3. Backend của ERP gọi hàm API (vd: `getProjects(userId)`), hàm này bị ràng buộc bởi RBAC.
  4. Backend nhúng dữ liệu vào prompt cho LLM để tạo câu trả lời tự nhiên.
  => **AI hoạt động SAU lớp Authorization.**

## 3. KẾT LUẬN
Hệ thống KHÔNG được vội vã tích hợp Text-to-SQL tự do.
- **Bước 1**: Áp dụng thuật toán Heuristic cho Risk/Anomaly (Rules-based AI).
- **Bước 2**: Tích hợp Copilot sử dụng mô hình Tool-Calling (LLM As Agent), đảm bảo mọi truy xuất Data đều đi qua Middleware RBAC hiện hành.
