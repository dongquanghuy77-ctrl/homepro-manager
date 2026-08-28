const { Client } = require("pg");
const DB = "postgresql://neondb_owner:npg_dbPWisDQA8F6@ep-floral-union-az31v0st.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";

async function main() {
  const client = new Client({ connectionString: DB });
  await client.connect();

  // Get userId = 1
  const userRes = await client.query("SELECT id FROM users LIMIT 1");
  const userId = userRes.rows[0]?.id;
  if (!userId) { console.log("No user found"); process.exit(1); }

  const today = new Date().toISOString().split("T")[0];
  // Next week dates
  function addDays(n) {
    const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().split("T")[0];
  }

  const ops = [
    { title:"Bao duong may CNC hang tuan", category:"EQUIPMENT", priority:"HIGH", description:"Kiem tra va ve sinh may CNC truoc khi bat dau tuan lam viec moi.", due: addDays(2), tags: ["van-hanh","may-cnc","bao-duong"] },
    { title:"Kiem ke kho vat tu dau thang", category:"MATERIAL", priority:"HIGH", description:"Kiem ke so luong van, go, phu kien trong kho. Cap nhat ton kho.", due: addDays(3), tags: ["van-hanh","kho","kiem-ke"] },
    { title:"Hop giao ban tuan - Thu 2", category:"PERSONNEL", priority:"HIGH", description:"Giao ban cong viec tuan moi: tien do du an, phan cong nhan su, van de can xu ly.", due: addDays(1), tags: ["van-hanh","hop","giao-ban"] },
    { title:"Cham cong cuoi tuan", category:"PERSONNEL", priority:"MEDIUM", description:"Tong hop cong lam viec cua toan to trong tuan, xuat bang cham cong.", due: addDays(5), tags: ["van-hanh","cham-cong"] },
    { title:"Ve sinh xuong truoc khi nghi", category:"PRODUCTION", priority:"MEDIUM", description:"Tong ve sinh may moc, xuong san xuat, don dep dung cu cuoi tuan.", due: addDays(6), tags: ["van-hanh","ve-sinh","xuong"] },
    { title:"Dat vat tu can bo sung", category:"MATERIAL", priority:"HIGH", description:"Kiem tra danh sach vat tu thieu, lien he nha cung cap dat hang cho tuan toi.", due: addDays(2), tags: ["van-hanh","mua-hang","vat-tu"] },
    { title:"Bao duong may cua panel saw", category:"EQUIPMENT", priority:"MEDIUM", description:"Kiem tra luoi cua, dau mo trum, bao duong may cuoc dinh ky thang.", due: addDays(14), tags: ["van-hanh","may-cua","bao-duong"] },
    { title:"Kiem tra he thong dien xuong", category:"EQUIPMENT", priority:"MEDIUM", description:"Kiem tra toan bo he thong dien, cau dau, o cam, bao ve qua tai trong xuong.", due: addDays(7), tags: ["van-hanh","dien","an-toan"] },
    { title:"Tra luong nhan vien cuoi thang", category:"PERSONNEL", priority:"HIGH", description:"Tinh luong, thuong, khau tru theo bang cham cong. Chuyen khoan hoac tra tien mat.", due: addDays(10), tags: ["van-hanh","luong","tai-chinh"] },
    { title:"Kiem tra PCCC va thoat hiem xuong", category:"EQUIPMENT", priority:"MEDIUM", description:"Kiem tra binh chua chay, loi thoat hiem, bien bao an toan trong xuong hang thang.", due: addDays(21), tags: ["van-hanh","an-toan","pccc"] },
  ];

  let inserted = 0;
  for (const op of ops) {
    const tagsStr = `{${op.tags.map(t => `"${t}"`).join(",")}}`;
    await client.query(`
      INSERT INTO pwr_tasks (user_id, title, category, priority, status, description, due_date, tags, source, task_type, created_at, updated_at)
      VALUES ($1, $2, $3, $4, 'TODO', $5, $6, $7, 'SELF', 'OPERATIONAL_TASK', NOW(), NOW())
      ON CONFLICT DO NOTHING
    `, [userId, op.title, op.category, op.priority, op.description, op.due, tagsStr]);
    inserted++;
    console.log(`Inserted: ${op.title}`);
  }
  console.log(`\nDone: ${inserted} operational tasks seeded for userId=${userId}`);
  await client.end();
}

main().catch(e => { console.error(e); process.exit(1); });
