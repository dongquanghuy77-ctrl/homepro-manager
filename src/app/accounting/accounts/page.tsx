import React from 'react';
import Link from 'next/link';
import { db } from '@/db';
import { accounts } from '@/db/schema';
import { requirePermission } from '@/lib/rbac/requirePermission';
import { redirect } from 'next/navigation';
import { asc } from 'drizzle-orm';

export default async function AccountsPage() {
  const rbac = await requirePermission('SYSTEM_ADMIN');
  if (!rbac.allowed) {
    // Ideally redirect to 403 or home
    redirect('/');
  }

  const allAccounts = await db.query.accounts.findMany({
    orderBy: [asc(accounts.code)],
  });

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Sổ cái Kế toán (Chart of Accounts)</h1>
        <div className="space-x-4">
          <Link href="/accounting/journal-entries" className="text-blue-600 hover:underline">
            Xem Phiếu hạch toán (Journal Entries)
          </Link>
        </div>
      </div>

      <div className="bg-white rounded shadow p-4 overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="p-2">Tài khoản</th>
              <th className="p-2">Tên</th>
              <th className="p-2">Loại</th>
              <th className="p-2">Nhóm?</th>
              <th className="p-2">Tiền tệ</th>
              <th className="p-2">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {allAccounts.map(acc => (
              <tr key={acc.id} className="border-b hover:bg-gray-50">
                <td className={`p-2 ${acc.isGroup ? 'font-bold' : 'pl-6'}`}>{acc.code}</td>
                <td className={`p-2 ${acc.isGroup ? 'font-bold' : ''}`}>{acc.name}</td>
                <td className="p-2">{acc.type}</td>
                <td className="p-2">{acc.isGroup ? 'CÓ' : 'KHÔNG'}</td>
                <td className="p-2">{acc.currency}</td>
                <td className="p-2">
                  <span className="px-2 py-1 rounded bg-green-100 text-green-800 text-xs">
                    {acc.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
