'use client';

import Link from 'next/link';
import { PenTool, MapPin, CheckSquare, Send } from 'lucide-react';

const ENGINEERING_MODULES = [
  { href: '/engineering/surveys', icon: MapPin, title: 'Khảo sát', desc: 'Lịch khảo sát và báo cáo hiện trạng.' },
  { href: '/engineering/designs', icon: PenTool, title: 'Thiết kế & Bản vẽ', desc: 'Quản lý các bản vẽ 2D, 3D, chi tiết kỹ thuật.' },
  { href: '/engineering/approvals', icon: CheckSquare, title: 'Duyệt mẫu', desc: 'Theo dõi tiến độ duyệt thiết kế, mẫu vật liệu với khách hàng.' },
  { href: '/engineering/production-releases', icon: Send, title: 'Phát hành sản xuất', desc: 'Lệnh phát hành bản vẽ thi công xuống xưởng sản xuất.' },
];

export default function EngineeringDashboard() {
  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Thiết kế & Kỹ thuật</h1>
          <p className="page-subtitle">Quản lý toàn bộ quy trình từ Khảo sát đến Phát hành sản xuất</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        {ENGINEERING_MODULES.map((mod, idx) => (
          <Link key={idx} href={mod.href} className="card p-6 hover:shadow-lg transition-all cursor-pointer border border-transparent hover:border-primary/20 block">
            <div className="flex items-center gap-4 mb-3">
              <div className="p-3 bg-primary/10 text-primary rounded-xl">
                <mod.icon size={24} />
              </div>
              <h3 className="font-bold text-gray-800 text-lg">{mod.title}</h3>
            </div>
            <p className="text-gray-500 text-sm">{mod.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
