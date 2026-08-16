'use client';

import Link from 'next/link';
import { UserPlus, Users, Briefcase, FileText, FileCheck } from 'lucide-react';

const CRM_MODULES = [
  { href: '/crm/leads', icon: UserPlus, title: 'Leads (Khách tiềm năng)', desc: 'Thu thập và quản lý danh sách khách hàng tiềm năng.' },
  { href: '/crm/customers', icon: Users, title: 'Khách hàng', desc: 'Danh bạ chủ đầu tư và khách hàng chính thức.' },
  { href: '/crm/opportunities', icon: Briefcase, title: 'Cơ hội bán hàng', desc: 'Theo dõi tiến trình và tỷ lệ chốt sales.' },
  { href: '/crm/quotes', icon: FileText, title: 'Báo giá', desc: 'Lập và quản lý báo giá gửi khách hàng.' },
  { href: '/crm/contracts', icon: FileCheck, title: 'Hợp đồng', desc: 'Quản lý hợp đồng đã ký kết.' },
];

export default function CRMDashboard() {
  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Kinh doanh & CRM</h1>
          <p className="page-subtitle">Quản lý toàn bộ quy trình từ Lead đến Hợp đồng</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
        {CRM_MODULES.map((mod, idx) => (
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
