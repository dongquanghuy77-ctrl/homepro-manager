import React from 'react';
import Link from 'next/link';
import { db } from '@/db';
import { journalEntries } from '@/db/schema';
import { requirePermission } from '@/lib/rbac/requirePermission';
import { redirect } from 'next/navigation';
import { desc } from 'drizzle-orm';

import { ReverseButton } from './ReverseButton';

export default async function JournalEntriesPage() {
  const rbac = await requirePermission('SYSTEM_ADMIN');
  if (!rbac.allowed) {
    redirect('/');
  }

  const entries = await db.query.journalEntries.findMany({
    orderBy: [desc(journalEntries.postingDate), desc(journalEntries.id)],
    limit: 100,
    with: {
      period: true,
      lines: {
        with: {
          account: true,
          project: true,
          department: true,
        }
      }
    }
  });

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Phiếu Hạch Toán (Journal Entries)</h1>
        <div className="space-x-4">
          <Link href="/accounting/accounts" className="text-blue-600 hover:underline">
            Về Sổ cái (Chart of Accounts)
          </Link>
        </div>
      </div>

      <div className="space-y-6">
        {entries.length === 0 ? (
          <div className="bg-white p-6 rounded shadow text-center text-gray-500">
            Chưa có Phiếu hạch toán nào. Hãy thử Publish Bảng lương.
          </div>
        ) : (
          entries.map(je => (
            <div key={je.id} className="bg-white rounded shadow p-4">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-blue-800">{je.entryNo}</h3>
                  <div className="text-sm text-gray-600">
                    Ngày: {je.postingDate} | Kỳ: {je.period?.name} | Reference: {je.referenceType} #{je.referenceId}
                  </div>
                  <div className="text-xs text-gray-500">
                    Tạo bởi: ID {je.createdBy || 'System'} | Post bởi: ID {je.postedBy || 'System'} {je.postedAt ? `lúc ${new Date(je.postedAt).toLocaleString()}` : ''}
                  </div>
                  {je.description && <div className="text-sm italic mt-1">{je.description}</div>}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${je.status === 'POSTED' ? 'bg-green-100 text-green-800' : je.status === 'DRAFT' ? 'bg-yellow-100 text-yellow-800' : je.status === 'REVERSED' ? 'bg-gray-100 text-gray-800' : 'bg-red-100 text-red-800'}`}>
                    {je.status}
                  </span>
                  {je.status === 'POSTED' && (
                    <ReverseButton id={je.id} periodId={je.periodId} isReversed={false} />
                  )}
                  {je.status === 'REVERSED' && (
                    <ReverseButton id={je.id} periodId={je.periodId} isReversed={true} />
                  )}
                </div>
              </div>
              
              <table className="w-full text-sm text-left border-collapse border border-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="border border-gray-200 p-2">Tài khoản</th>
                    <th className="border border-gray-200 p-2">Tên TK</th>
                    <th className="border border-gray-200 p-2 text-right">Nợ (Debit)</th>
                    <th className="border border-gray-200 p-2 text-right">Có (Credit)</th>
                  </tr>
                </thead>
                <tbody>
                  {je.lines.map(line => (
                    <tr key={line.id}>
                      <td className="border border-gray-200 p-2">{line.account?.code}</td>
                      <td className="border border-gray-200 p-2">{line.account?.name}</td>
                      <td className="border border-gray-200 p-2 text-right text-blue-700">{line.debit > 0 ? line.debit.toLocaleString() : ''}</td>
                      <td className="border border-gray-200 p-2 text-right text-green-700">{line.credit > 0 ? line.credit.toLocaleString() : ''}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-100 font-bold">
                  <tr>
                    <td colSpan={2} className="border border-gray-200 p-2 text-right">TỔNG CỘNG:</td>
                    <td className="border border-gray-200 p-2 text-right">{je.totalDebit.toLocaleString()}</td>
                    <td className="border border-gray-200 p-2 text-right">{je.totalCredit.toLocaleString()}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
