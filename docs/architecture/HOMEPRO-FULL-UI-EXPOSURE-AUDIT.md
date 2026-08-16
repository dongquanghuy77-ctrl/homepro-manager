# HOMEPRO FULL UI EXPOSURE AUDIT

## 1. MỤC TIÊU
- Lập sơ đồ toàn bộ module, sub-module hiện có trong codebase dựa trên thư mục `src/app`.
- Xác định tình trạng của mỗi module (có DB, có Route, có trong Navigation chưa, có UI chưa).

## 2. DISCOVERY BẢNG MODULE

| Module | DB | Service/Logic | API/Action | Route | Navigation | UI | Data Seed | E2E |
| ------ | -- | ------------- | ---------- | ----- | ---------- | -- | --------- | --- |
| **Dashboard** | N/A | Lấy tổng quan | Không | `/` | CÓ | CÓ | N/A | CÓ |
| **CRM** | `leads`, `customers`... | N/A | Chưa rõ | `/crm/leads`, vv | CÓ | CÓ | CÓ (ít) | CÓ |
| **Dự án** | `projects` | `src/api` | API | `/projects` | CÓ | CÓ | CÓ | CÓ |
| **Báo giá/BOQ**| `boqs`, `boqItems` | CÓ | API | `/bom` (mix) | CÓ | CÓ | CÓ | CÓ |
| **Vật tư** | `materials`, `categories` | N/A | Server Actions | `/inventory/materials` | CÓ | CÓ | CÓ | CÓ |
| **Kho** | `inventoryTransactions` | `inventoryService` | Actions | `/inventory/...` | CÓ | CÓ | CÓ | CÓ |
| **Mua hàng** | `purchaseRequests`, `purchaseOrders`| CÓ | API | `/purchasing/...` | CÓ | CÓ | CÓ | CÓ |
| **Sản xuất** | `productionOrders`, `workOrders`... | `productionService` | Actions/API | `/production/...` | CÓ | CÓ | CÓ | CÓ |
| **Lắp đặt** | `installations`, `kcs` | N/A | N/A | `/installation/...` | CÓ | CÓ | CÓ | CÓ |
| **Tài chính** | `paymentVouchers`, `debts` | N/A | API | `/finance/...` | CÓ | CÓ | CÓ | CÓ |
| **Nhân sự** | `users`, `attendance`, `payroll` | `hr-core` | API | `/hr`, `/employees`... | CÓ | CÓ | CÓ | CÓ |
| **Hệ thống** | `users` | N/A | API | `/admin/users`, `/settings` | CÓ | CÓ | CÓ | CÓ |
| **Tracking/QR**| - | - | API | `/tracking` | CÓ | CÓ | N/A | N/A |
| **QC** | `qcRecords` | N/A | API | `/qc` | CÓ | CÓ | N/A | N/A |

> Bảng này được xây dựng từ kết quả scan cấu trúc thư mục `/src/app`, `/src/api`, và các schemas. Toàn bộ module lõi đã có mặt.

## 3. NEXT STEPS
- **Phase 5**: Rebuild Navigation (Nhóm và phân cấp trong sidebar cho Vật tư-Kho, Sản xuất,...).
- **Phase 6**: Chạy Auto Audit script quét các routes.
- **Phase 7, 8, 9, 10, 11, 12**: Cải thiện UI, RBAC, Golden Data, v.v.
