import { Activity, Settings, Users, PieChart } from 'lucide-react';

export const metadata = {
  title: 'Dashboard sản xuất | HomePro ERP',
};

export default function ProductionDashboardPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Dashboard sản xuất</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6 flex items-center space-x-4">
          <div className="p-3 bg-blue-100 rounded-lg text-blue-600">
            <Activity className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-semibold">Lệnh SX đang chạy</p>
            <h3 className="text-2xl font-bold text-gray-900">12</h3>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 flex items-center space-x-4">
          <div className="p-3 bg-green-100 rounded-lg text-green-600">
            <PieChart className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-semibold">Tỷ lệ hoàn thành</p>
            <h3 className="text-2xl font-bold text-gray-900">85%</h3>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 flex items-center space-x-4">
          <div className="p-3 bg-orange-100 rounded-lg text-orange-600">
            <Settings className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-semibold">Máy đang hoạt động</p>
            <h3 className="text-2xl font-bold text-gray-900">8 / 10</h3>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 flex items-center space-x-4">
          <div className="p-3 bg-purple-100 rounded-lg text-purple-600">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-semibold">Nhân sự ca này</p>
            <h3 className="text-2xl font-bold text-gray-900">45</h3>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 bg-gray-50 border-b">
          <h2 className="font-semibold text-lg">Biểu đồ hiệu suất</h2>
        </div>
        <div className="p-6">
          <div className="h-[400px] flex items-center justify-center border-2 border-dashed border-gray-200 rounded-lg text-gray-400">
            [Biểu đồ phân tích sản xuất]
          </div>
        </div>
      </div>
    </div>
  );
}
