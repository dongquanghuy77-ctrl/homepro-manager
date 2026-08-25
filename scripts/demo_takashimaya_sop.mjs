// Demo: Add standardized checklists to Takashimaya project tasks
import pg from 'pg';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const { Client } = pg;
const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  await client.connect();

  // Check existing tasks in Takashimaya
  const tasks = await client.query(`
    SELECT id, title, status, category FROM pwr_tasks
    WHERE project_ref ILIKE '%takashimaya%'
    ORDER BY id;
  `);
  console.log('\n=== TAKASHIMAYA TASKS ===');
  tasks.rows.forEach(t => console.log(`#${t.id} [${t.status}][${t.category}] ${t.title}`));

  // ─── SOP 1: Ra file CNC (task #23) ─────────────────────────────────────────
  // Standard Operating Procedure — Quy trình Ra file CNC chuẩn xưởng
  const task23 = tasks.rows.find(t => t.title.toLowerCase().includes('cnc') && t.title.toLowerCase().includes('file'));
  if (task23) {
    console.log(`\n→ Adding SOP checklist to #${task23.id}: ${task23.title}`);
    
    // Clear existing checklist
    await client.query(`DELETE FROM pwr_checklists WHERE task_id = $1`, [task23.id]);
    
    const sop_cnc = [
      'Nhận và đọc kỹ bản vẽ kỹ thuật từ kỹ sư thiết kế',
      'Kiểm tra vật liệu thực tế so với thông số bản vẽ (dày, rộng, dài)',
      'Chạy thử file trên phần mềm Alphacam / Mastercam (không ra máy)',
      'Xác nhận tọa độ gốc (datum point) và hướng cắt',
      'Chọn dao phù hợp với vật liệu — ghi lại vào log máy',
      'Dry run: Chạy thử không cắt để kiểm tra va chạm',
      'Cắt thử 1 chi tiết mẫu — đo kiểm tra sai số (cho phép ±0.5mm)',
      'Ký duyệt với Quản lý trước khi cắt hàng loạt',
    ];
    
    for (let i = 0; i < sop_cnc.length; i++) {
      await client.query(
        `INSERT INTO pwr_checklists (task_id, content, is_done, position) VALUES ($1, $2, $3, $4)`,
        [task23.id, sop_cnc[i], i === 0, i] // tick bước đầu là đã xong
      );
    }
    console.log(`  ✅ Added ${sop_cnc.length} SOP steps for CNC file output`);
  }

  // ─── SOP 2: Lắp và chuyển hộp gỗ (task #26) ────────────────────────────────
  const task26 = tasks.rows.find(t => t.id === 26 || t.title.toLowerCase().includes('lắp') || t.title.toLowerCase().includes('chuyển'));
  if (task26) {
    console.log(`\n→ Adding SOP checklist to #${task26.id}: ${task26.title}`);
    
    await client.query(`DELETE FROM pwr_checklists WHERE task_id = $1`, [task26.id]);
    
    const sop_install = [
      'Chuẩn bị xe vận chuyển và kiểm tra đầy đủ hộp gỗ theo danh sách',
      'Đóng gói bảo vệ các góc cạnh dễ vỡ trước khi bốc hàng',
      'Bốc hàng lên xe — xếp theo thứ tự lắp đặt để tiện lấy',
      'Di chuyển đến công trình — thông báo cho bên quảng cáo trước 1 tiếng',
      'Kiểm tra mặt bằng lắp đặt và điều kiện tại công trình',
      'Lắp đặt theo bản vẽ kỹ thuật — ghi chú phát sinh (nếu có)',
      'Kiểm tra độ thẳng, độ phẳng và chắc chắn sau khi lắp',
      'Chụp ảnh nghiệm thu trước khi bàn giao cho khách hàng',
    ];
    
    for (let i = 0; i < sop_install.length; i++) {
      await client.query(
        `INSERT INTO pwr_checklists (task_id, content, is_done, position) VALUES ($1, $2, $3, $4)`,
        [task26.id, sop_install[i], false, i]
      );
    }
    console.log(`  ✅ Added ${sop_install.length} SOP steps for installation`);
  }

  // ─── Verify ─────────────────────────────────────────────────────────────────
  const verify = await client.query(`
    SELECT t.id, t.title, COUNT(c.id) as checklist_count
    FROM pwr_tasks t
    LEFT JOIN pwr_checklists c ON c.task_id = t.id
    WHERE t.project_ref ILIKE '%takashimaya%'
    GROUP BY t.id, t.title
    ORDER BY t.id;
  `);
  console.log('\n=== VERIFICATION ===');
  verify.rows.forEach(r => console.log(`#${r.id} — ${r.checklist_count} steps — ${r.title}`));

  await client.end();
  console.log('\n✅ All SOPs inserted into production DB');
}

main().catch(err => { console.error(err); process.exit(1); });
