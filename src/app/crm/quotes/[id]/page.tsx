'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, FileText, Send, CheckCircle2, Download, Printer, Plus, Trash2, Edit2, Save } from 'lucide-react';

export default function QuoteDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [quote, setQuote] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/crm/quotes/${id}`);
        const json = await res.json();
        if (json.success) {
          setQuote(json.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) return <div className="page-container p-8 text-center text-gray-500">Đang tải dữ liệu báo giá...</div>;
  if (!quote) return <div className="page-container p-8 text-center text-red-500">Không tìm thấy báo giá.</div>;

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
              {quote.quoteNumber}
              <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                Phiên bản {quote.version}
              </span>
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Khách hàng ID: <span className="font-medium text-gray-800">{quote.customerId}</span> | Cơ hội ID: {quote.opportunityId || '—'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn btn-secondary flex items-center gap-2"><Printer size={16}/> In</button>
          <button className="btn btn-secondary flex items-center gap-2"><Download size={16}/> PDF</button>
          {quote.status === 'DRAFT' && (
            <button className="btn btn-primary flex items-center gap-2"><Send size={16}/> Gửi Khách hàng</button>
          )}
          {quote.status === 'NEGOTIATING' && (
            <button className="btn btn-success flex items-center gap-2 bg-emerald-600 text-white hover:bg-emerald-700"><CheckCircle2 size={16}/> Chốt báo giá</button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: General Info */}
        <div className="lg:col-span-1 space-y-6">
          <div className="card p-5">
            <h3 className="font-bold text-gray-800 mb-4 text-sm uppercase tracking-wider">Thông tin chung</h3>
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-gray-500 mb-1">Trạng thái</p>
                <span className="px-2.5 py-1 text-xs font-medium bg-gray-100 rounded-full">{quote.status}</span>
              </div>
              <div>
                <p className="text-gray-500 mb-1">Ngày lập</p>
                <p className="font-medium text-gray-800">{new Date(quote.createdAt).toLocaleDateString('vi-VN')}</p>
              </div>
              <div>
                <p className="text-gray-500 mb-1">Hiệu lực đến</p>
                <p className="font-medium text-gray-800">{quote.validUntil ? new Date(quote.validUntil).toLocaleDateString('vi-VN') : '—'}</p>
              </div>
              <hr className="border-gray-100" />
              <div>
                <p className="text-gray-500 mb-1">Điều khoản thanh toán</p>
                <p className="font-medium text-gray-800">{quote.paymentTerms || 'Theo hợp đồng'}</p>
              </div>
              <div>
                <p className="text-gray-500 mb-1">Thời gian thi công</p>
                <p className="font-medium text-gray-800">{quote.productionTime || '—'}</p>
              </div>
            </div>
          </div>
          
          <div className="card p-5 bg-gradient-to-br from-gray-800 to-gray-900 text-white">
            <h3 className="font-bold mb-4 text-sm uppercase tracking-wider text-gray-300">Tổng kết Giá trị</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">Giá vốn (Cost)</span>
                <span>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(quote.costAmount || 0)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">Lợi nhuận gộp</span>
                <span className="text-green-400">+{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(quote.margin || 0)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">VAT (10%)</span>
                <span>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(quote.vat || 0)}</span>
              </div>
              <hr className="border-gray-700" />
              <div>
                <p className="text-gray-400 text-sm mb-1">Tổng cộng (Khách phải trả)</p>
                <p className="text-3xl font-bold text-white">
                  {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(quote.totalAmount || 0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Items */}
        <div className="lg:col-span-2">
          <div className="card p-6 min-h-[500px]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-lg text-gray-800">Chi tiết Hạng mục</h3>
              {quote.status === 'DRAFT' && (
                <button className="btn btn-primary btn-sm flex items-center gap-2">
                  <Plus size={16}/> Thêm hạng mục
                </button>
              )}
            </div>

            {/* Empty State */}
            <div className="flex flex-col items-center justify-center h-64 text-gray-400 border-2 border-dashed border-gray-100 rounded-xl bg-gray-50/50">
              <FileText size={48} className="mb-4 opacity-20" />
              <p>Chưa có hạng mục báo giá nào.</p>
              {quote.status === 'DRAFT' && (
                <p className="text-sm mt-2">Bấm "Thêm hạng mục" hoặc "Import từ BOQ" để bắt đầu.</p>
              )}
            </div>

            {/* Notes */}
            <div className="mt-8">
              <h4 className="font-bold text-sm text-gray-800 mb-2">Ghi chú báo giá:</h4>
              <div className="p-4 bg-gray-50 border border-gray-100 rounded-lg text-sm text-gray-600 whitespace-pre-line">
                {quote.notes || 'Không có ghi chú.'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
