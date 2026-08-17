"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShieldAlert, CheckCircle, Search, Database, Activity, GitCommit, SearchX } from 'lucide-react';

export default function DataHealthPage() {
  const [healthData, setHealthData] = useState<any>(null);
  const [lineageData, setLineageData] = useState<any>(null);
  const [materialId, setMaterialId] = useState('1');
  const [loading, setLoading] = useState(true);
  const [lineageLoading, setLineageLoading] = useState(false);

  useEffect(() => {
    fetchHealthData();
    fetchLineage(materialId);
  }, []);

  const fetchHealthData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/data-health');
      const data = await res.json();
      setHealthData(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchLineage = async (id: string) => {
    setLineageLoading(true);
    try {
      const res = await fetch(`/api/data-lineage?materialId=${id}`);
      const data = await res.json();
      setLineageData(data.lineage);
    } catch (e) {
      console.error(e);
    } finally {
      setLineageLoading(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading Data Health Center...</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 bg-gray-50 min-h-screen font-sans">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
          <Activity className="w-8 h-8 text-blue-600" /> 
          Data Health & Traceability Center
        </h1>
        <button onClick={fetchHealthData} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
          Refresh Data
        </button>
      </div>

      {/* Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-lg"><Database className="w-6 h-6" /></div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Total Modules</p>
            <p className="text-2xl font-bold text-gray-800">{healthData?.summary?.totalModules || 0}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-green-100 text-green-600 rounded-lg"><CheckCircle className="w-6 h-6" /></div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Healthy Score</p>
            <p className="text-2xl font-bold text-gray-800">{healthData?.summary?.healthyScore || 0}%</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-red-100 text-red-600 rounded-lg"><ShieldAlert className="w-6 h-6" /></div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Total Issues Found</p>
            <p className="text-2xl font-bold text-red-600">{healthData?.summary?.totalIssues || 0}</p>
          </div>
        </div>
      </div>

      {/* Issues Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-800">System Data Issues</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-gray-100 text-sm text-gray-500">
                <th className="px-6 py-3 font-medium">Issue Type</th>
                <th className="px-6 py-3 font-medium">Description</th>
                <th className="px-6 py-3 font-medium">Affected Table</th>
                <th className="px-6 py-3 font-medium">Count</th>
                <th className="px-6 py-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {healthData?.issues?.map((issue: any) => (
                <tr key={issue.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 font-medium text-gray-800">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-red-50 text-red-700 border border-red-100">
                      {issue.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{issue.description}</td>
                  <td className="px-6 py-4 text-gray-500 font-mono text-sm">{issue.table}</td>
                  <td className="px-6 py-4 font-semibold text-gray-800">{issue.count}</td>
                  <td className="px-6 py-4 text-right">
                    <Link href={issue.actionLink} className="text-blue-600 hover:text-blue-800 font-medium text-sm hover:underline">
                      Fix Data &rarr;
                    </Link>
                  </td>
                </tr>
              ))}
              {healthData?.issues?.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">No issues found. Data is perfectly healthy!</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Data Traceability */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <GitCommit className="w-6 h-6 text-indigo-600" />
          Data Lineage & Traceability
        </h2>
        <div className="flex gap-4 mb-8">
          <input 
            type="text" 
            value={materialId}
            onChange={e => setMaterialId(e.target.value)}
            placeholder="Enter Material ID..."
            className="border border-gray-300 rounded-lg px-4 py-2 w-64 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          />
          <button 
            onClick={() => fetchLineage(materialId)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center gap-2"
          >
            <Search className="w-4 h-4" /> Trace
          </button>
        </div>

        {lineageLoading ? (
          <div className="text-gray-500 py-8 text-center">Tracing data lineage...</div>
        ) : (
          <div className="relative pt-4">
            <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-200 -translate-y-1/2 z-0 hidden md:block"></div>
            <div className="grid grid-cols-1 md:grid-cols-7 gap-4 relative z-10">
              {lineageData?.map((node: any, idx: number) => (
                <div key={idx} className="flex flex-col items-center">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center border-4 mb-3 transition-colors bg-white ${
                    node.status === 'ACTIVE' ? 'border-indigo-500 text-indigo-600' :
                    node.status === 'MISSING' ? 'border-red-400 text-red-500' :
                    'border-gray-200 text-gray-300'
                  }`}>
                    {node.status === 'ACTIVE' ? <CheckCircle className="w-6 h-6" /> : 
                     node.status === 'MISSING' ? <SearchX className="w-6 h-6" /> : 
                     <div className="w-3 h-3 rounded-full bg-gray-200"></div>}
                  </div>
                  <h3 className="font-semibold text-gray-800 text-sm mb-2 text-center h-8">{node.stage}</h3>
                  {node.data ? (
                    <div className="text-xs text-gray-600 text-left bg-white border border-gray-100 rounded-md p-3 shadow-sm w-full break-words max-h-40 overflow-y-auto">
                      {Object.entries(node.data).map(([k, v]) => (
                        <div key={k} className="mb-1">
                          <span className="font-semibold text-gray-700 block">{k}</span> 
                          <span className="text-gray-500">{String(v)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-400 text-center italic mt-2">No data</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
