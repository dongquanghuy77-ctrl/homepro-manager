# FINANCIAL DATA FLOW (ACCOUNTING CORE)

## MỤC TIÊU TỐI CAO
Mọi luồng tiền trong HomePro Manager phải hội tụ về module **Accounting** (Sổ cái kế toán - General Ledger). KHÔNG một module nào được phép sở hữu hoặc vận hành một hệ thống tài chính riêng biệt (Ví dụ: Không có "Ví HR", "Ví Project", "Ví Warehouse").

## MÔ HÌNH LUỒNG DỮ LIỆU TÀI CHÍNH

Kế toán (Accounting) đóng vai trò là "Thùng rác thông minh" thu nhận mọi giao dịch phát sinh từ các Module nghiệp vụ. Kế toán không tự sinh ra nghiệp vụ (ngoại trừ các bút toán kết chuyển/phân bổ), mà tiếp nhận **Journal Entries** (Bút toán sổ cái) từ các Module khác đẩy sang qua API nội bộ.

```text
[ HR / PAYROLL ]
- HR chốt bảng lương tháng
  → Sinh ra Journal Entry:
      Dr (Nợ): Chi phí lương (642/622)
      Cr (Có): Phải trả NLĐ (334)
      Cr (Có): Bảo hiểm Xã hội (338)

[ PURCHASING / WAREHOUSE ]
- Nhập kho vật tư theo PO
  → Sinh ra Journal Entry:
      Dr (Nợ): Kho nguyên vật liệu (152)
      Cr (Có): Phải trả NCC (331)

- Kế toán làm lệnh ủy nhiệm chi (Thanh toán NCC)
  → Sinh ra Journal Entry:
      Dr (Nợ): Phải trả NCC (331)
      Cr (Có): Tiền gửi Ngân hàng (112)

[ PROJECT / SALES ]
- Nghiệm thu dự án (Xuất hóa đơn)
  → Sinh ra Journal Entry:
      Dr (Nợ): Phải thu Khách hàng (131)
      Cr (Có): Doanh thu (511)
      Cr (Có): Thuế GTGT đầu ra (3331)

[ PRODUCTION ]
- Xuất kho vật tư để sản xuất
  → Sinh ra Journal Entry:
      Dr (Nợ): Chi phí SXKD dở dang (154)
      Cr (Có): Kho NVL (152)
```

## NGUYÊN TẮC THIẾT KẾ
1. **Module Độc Lập nhưng Tích hợp Chặt chẽ**: Payroll chỉ lo tính toán giờ công, bảo hiểm thành ra con số Net/Gross. Khi nhấn "Chốt lương", module Payroll sẽ gọi internal hàm `createJournalEntry()` của module Accounting.
2. **Chart of Account (Master Data)**: Mã tài khoản kế toán là Master Data do Accounting sở hữu. Các module khác không được phép hardcode mã tài khoản trong source code (Nên ánh xạ qua bảng Settings hoặc Default Account Rules).
3. **Immutable Financial Data**: Một khi Journal Entry đã được Submit lên Accounting, các module Upstream (như Payroll) KHÔNG THỂ sửa hoặc xóa bản ghi cũ (không có nút Sửa/Xóa). Nếu phát hiện sai sót, phải tạo giao dịch đảo (Reversal Entry).
