import { NextResponse } from 'next/server';
import { db } from '@/db';
import { pwrProjects, pwrTasks } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { requireAuth, ALL_ROLES } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// ─── 41-task standard template ────────────────────────────────────────────────
const TEMPLATE_41: Array<{ title: string; category: string; priority: string; phase: number; description: string }> = [
  // PHASE 1 — Tiếp nhận & Khảo sát (5 task)
  { phase:1, category:'ORDER',      priority:'HIGH',   title:'Tiếp nhận yêu cầu và thông tin khách hàng',         description:'Thu thập thông tin dự án: diện tích, phong cách, ngân sách, timeline khách hàng mong muốn.' },
  { phase:1, category:'PROJECT',    priority:'HIGH',   title:'Khảo sát thực địa công trình',                       description:'Đo đạc hiện trạng, chụp ảnh, ghi chú đặc điểm kết cấu cần lưu ý.' },
  { phase:1, category:'ORDER',      priority:'MEDIUM', title:'Lập danh sách hạng mục sơ bộ (BOQ draft)',           description:'Liệt kê sơ bộ các hạng mục nội thất cần sản xuất và lắp đặt.' },
  { phase:1, category:'ADMIN',      priority:'MEDIUM', title:'Xác nhận yêu cầu và ký biên bản khảo sát',           description:'Khách hàng ký xác nhận biên bản khảo sát trước khi triển khai thiết kế.' },
  { phase:1, category:'PROJECT',    priority:'MEDIUM', title:'Mở hồ sơ dự án và lưu trữ tài liệu ban đầu',        description:'Tạo folder dự án, lưu biên bản, ảnh khảo sát, thông tin khách hàng.' },

  // PHASE 2 — Thiết kế & Báo giá (6 task)
  { phase:2, category:'PROJECT',    priority:'HIGH',   title:'Vẽ bản vẽ thiết kế 2D/3D',                          description:'Thiết kế layout mặt bằng, mặt đứng, phối cảnh 3D theo yêu cầu khách.' },
  { phase:2, category:'PROJECT',    priority:'HIGH',   title:'Chọn vật liệu và hoàn thiện bản vẽ kỹ thuật',       description:'Xác định loại gỗ, vật liệu ốp, phụ kiện, màu sơn, hoàn thiện bản vẽ thi công.' },
  { phase:2, category:'ORDER',      priority:'HIGH',   title:'Lập báo giá chi tiết (BOQ chính thức)',              description:'Tính toán đơn giá, nhân công, vật tư, lợi nhuận. Xuất file báo giá PDF.' },
  { phase:2, category:'ORDER',      priority:'HIGH',   title:'Thuyết trình và chỉnh sửa thiết kế theo phản hồi',  description:'Gặp khách trình bày phương án, ghi nhận yêu cầu chỉnh sửa, cập nhật bản vẽ.' },
  { phase:2, category:'ADMIN',      priority:'HIGH',   title:'Ký hợp đồng thi công và thu cọc',                   description:'Soạn hợp đồng, ký kết, thu tiền đặt cọc theo tỷ lệ thỏa thuận.' },
  { phase:2, category:'PROJECT',    priority:'MEDIUM', title:'Phát hành bản vẽ thi công chính thức',              description:'Đóng dấu "Đã duyệt" bản vẽ, gửi cho bộ phận sản xuất và lắp đặt.' },

  // PHASE 3 — Chuẩn bị sản xuất (8 task)
  { phase:3, category:'MATERIAL',   priority:'HIGH',   title:'Lập danh sách vật tư cần mua (BOM)',                description:'Tổng hợp toàn bộ vật tư: tấm gỗ, phụ kiện, vít, keo, sơn theo bản vẽ.' },
  { phase:3, category:'MATERIAL',   priority:'HIGH',   title:'Đặt mua vật tư còn thiếu',                          description:'Liên hệ nhà cung cấp, đặt hàng, xác nhận thời gian giao hàng.' },
  { phase:3, category:'MATERIAL',   priority:'HIGH',   title:'Nhận vật tư và kiểm tra chất lượng',                description:'Kiểm tra số lượng, quy cách, chất lượng vật tư khi nhận. Ghi biên bản bàn giao kho.' },
  { phase:3, category:'PRODUCTION', priority:'HIGH',   title:'Lên kế hoạch sản xuất chi tiết',                    description:'Phân công ca máy, nhân lực, thứ tự sản xuất từng hạng mục theo deadline.' },
  { phase:3, category:'PROJECT',    priority:'HIGH',   title:'Ra file CNC (Nesting & Cutting List)',               description:'Xuất file từ phần mềm thiết kế, tối ưu nesting tiết kiệm vật liệu.' },
  { phase:3, category:'EQUIPMENT',  priority:'MEDIUM', title:'Kiểm tra và chuẩn bị máy móc thiết bị',             description:'Vệ sinh, bảo dưỡng máy CNC, máy cưa, máy chà nhám trước khi vào ca sản xuất.' },
  { phase:3, category:'PERSONNEL',  priority:'MEDIUM', title:'Phân công nhân sự và giao ca sản xuất',             description:'Lập lịch ca làm việc, phân công thợ theo từng hạng mục cụ thể.' },
  { phase:3, category:'PRODUCTION', priority:'MEDIUM', title:'Chuẩn bị khu vực sản xuất và mẫu kiểm tra',        description:'Dọn dẹp xưởng, chuẩn bị jig gá lắp, cắt thử mẫu kiểm tra sai số trước khi chạy hàng loạt.' },

  // PHASE 4 — Sản xuất tại xưởng (9 task)
  { phase:4, category:'PRODUCTION', priority:'HIGH',   title:'Cắt tấm CNC và ván công nghiệp',                   description:'Chạy máy CNC cắt các chi tiết theo file đã ra. Kiểm tra sai số từng lô.' },
  { phase:4, category:'PRODUCTION', priority:'HIGH',   title:'Dán cạnh (edgebanding) và gia công hoàn thiện',    description:'Dán cạnh PVC/ABS, phay rãnh, khoan lỗ bản lề theo bản vẽ.' },
  { phase:4, category:'PRODUCTION', priority:'HIGH',   title:'Gia công chi tiết thủ công và đặc biệt',           description:'Làm các chi tiết đòi hỏi thủ công: cong, chạm khắc, uốn, bo góc.' },
  { phase:4, category:'PRODUCTION', priority:'HIGH',   title:'Lắp ráp thử (trial assembly) tại xưởng',           description:'Lắp thử từng bộ tủ/kệ để kiểm tra khớp nối, khe hở, thẩm mỹ trước khi sơn.' },
  { phase:4, category:'PRODUCTION', priority:'HIGH',   title:'Sơn phủ hoàn thiện (paint & finish)',               description:'Sơn lót, sơn màu, phủ PU/UV theo màu khách chọn. Kiểm tra độ bóng, màu sắc.' },
  { phase:4, category:'PRODUCTION', priority:'MEDIUM', title:'Lắp phụ kiện (ray hộp, bản lề, tay nắm)',          description:'Lắp đầy đủ phụ kiện theo bản vẽ: ray Blum/Hettich, bản lề, tay nắm, đèn LED.' },
  { phase:4, category:'PRODUCTION', priority:'HIGH',   title:'Kiểm tra chất lượng (QC) tại xưởng',              description:'KCS kiểm tra từng sản phẩm: kích thước, màu sắc, chức năng, hoàn thiện bề mặt.' },
  { phase:4, category:'MATERIAL',   priority:'MEDIUM', title:'Đóng gói và ghi nhãn sản phẩm',                    description:'Bọc mút/thùng carton, ghi nhãn từng hộp: tên hạng mục, vị trí lắp đặt, số thứ tự.' },
  { phase:4, category:'PRODUCTION', priority:'HIGH',   title:'Xuất kho và bàn giao xe vận chuyển',               description:'Lập phiếu xuất kho, bàn giao cho đội vận chuyển, kiểm đếm trước khi lên xe.' },

  // PHASE 5 — Bàn giao công trình (8 task)
  { phase:5, category:'PRODUCTION', priority:'HIGH',   title:'Vận chuyển hàng đến công trình',                   description:'Theo dõi vận chuyển, đảm bảo an toàn hàng hóa, xác nhận đến nơi nguyên vẹn.' },
  { phase:5, category:'PRODUCTION', priority:'HIGH',   title:'Bốc dỡ và sắp xếp hàng tại công trình',           description:'Bốc dỡ cẩn thận, đưa vào đúng vị trí phòng, kiểm tra lại số lượng hộp.' },
  { phase:5, category:'PRODUCTION', priority:'HIGH',   title:'Lắp đặt nội thất tại công trình',                  description:'Lắp đặt theo bản vẽ, cân chỉnh thủy bình, cố định vào tường/sàn.' },
  { phase:5, category:'PRODUCTION', priority:'HIGH',   title:'Lắp đặt phụ kiện và hệ thống điện nội thất',      description:'Lắp đèn LED, ổ điện âm tủ, hệ thống mở hơi (Servo, Aventos).' },
  { phase:5, category:'PRODUCTION', priority:'HIGH',   title:'Vệ sinh và hoàn thiện sau lắp đặt',               description:'Lau sạch bụi bẩn, tháo băng dính bảo vệ, kiểm tra lần cuối trước bàn giao.' },
  { phase:5, category:'PRODUCTION', priority:'HIGH',   title:'Nghiệm thu chất lượng tại công trình (KCS)',       description:'KCS kiểm tra lần cuối: chức năng, thẩm mỹ, an toàn. Chụp ảnh nghiệm thu.' },
  { phase:5, category:'ADMIN',      priority:'HIGH',   title:'Bàn giao và ký biên bản nghiệm thu với khách',    description:'Khách hàng kiểm tra, ký biên bản bàn giao, ghi nhận các điểm cần xử lý (nếu có).' },
  { phase:5, category:'ADMIN',      priority:'MEDIUM', title:'Xử lý các điểm chỉnh sửa sau nghiệm thu',         description:'Khắc phục tất cả điểm khách yêu cầu chỉnh sửa trong vòng thời gian cam kết.' },

  // PHASE 6 — Kết sổ & Lưu trữ (5 task)
  { phase:6, category:'ADMIN',      priority:'HIGH',   title:'Xuất hóa đơn và thu tiền quyết toán',             description:'Xuất hóa đơn GTGT, thu phần còn lại theo tiến độ hợp đồng.' },
  { phase:6, category:'ORDER',      priority:'MEDIUM', title:'Chăm sóc khách hàng sau bàn giao (after-sales)',  description:'Liên hệ sau 1 tuần, 1 tháng để hỏi thăm, xử lý phát sinh bảo hành (nếu có).' },
  { phase:6, category:'ADMIN',      priority:'MEDIUM', title:'Lưu trữ hồ sơ dự án hoàn chỉnh',                 description:'Scan và lưu: hợp đồng, bản vẽ, biên bản, hóa đơn vào hệ thống.' },
  { phase:6, category:'PROJECT',    priority:'MEDIUM', title:'Tổng kết dự án: chi phí, lợi nhuận, bài học',     description:'So sánh doanh thu vs chi phí thực tế. Ghi nhận bài học kinh nghiệm cho dự án sau.' },
  { phase:6, category:'ORDER',      priority:'LOW',    title:'Xin đánh giá và phản hồi từ khách hàng',          description:'Nhờ khách để lại đánh giá, xin ảnh công trình hoàn thiện để làm portfolio.' },
];

