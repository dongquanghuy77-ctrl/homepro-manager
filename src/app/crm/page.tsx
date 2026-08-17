'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  UserPlus, Users, Briefcase, FileText, FileCheck, 
  TrendingUp, BarChart3, Activity, Target, 
  MapPin, PenTool, Heart, DollarSign, Award,
  ArrowUpRight, Percent, ClipboardList
} from 'lucide-react';

interface DashboardMetrics {
  totalCustomers: number;
  totalLeads: number;
  newLeads: number;
  contactedLeads: number;
  convertedLeads: number;
  conversionRate: number;
  totalOpp: number;
  wonOpportunities: number;
  lostOpportunities: number;
  pipelineValue: number;
  wonRevenue: number;
  winRate: number;
  totalQuotes: number;
  pendingQuotes: number;
  acceptedQuotes: number;
  totalContracts: number;
  signedContracts: number;
  totalSurveys: number;
  totalDesigns: number;
}

const fmt = (n: number) => new Intl.NumberFormat('vi-VN').format(n);
const fmtVND = (n: number) => {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)} tỷ`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(0)} tr`;
  return fmt(n);
};

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  href: string;
  color: string;
  badge?: string;
}

function MetricCard({ title, value, subtitle, icon, href, color, badge }: MetricCardProps) {
  return (
    <Link href={href} className="group block">
      <div className={`bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:border-gray-200 transition-all duration-200 relative overflow-hidden`}>
        <div className={`absolute top-0 right-0 w-24 h-24 rounded-full ${color} opacity-5 -mr-8 -mt-8`} />
        <div className="flex items-start justify-between mb-3">
          <div className={`w-10 h-10 rounded-xl ${color} bg-opacity-10 flex items-center justify-center`}>
            <div className={`${color.replace('bg-', 'text-')}`}>{icon}</div>
          </div>
          {badge && (
            <span className="text-xs font-medium text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">{badge}</span>
          )}
          <ArrowUpRight size={14} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
        </div>
        <div className="mt-1">
          <div className="text-2xl font-bold text-gray-800">{value}</div>
          <div className="text-sm font-medium text-gray-600 mt-0.5">{title}</div>
          {subtitle && <div className="text-xs text-gray-400 mt-1">{subtitle}</div>}
        </div>
      </div>
    </Link>
  );
}

