import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config({path: '.env.local'});
const sql = neon(process.env.DATABASE_URL);

async function main() {
    console.log("Bắt đầu Reset Bàn Cờ...");
    
    // 1. Xóa toàn bộ lịch sử giao dịch kho
    await sql`DELETE FROM pwr_material_transactions`;
    console.log("Đã xóa sạch pwr_material_transactions (Lịch sử giao dịch)");

    // 2. Reset số lượng Tồn và Giam lỏng về 0
    await sql`UPDATE pwr_materials SET stock_level = 0, reserved_level = 0`;
    console.log("Đã reset Tồn kho và Giam lỏng về 0");

    // 3. Dọn dẹp sạch sẽ toàn bộ các Task và Log cũ để tránh hệ lụy
    await sql`DELETE FROM pwr_work_logs`;
    await sql`DELETE FROM pwr_task_audit_log`;
    await sql`DELETE FROM pwr_checklists`;
    await sql`DELETE FROM pwr_task_dependencies`;
    await sql`DELETE FROM pwr_task_resources`;
    await sql`DELETE FROM pwr_tasks`;
    console.log("Đã xóa sạch toàn bộ Task và Log cũ");

    console.log("RESET THÀNH CÔNG! HỆ THỐNG ĐÃ SẴN SÀNG.");
}

main().catch(console.error);
