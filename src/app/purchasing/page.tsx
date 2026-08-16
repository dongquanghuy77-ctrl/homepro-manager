'use client';

import Link from 'next/link';
import { FileText, ShoppingCart, Users } from 'lucide-react';

const PURCHASING_MODULES = [
  { href: '/purchasing/requests', icon: FileText, title: 'Yêu cầu mua hàng (PR)', desc: 'Tiếp nhận yêu cầu mua vật tư từ sản xuất.' },
  { href: '/purchasing/orders', icon: ShoppingCart, title: 'Đơn đặt hàng (PO)', desc: 'Lập và theo dõi đơn mua hàng với nhà cung cấp.' },
  { href: '/inventory/suppliers', icon: Users, title: 'Nhà cung cấp', desc: 'Quản lý danh sách đối tác cung cấp vật tư.' },
];

export default function PurchasingDashboard() {
  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Mua hàng & Nhà cung cấp</h1>
          <p className="page-subtitle">Quản lý toàn bộ quy trình mua sắm vật tư thiết bị</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
        {PURCHASING_MODULES.map((mod, idx) => (
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