export default function CRMDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalCustomers: 0, totalLeads: 0, newLeads: 0, contactedLeads: 0, convertedLeads: 0,
    conversionRate: 0, totalOpp: 0, wonOpportunities: 0, lostOpportunities: 0,
    pipelineValue: 0, wonRevenue: 0, winRate: 0, totalQuotes: 0, pendingQuotes: 0,
    acceptedQuotes: 0, totalContracts: 0, signedContracts: 0, totalSurveys: 0, totalDesigns: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/crm/dashboard');
        const json = await res.json();
        if (json.success) setMetrics(json.data);
        else setError(json.message || 'Lỗi tải dữ liệu');
      } catch (err) {
        setError('Không thể kết nối API');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const modules = [
    { label: 'Khách hàng', icon: <Users size={18} />, href: '/crm/customers', desc: 'Hồ sơ & lịch sử' },
    { label: 'Lead', icon: <UserPlus size={18} />, href: '/crm/leads', desc: 'Tiếp nhận tiềm năng' },
    { label: 'Cơ hội', icon: <Briefcase size={18} />, href: '/crm/opportunities', desc: 'Pipeline bán hàng' },
    { label: 'Khảo sát', icon: <MapPin size={18} />, href: '/crm/surveys', desc: 'Khảo sát công trình' },
    { label: 'Thiết kế', icon: <PenTool size={18} />, href: '/crm/designs', desc: 'Phiên bản thiết kế' },
    { label: 'BOQ', icon: <ClipboardList size={18} />, href: '/crm/boq', desc: 'Khối lượng công việc' },
    { label: 'Báo giá', icon: <FileText size={18} />, href: '/crm/quotes', desc: 'Báo giá & thương lượng' },
    { label: 'Hợp đồng', icon: <FileCheck size={18} />, href: '/crm/contracts', desc: 'Ký kết & triển khai' },
    { label: 'Chăm sóc KH', icon: <Heart size={18} />, href: '/crm/care', desc: 'Lịch sử tương tác' },
  ];

  if (loading) return (
    <div className="page-container flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-500">Đang tải dữ liệu CRM...</p>
      </div>
    </div>
  );

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <BarChart3 className="text-primary" size={28} />
            Tổng quan CRM
          </h1>
          <p className="page-subtitle">Bán hàng · Dự án · Chăm sóc khách hàng</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>
      )}

      {/* KPI Row 1 — Revenue */}
      <div className="mb-2">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Doanh thu & Pipeline</h2>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard title="Doanh thu đã chốt" value={`${fmtVND(metrics.wonRevenue)}₫`}
          subtitle={`${fmt(metrics.wonOpportunities)} cơ hội đã thắng`}
          icon={<DollarSign size={20} />} href="/crm/opportunities" color="bg-emerald-500" />
        <MetricCard title="Pipeline hiện tại" value={`${fmtVND(metrics.pipelineValue)}₫`}
          subtitle={`${fmt(metrics.totalOpp - metrics.wonOpportunities - metrics.lostOpportunities)} cơ hội đang xử lý`}
          icon={<TrendingUp size={20} />} href="/crm/opportunities" color="bg-blue-500" />
        <MetricCard title="Tỷ lệ thắng" value={`${metrics.winRate}%`}
          subtitle={`${fmt(metrics.wonOpportunities)} thắng / ${fmt(metrics.lostOpportunities)} thua`}
          icon={<Award size={20} />} href="/crm/opportunities" color="bg-amber-500" />
        <MetricCard title="Tỷ lệ chuyển đổi" value={`${metrics.conversionRate}%`}
          subtitle={`${fmt(metrics.convertedLeads)} / ${fmt(metrics.totalLeads)} lead`}
          icon={<Percent size={20} />} href="/crm/leads" color="bg-violet-500" />
      </div>

      {/* KPI Row 2 — Activity */}
      <div className="mb-2">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Hoạt động kinh doanh</h2>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard title="Khách hàng" value={fmt(metrics.totalCustomers)}
          icon={<Users size={20} />} href="/crm/customers" color="bg-teal-500" />
        <MetricCard title="Lead mới" value={fmt(metrics.newLeads)}
          subtitle={`${fmt(metrics.contactedLeads)} đang xử lý`}
          icon={<UserPlus size={20} />} href="/crm/leads" color="bg-orange-500" badge="CẦN XỬ LÝ" />
        <MetricCard title="Báo giá đang chờ" value={fmt(metrics.pendingQuotes)}
          subtitle={`${fmt(metrics.acceptedQuotes)} đã chấp nhận`}
          icon={<FileText size={20} />} href="/crm/quotes" color="bg-sky-500" />
        <MetricCard title="Hợp đồng đã ký" value={fmt(metrics.signedContracts)}
          subtitle={`/ ${fmt(metrics.totalContracts)} tổng số`}
          icon={<FileCheck size={20} />} href="/crm/contracts" color="bg-green-500" />
      </div>

      {/* KPI Row 3 — Process */}
      <div className="mb-2">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Quy trình dự án</h2>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard title="Cơ hội tổng" value={fmt(metrics.totalOpp)}
          icon={<Briefcase size={20} />} href="/crm/opportunities" color="bg-blue-500" />
        <MetricCard title="Khảo sát" value={fmt(metrics.totalSurveys)}
          icon={<MapPin size={20} />} href="/crm/surveys" color="bg-rose-500" />
        <MetricCard title="Thiết kế" value={fmt(metrics.totalDesigns)}
          icon={<PenTool size={20} />} href="/crm/designs" color="bg-purple-500" />
        <MetricCard title="Tổng Lead" value={fmt(metrics.totalLeads)}
          icon={<Activity size={20} />} href="/crm/leads" color="bg-indigo-500" />
      </div>

      {/* Module Quick Access */}
      <div className="mb-2">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Truy cập nhanh</h2>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-9 gap-3">
        {modules.map(m => (
          <Link key={m.href} href={m.href}
            className="flex flex-col items-center gap-2 p-3 bg-white border border-gray-100 rounded-xl hover:border-primary/30 hover:shadow-md transition-all group text-center">
            <div className="w-9 h-9 rounded-lg bg-primary/5 group-hover:bg-primary/10 flex items-center justify-center text-primary transition-colors">
              {m.icon}
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-700 leading-tight">{m.label}</div>
              <div className="text-[10px] text-gray-400 mt-0.5 hidden sm:block">{m.desc}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
