import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

console.log('🚀 Seeding 2 contrasting projects for Executive 360 Report Analysis...');

// Clean up existing demo projects if any
await sql`DELETE FROM projects WHERE code IN ('DA-VIP01', 'DA-ERR02')`;

// ============================================================
// DỰ ÁN 1: VIP PRO — HOÀN HẢO 100% (DA-VIP01)
// ============================================================
console.log('📦 Creating Project 1: Biệt thự Penthouse VIP Pro (DA-VIP01)...');

const [proj1] = await sql`
  INSERT INTO projects (
    code, name, customer, manager, location, contract_value, status, start_date, deadline, notes
  ) VALUES (
    'DA-VIP01',
    'Biệt thự Penthouse VIP Pro — Villa Bãi Dài',
    'Ông Trần Hùng Dũng (Biệt thự Ocean Villa)',
    'Mai Quốc Quân (Manager)',
    'Căn Villa 08, Khu Penthouse Ocean Park',
    1800000000,
    'COMPLETED',
    '2026-06-01',
    '2026-08-01',
    'Dự án hoàn thành 100% đúng hạn, chất lượng cao cấp, khách hàng rất hài lòng.'
  )
  RETURNING id
`;

const id1 = proj1.id;

// Tasks for Project 1
await sql`
  INSERT INTO tasks (project_id, title, assignee, priority, status, progress, start_date, end_date) VALUES
  (${id1}, 'Bóc tách bản vẽ kỹ thuật & Chốt chất liệu gỗ An Cường', 'Lê Trung Duy', 'HIGH', 'COMPLETED', 100, '2026-06-01', '2026-06-05'),
  (${id1}, 'Cắt gỗ CNC & dán nẹp chỉ PVC cạnh cao cấp', 'Ngô Anh Tuấn', 'HIGH', 'COMPLETED', 100, '2026-06-06', '2026-06-15'),
  (${id1}, 'Sơn PU 5 lớp tráng gương cánh tủ bếp & vách tivi', 'Trần Thanh Phúc', 'HIGH', 'COMPLETED', 100, '2026-06-16', '2026-06-25'),
  (${id1}, 'Vận chuyển & Lắp đặt hoàn thiện nội thất biệt thự', 'Đồng Quang Huy', 'HIGH', 'COMPLETED', 100, '2026-06-26', '2026-07-28'),
  (${id1}, 'Nghiệm thu chất lượng QC & Bàn giao chìa khóa', 'Lê Trung Duy', 'HIGH', 'COMPLETED', 100, '2026-07-29', '2026-08-01')
`;

// BOQ Items for Project 1
await sql`
  INSERT INTO boq_items (project_id, material_name, unit, qty_required, unit_price) VALUES
  (${id1}, 'Hệ tủ bếp gỗ Acrylic tráng gương An Cường', 'Mét dài', 12, 8500000),
  (${id1}, 'Vách ốp gỗ Nu Óc Chó tự nhiên phòng khách', 'm2', 45, 6500000),
  (${id1}, 'Giường ngủ thông minh KingSize bọc da Ý', 'Bộ', 3, 42000000),
  (${id1}, 'Phụ kiện tay nâng & bản lề giảm chấn Hafele', 'Bộ', 1, 85000000)
`;

// Costs for Project 1
await sql`
  INSERT INTO costs (project_id, title, amount, category, cost_date, notes) VALUES
  (${id1}, 'Nhập lô MDF An Cường & V veneer Nu Óc Chó', 750000000, 'Vật tư mua ngoài', '2026-06-03', 'Thanh toán đợt 1 nhà cung cấp'),
  (${id1}, 'Sơn PU & Dung môi tráng gương Inchem Mỹ', 85000000, 'Vật tư mua ngoài', '2026-06-18', 'Vật tư sơn chính hãng'),
  (${id1}, 'Chi phí xe cẩu & vận chuyển nội thất cao cấp', 35000000, 'Vận chuyển', '2026-06-26', 'Bao bọc màng PE chống xước'),
  (${id1}, 'Thưởng tiến độ & Nhân công chuyên gia lắp đặt', 280000000, 'Nhân công ngoài', '2026-07-30', 'Khen thưởng thợ thi công mượt')
`;

// Work Logs for Project 1
await sql`
  INSERT INTO work_logs (project_id, log_date, description, worker_count, recorded_by) VALUES
  (${id1}, '2026-07-28', 'Hoàn thành 100% lắp đặt toàn bộ biệt thự, vệ sinh công nghiệp sạch đẹp. Khách hàng rất hài lòng.', 8, 'Lê Trung Duy')
`;

// ============================================================
// DỰ ÁN 2: CÓ RẤT NHIỀU SƠ SUẤT, LỖ HỔNG & THUA LỖ (DA-ERR02)
// ============================================================
console.log('📦 Creating Project 2: Căn hộ SunTower Bị Trễ & Thua Lỗ (DA-ERR02)...');

