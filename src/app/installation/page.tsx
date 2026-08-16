'use client';

import Link from 'next/link';
import { CalendarDays, FileCheck, Truck } from 'lucide-react';

const INSTALLATION_MODULES = [
  { href: '/installation/schedules', icon: CalendarDays, title: 'Lịch Lắp Đặt', desc: 'Sắp xếp, phân công và theo dõi tiến độ lắp đặt tại dự án.' },
  { href: '/installation/kcs', icon: FileCheck, title: 'Nghiệm Thu (KCS)', desc: 'Ghi nhận kết quả nghiệm thu chất lượng công trình.' },
];

export default function InstallationDashboard() {
  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Lắp đặt & Bàn giao</h1>
          <p className="page-subtitle">Quản lý đội thi công, lịch trình và biên bản nghiệm thu</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
        {INSTALLATION_MODULES.map((mod, idx) => (
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
