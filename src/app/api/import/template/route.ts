import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const csvContent = `\uFEFF"Mã dự án","Tên dự án","Khách hàng","Quản lý","Địa điểm","Hợp đồng (VND)","Ngày bắt đầu dự án","Deadline dự án","Ghi chú dự án","Hạng mục công việc","Tên công việc","Người phụ trách","Ngày bắt đầu task","Hạn công việc","Ưu tiên","Trạng thái","Tiến độ %","Ghi chú task"
"DA-2026-002","Biệt thự chị Lan","Nguyễn Thị Lan","Huy","Quận 2, TP.HCM","450000000","2026-08-01","2026-10-30","Dự án nội thất toàn bộ biệt thự phong cách Tân Cổ Điển","Thiết kế","Khảo sát & Đo đạc công trình","Huy","2026-08-01","2026-08-05","HIGH","COMPLETED","100","Đã xong bản vẽ hiện trạng"
"DA-2026-002","Biệt thự chị Lan","Nguyễn Thị Lan","Huy","Quận 2, TP.HCM","450000000","2026-08-01","2026-10-30","Dự án nội thất toàn bộ biệt thự phong cách Tân Cổ Điển","Thiết kế","Thiết kế 3D phòng khách & bếp","Huy","2026-08-06","2026-08-15","HIGH","IN_PROGRESS","70","Chờ khách duyệt màu sơn"
"DA-2026-002","Biệt thự chị Lan","Nguyễn Thị Lan","Huy","Quận 2, TP.HCM","450000000","2026-08-01","2026-10-30","Dự án nội thất toàn bộ biệt thự phong cách Tân Cổ Điển","Vật tư","Đặt mua gỗ An Cường & Phụ kiện Blum","Tuấn","2026-08-10","2026-08-25","HIGH","NOT_STARTED","0",""
"DA-2026-002","Biệt thự chị Lan","Nguyễn Thị Lan","Huy","Quận 2, TP.HCM","450000000","2026-08-01","2026-10-30","Dự án nội thất toàn bộ biệt thự phong cách Tân Cổ Điển","Thi công","Thi công tủ bếp & Đảo bếp","Minh","2026-08-26","2026-09-20","MEDIUM","NOT_STARTED","0",""
"DA-2026-002","Biệt thự chị Lan","Nguyễn Thị Lan","Huy","Quận 2, TP.HCM","450000000","2026-08-01","2026-10-30","Dự án nội thất toàn bộ biệt thự phong cách Tân Cổ Điển","QC","Nghiệm thu chất lượng & Lắp đặt","Huy","2026-09-21","2026-10-25","HIGH","NOT_STARTED","0",""
`;

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="Mau_Nhap_Lieu_HomePro.csv"',
    },
  });
}