const [proj2] = await sql`
  INSERT INTO projects (
    code, name, customer, manager, location, contract_value, status, start_date, deadline, notes
  ) VALUES (
    'DA-ERR02',
    'Căn hộ SunTower (Trễ Hạn & Sơ Suất Thua Lỗ)',
    'Bà Nguyễn Thị Mai (SunTower Q.7)',
    'Trần Văn Minh (Manager)',
    'Căn 14.02 Block B, Chung cư SunTower',
    450000000,
    'OVERDUE',
    '2026-06-15',
    '2026-07-20',
    '⚠️ DỰ ÁN CÓ NHIỀU NGUY CƠ: Bị quá hạn 20 ngày, chi phí phát sinh vượt ngân sách gây thua lỗ.'
  )
  RETURNING id
`;

const id2 = proj2.id;

// Tasks for Project 2 (Slow & Overdue)
await sql`
  INSERT INTO tasks (project_id, title, assignee, priority, status, progress, start_date, end_date) VALUES
  (${id2}, 'Cắt gỗ tủ áo & Tủ bếp', 'Trần Văn Minh', 'HIGH', 'COMPLETED', 100, '2026-06-15', '2026-06-25'),
  (${id2}, 'Sơn PU cánh tủ bếp (Bị lỗi phải sơn lại 2 lần)', 'Trần Thanh Phúc', 'HIGH', 'PAUSED', 40, '2026-06-26', '2026-07-10'),
  (${id2}, 'Lắp đặt tủ áo âm tường (Lệch khung do đo sai)', 'Nguyễn Viết Hùng', 'HIGH', 'IN_PROGRESS', 50, '2026-07-11', '2026-07-25'),
  (${id2}, 'Vệ sinh & Bàn giao căn hộ (Chưa xong)', 'Lê Văn Sơn', 'HIGH', 'OVERDUE', 0, '2026-07-26', '2026-08-05')
`;

// BOQ Items for Project 2
await sql`
  INSERT INTO boq_items (project_id, material_name, unit, qty_required, unit_price) VALUES
  (${id2}, 'Tủ áo âm tường 4 cánh lùa MDF', 'Bộ', 2, 18000000),
  (${id2}, 'Tủ bếp trên & dưới phủ Melamine', 'Mét dài', 6, 4500000)
`;

// QC Issues for Project 2 (CRITICAL DEFECTS)
await sql`
  INSERT INTO qc_issues (project_id, code, title, description, severity, status, location) VALUES
  (${id2}, 'QC-101', '🔴 Mép tủ bếp bị rộp & ngấm nước', 'Do thợ dán nẹp PVC hở keo, nước ngấm làm nở ván MDF', 'CRITICAL', 'OPEN', 'Khu vực chậu rửa tủ bếp'),
  (${id2}, 'QC-102', '🔴 Cánh tủ áo lùa bị xệ & kẹt nặng', 'Đo đạc kích thước sai lệch 3mm làm khung tủ bị nén cong', 'HIGH', 'IN_PROGRESS', 'Phòng ngủ Master'),
  (${id2}, 'QC-103', '🟠 Bề mặt sơn PU bị nổi bọt khí & ố vàng', 'Sơn trong môi trường xưởng bụi bẩn, không bật quạt hút', 'HIGH', 'OPEN', 'Mặt bàn ăn gỗ')
`;

// Costs for Project 2 (OVER BUDGET -> LOSS)
await sql`
  INSERT INTO costs (project_id, title, amount, category, cost_date, notes) VALUES
  (${id2}, 'Mua bù 8 tấm MDF thay thế lô dán nẹp hỏng', 28000000, 'Vật tư mua ngoài', '2026-07-02', 'Do thợ cắt sai quy cách phải mua lại'),
  (${id2}, 'Chi phí sơn lại 2 lần do dính bụi bẩn', 35000000, 'Vật tư mua ngoài', '2026-07-12', 'Vật tư sơn & công thợ sơn lại'),
  (${id2}, 'Thuê thợ ngoài sửa cửa lùa gấp đêm', 45000000, 'Nhân công ngoài', '2026-07-22', 'Chi phí khoán gấp khắc phục sự cố'),
  (${id2}, 'Tiền phạt chậm hợp đồng bàn giao cho Chủ nhà', 412000000, 'Khác', '2026-08-02', 'Phạt 1%/ngày do quá hạn 20 ngày')
`;

// Work Logs for Project 2
await sql`
  INSERT INTO work_logs (project_id, log_date, description, worker_count, recorded_by) VALUES
  (${id2}, '2026-08-05', 'Thợ đến tháo cánh tủ áo bị lệch mang về xưởng sửa lại. Chủ nhà rất bức xúc đòi hủy hợp đồng.', 3, 'Trần Văn Minh')
`;

console.log(`✅ Success! Created 2 Demo Projects for Analysis:`);
console.log(`   Project 1 VIP PRO (ID: ${id1}) -> https://homepro-manager-psi.vercel.app/projects/${id1}`);
console.log(`   Project 2 ERROR/LOSS (ID: ${id2}) -> https://homepro-manager-psi.vercel.app/projects/${id2}`);
