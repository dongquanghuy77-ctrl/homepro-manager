# ROADMAP NEXT MODULES

Dựa vào `MODULE_MATURITY_AUDIT.md` và `DATA_DEPENDENCY_MAP.md`, đây là lộ trình kiến trúc và phát triển các module tiếp theo.

## NGUYÊN TẮC QUYẾT ĐỊNH
- Ưu tiên củng cố Foundation trước khi nhân rộng.
- Không phát triển các Module ngọn (Cost, QC, BOQ) nếu Module gốc (Master Data, Accounting, Purchasing) chưa sẵn sàng.

## PHÂN HẠNG ƯU TIÊN (PRIORITY RANKING)

### P0 (CRITICAL - DO IMMEDIATELY)
1. **Financial Core (Accounting Sổ cái)**
   - *Lý do*: Cần thiết lập `Chart of Accounts` (Sổ cái) và Journal Entries ngay lập tức. Nếu trì hoãn, Payroll và Project Cost sẽ tự tạo ra dữ liệu tài chính rác, không liên thông, dẫn đến đập đi xây lại.
   - *Rủi ro nếu không làm*: Khủng hoảng Data Consistency.
2. **Document Center Foundation**
   - *Lý do*: Hồ sơ nhân sự (HR), Hợp đồng dự án đang chuẩn bị cần nơi lưu trữ.
   - *Rủi ro nếu không làm*: File bị upload vứt vào S3 không metadata, rò rỉ dữ liệu (Security Breach).

### P1 (HIGH PRIORITY)
1. **Employee Profile Migration (HR Core)**
   - *Lý do*: Bảng `users` đang chứa quá nhiều trường của nhân viên (Ngày vào làm, Lương cứng...). Cần tách `users` (Chỉ lưu Account auth/login) và `employees` (Hồ sơ nhân sự chi tiết).
2. **Master Data Management UI**
   - *Lý do*: Quản lý danh mục Department, Position, Material, Bank Account... tập trung.

### P2 (MEDIUM PRIORITY)
1. **Purchasing & Warehouse (Supply Chain Core)**
   - *Lý do*: Dự án cần mua vật tư. Cần chuẩn hóa Supplier → PO → Warehouse Receipt.
2. **Project & BOQ Refactor**
   - *Lý do*: Chuyển đổi dữ liệu thô sang luồng kết nối chặt với Supply Chain.

## KẾT LUẬN MODULE TIẾP THEO
**MODULE TIẾP THEO PHẢI XÂY DỰNG: ACCOUNTING CORE (FINANCIAL FOUNDATION).**
*Lý do*: Đã hoàn thiện HR & Payroll, luồng tiền lương cần một nơi ghi nhận (Phải trả NLĐ, Chi phí lương). Nếu làm Project ngay mà không có Accounting, Project Cost sẽ bị thiết kế sai lệch.