// ─── GET: Danh sách dự án ────────────────────────────────────────────────────
export async function GET(req: Request) {
  try {
    const { session, error } = await requireAuth(req as any, ALL_ROLES);
    if (error) return error;

    const projects = await db.select().from(pwrProjects)
      .where(eq(pwrProjects.userId, session.id))
      .orderBy(desc(pwrProjects.createdAt));

    return NextResponse.json({ projects });
  } catch (err) {
    console.error('GET /api/pwr/projects:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// ─── POST: Tạo dự án mới (+ optional 41-task template) ──────────────────────
export async function POST(req: Request) {
  try {
    const { session, error } = await requireAuth(req as any, ALL_ROLES);
    if (error) return error;

    const body = await req.json();
    const { name, customer, deadline, notes, color, applyTemplate } = body;

    if (!name?.trim()) return NextResponse.json({ error: 'Tên dự án không được để trống' }, { status: 400 });

    // 1. Tạo project record
    const [project] = await db.insert(pwrProjects).values({
      userId:   session.id,
      name:     name.trim(),
      ...(customer ? { customer: customer.trim() } : {}),
      ...(deadline  ? { deadline } : {}),
      ...(notes     ? { notes: notes.trim() } : {}),
      ...(color     ? { color } : {}),
    } as any).returning();

    // 2. Nếu applyTemplate=true → tạo 41 task chuẩn
    let createdTasks = 0;
    if (applyTemplate) {
      const taskValues = TEMPLATE_41.map((t, idx) => ({
        userId:      session.id,
        title:       t.title,
        description: t.description,
        category:    t.category,
        priority:    t.priority,
        status:      'TODO' as const,
        projectRef:  name.trim(),
        source:      'SELF' as const,
        tags:        [`giai-doan-${t.phase}`],
      }));

      await db.insert(pwrTasks).values(taskValues as any);
      createdTasks = taskValues.length;
    }

    return NextResponse.json({ project, createdTasks }, { status: 201 });
  } catch (err) {
    console.error('POST /api/pwr/projects:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
