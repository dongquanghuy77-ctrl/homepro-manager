import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { db } from "./src/db/index";
import { pwrTasks } from "./src/db/schema";
import { sql } from "drizzle-orm";

async function run() {
  try {
    await db.insert(pwrTasks).values([
      {
        userId: 6,
        title: "[DÁN CẠNH] Dán 55 Mét nẹp - Lô Tủ Bếp Mẫu",
        description: "Task tự động tạo để test thuật toán routing Dây chuyền",
        category: "PRODUCTION",
        priority: "HIGH",
        status: "TODO",
        stationTeam: "DAN_CANH",
        tags: ["TEST_ROUTING"],
        startDate: new Date().toISOString().split('T')[0]
      },
      {
        userId: 6,
        title: "[KHOAN CAM] Khoan 24 mũi/chi tiết - Lô Tủ Bếp Mẫu",
        description: "Task tự động tạo để test thuật toán routing Dây chuyền",
        category: "PRODUCTION",
        priority: "HIGH",
        status: "TODO",
        stationTeam: "KHOAN_CAM",
        tags: ["TEST_ROUTING"],
        startDate: new Date().toISOString().split('T')[0]
      }
    ]);
    console.log("Tasks created!");
  } catch(e) {
    console.error("ERROR:", e.message);
  }
  process.exit(0);
}
run();
