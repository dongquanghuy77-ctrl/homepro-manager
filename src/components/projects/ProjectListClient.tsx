'use client';

import { useState } from 'react';
import { Plus, FileSpreadsheet } from 'lucide-react';
import type { Project } from '@/db/schema';
import { formatDate, formatCurrency, daysUntilDeadline } from '@/lib/utils';
import { ProgressBar } from '@/components/ui/Progress';
import ProjectForm from '@/components/projects/ProjectForm';
import ExcelImportModal from '@/components/projects/ExcelImportModal';
import Link from 'next/link';
import { PROJECT_STATUS } from '@/lib/constants';

interface ProjectListClientProps {
  projects: (Project & { progress: number; taskCount: number })[];
}

export default function ProjectListClient({ projects }: ProjectListClientProps) {
  const [showForm, setShowForm] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dự án</h1>
          <p className="page-subtitle">{projects.length} dự án trong hệ thống</p>
        </div>
        <div className="flex gap-3">
          <button
            id="import-excel-btn"
            className="btn btn-secondary"
            onClick={() => setShowImportModal(true)}
          >
            <FileSpreadsheet size={16} color="#10B981" />
            Nhập từ Excel / CSV
          </button>
          <button
            id="new-project-btn"
            className="btn btn-primary"
            onClick={() => setShowForm(true)}
          >
            <Plus size={16} />
            Tạo dự án mới
          </button>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">🏗️</div>
            <div className="empty-state-text">Chưa có dự án nào</div>
            <div className="flex gap-3 mt-4">
              <button className="btn btn-secondary" onClick={() => setShowImportModal(true)}>
                <FileSpreadsheet size={16} color="#10B981" /> Nhập từ Excel
              </button>
              <button className="btn btn-primary" onClick={() => setShowForm(true)}>
                <Plus size={16} /> Tạo dự án mới
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 20 }}>
          {projects.map((project) => {
            const daysLeft = daysUntilDeadline(project.deadline);
            const statusConfig = PROJECT_STATUS[project.status as keyof typeof PROJECT_STATUS] ?? PROJECT_STATUS['ACTIVE'];

            return (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                id={`project-card-${project.id}`}
                style={{ textDecoration: 'none' }}
              >
                <div className="card" style={{ cursor: 'pointer' }}>
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-primary)', letterSpacing: '0.05em', marginBottom: 4 }}>
                        {project.code}
                      </div>
                      <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-text)', lineHeight: 1.3 }}>
                        {project.name}
                      </div>
                    </div>
                    <span
                      className="badge"
                      style={{ color: statusConfig.color, background: `${statusConfig.color}18` }}
                    >
                      {statusConfig.label}
                    </span>
                  </div>

                  {/* Info */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', marginBottom: 16, fontSize: 13 }}>
                    <div>
                      <span style={{ color: 'var(--color-text-muted)' }}>Khách hàng: </span>
                      <span style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>{project.customer}</span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--color-text-muted)' }}>Quản lý: </span>
                      <span style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>{project.manager}</span>
                    </div>
                    {project.location && (
                      <div>
                        <span style={{ color: 'var(--color-text-muted)' }}>Địa điểm: </span>
                        <span style={{ color: 'var(--color-text-secondary)' }}>{project.location}</span>
                      </div>
                    )}
                    {project.contractValue ? (
                      <div>
                        <span style={{ color: 'var(--color-text-muted)' }}>Hợp đồng: </span>
                        <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>
                          {formatCurrency(project.contractValue)}
                        </span>
                      </div>
                    ) : null}
                  </div>

                  {/* Progress */}
                  <div style={{ marginBottom: 16 }}>
                    <div className="flex items-center justify-between mb-2">
                      <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Tiến độ</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text)' }}>{project.progress}%</span>
                    </div>
                    <ProgressBar value={project.progress} />
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between" style={{ fontSize: 12 }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>
                      {project.taskCount} công việc
                    </span>
                    {daysLeft !== null && (
                      <span style={{
                        fontWeight: 600,
                        color: daysLeft < 0 ? '#EF4444' : daysLeft <= 14 ? '#F59E0B' : '#10B981',
                      }}>
                        {daysLeft < 0
                          ? `⚠️ Quá hạn ${Math.abs(daysLeft)} ngày`
                          : `📅 Còn ${daysLeft} ngày`}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {showForm && <ProjectForm onClose={() => setShowForm(false)} />}
      {showImportModal && <ExcelImportModal onClose={() => setShowImportModal(false)} />}
    </>
  );
}
