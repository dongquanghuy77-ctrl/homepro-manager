'use client';

import { useState } from 'react';
import {
  CheckCircle2, ChevronRight, ChevronLeft,
  User, Briefcase, FileText, Users, Clock,
  Sun, Cloud, CloudRain, AlertTriangle, TrendingUp,
} from 'lucide-react';
import { TASK_CATEGORIES, DEFAULT_ASSIGNEES } from '@/lib/constants';

// ============================================================
// TYPES
// ============================================================
interface Project {
  id: number;
  name: string;
  code: string;
  manager: string;
}

interface DailyInputClientProps {
  projects: Project[];
}

const WEATHER_OPTIONS = [
  { value: 'Nắng', icon: '☀️', label: 'Nắng' },
  { value: 'Nhiều mây', icon: '⛅', label: 'Nhiều mây' },
  { value: 'Mưa nhỏ', icon: '🌦️', label: 'Mưa nhỏ' },
  { value: 'Mưa to', icon: '🌧️', label: 'Mưa to' },
  { value: 'Giông bão', icon: '⛈️', label: 'Giông bão' },
];

const STEP_LABELS = [
  { step: 1, label: 'Thông tin', icon: User },
  { step: 2, label: 'Dự án', icon: Briefcase },
  { step: 3, label: 'Công việc', icon: FileText },
  { step: 4, label: 'Nhân công', icon: Users },
  { step: 5, label: 'Hoàn tất', icon: CheckCircle2 },
];

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function DailyInputClient({ projects }: DailyInputClientProps) {
  const today = new Date().toISOString().split('T')[0];
  const todayDisplay = new Date().toLocaleDateString('vi-VN', {
    weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric',
  });

  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [workerName, setWorkerName] = useState('');
  const [customName, setCustomName] = useState('');
  const [projectId, setProjectId] = useState<number | null>(null);
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [progressNote, setProgressNote] = useState('');
  const [issues, setIssues] = useState('');
  const [weather, setWeather] = useState('');
  const [workerList, setWorkerList] = useState('');
  const [workerCount, setWorkerCount] = useState(1);
  const [hoursWorked, setHoursWorked] = useState(8);

  const selectedProject = projects.find((p) => p.id === projectId);
  const effectiveName = workerName === '__custom__' ? customName : workerName;

  // Validation per step
  function canProceed() {
    if (step === 1) return effectiveName.trim().length > 0;
    if (step === 2) return projectId !== null && category !== '';
    if (step === 3) return description.trim().length > 10;
    if (step === 4) return workerCount > 0 && hoursWorked > 0;
    return true;
  }

  function next() {
    if (!canProceed()) return;
    setStep((s) => Math.min(s + 1, 5));
    setError('');
  }

  function back() {
    setStep((s) => Math.max(s - 1, 1));
    setError('');
  }

  async function handleSubmit() {
    if (!canProceed()) return;
    setSubmitting(true);
    setError('');

    try {
      const payload = {
        projectId: projectId!,
        logDate: today,
        category,
        description,
        workers: workerList || effectiveName,
        workerCount,
        hoursWorked,
        weather: weather || null,
        progressNote: progressNote || null,
        issues: issues || null,
        recordedBy: effectiveName,
      };

      const res = await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Lỗi gửi dữ liệu');
      setSubmitted(true);
    } catch {
      setError('Có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setStep(1);
    setSubmitted(false);
    setDescription('');
    setProgressNote('');
    setIssues('');
    setWorkerList('');
    setWorkerCount(1);
    setHoursWorked(8);
    setWeather('');
    setError('');
  }

  // ============================================================
  // SUBMITTED SUCCESS SCREEN
  // ============================================================
  if (submitted) {
    return (
      <div className="worker-page">
        <div className="worker-success-card">
          <div className="worker-success-icon">✅</div>
          <h2 className="worker-success-title">Đã ghi nhận thành công!</h2>
          <p className="worker-success-sub">
            Cảm ơn <strong>{effectiveName}</strong>.<br />
            Nhật ký ngày <strong>{todayDisplay}</strong> đã được lưu.
          </p>

          <div className="worker-success-summary">
            <div className="worker-summary-row">
              <span>🏗️ Dự án</span>
              <strong>{selectedProject?.name}</strong>
            </div>
            <div className="worker-summary-row">
              <span>🔧 Hạng mục</span>
              <strong>{category}</strong>
            </div>
            <div className="worker-summary-row">
              <span>👷 Nhân công</span>
              <strong>{workerCount} người × {hoursWorked}h</strong>
            </div>
          </div>

          <button className="worker-btn-primary" onClick={reset}>
            📓 Ghi nhật ký mới
          </button>
          <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 12, textAlign: 'center' }}>
            Hoặc đóng trang này
          </p>
        </div>
      </div>
    );
  }

  // ============================================================
  // MAIN FORM
  // ============================================================
  return (
    <div className="worker-page">
      {/* Header */}
      <div className="worker-header">
        <div className="worker-logo">🏠 HomePro</div>
        <div className="worker-date">{todayDisplay}</div>
      </div>

      {/* Step Progress Bar */}
      <div className="worker-steps">
        {STEP_LABELS.map(({ step: s, label, icon: Icon }) => (
          <div
            key={s}
            className={`worker-step ${s === step ? 'active' : s < step ? 'done' : ''}`}
          >
            <div className="worker-step-dot">
              {s < step ? <CheckCircle2 size={14} /> : <Icon size={14} />}
            </div>
            <span className="worker-step-label">{label}</span>
          </div>
        ))}
      </div>

      {/* Card */}
      <div className="worker-card">
        {/* ===== STEP 1: Tên nhân viên ===== */}
        {step === 1 && (
          <div className="worker-step-content">
            <div className="worker-step-header">
              <div className="worker-step-num">1</div>
              <div>
                <h2 className="worker-step-title">Bạn là ai?</h2>
                <p className="worker-step-sub">Chọn tên hoặc nhập tên của bạn</p>
              </div>
            </div>

            <div className="worker-name-grid">
              {DEFAULT_ASSIGNEES.map((name) => (
                <button
                  key={name}
                  id={`worker-name-${name}`}
                  className={`worker-name-btn ${workerName === name ? 'selected' : ''}`}
                  onClick={() => { setWorkerName(name); setCustomName(''); }}
                >
                  <div className="worker-name-avatar">{name.charAt(0)}</div>
                  <span>{name}</span>
                </button>
              ))}
              <button
                id="worker-name-custom"
                className={`worker-name-btn ${workerName === '__custom__' ? 'selected' : ''}`}
                onClick={() => setWorkerName('__custom__')}
              >
                <div className="worker-name-avatar" style={{ background: 'var(--color-surface-3)' }}>+</div>
                <span>Khác</span>
              </button>
            </div>

            {workerName === '__custom__' && (
              <input
                className="worker-input"
                placeholder="Nhập tên của bạn..."
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                autoFocus
              />
            )}
          </div>
        )}

        {/* ===== STEP 2: Dự án & Hạng mục ===== */}
        {step === 2 && (
          <div className="worker-step-content">
            <div className="worker-step-header">
              <div className="worker-step-num">2</div>
              <div>
                <h2 className="worker-step-title">Dự án hôm nay</h2>
                <p className="worker-step-sub">Bạn đang thi công dự án nào?</p>
              </div>
            </div>

            <div className="worker-project-list">
              {projects.map((p) => (
                <button
                  key={p.id}
                  id={`project-select-${p.id}`}
                  className={`worker-project-btn ${projectId === p.id ? 'selected' : ''}`}
                  onClick={() => setProjectId(p.id)}
                >
                  <div className="worker-project-icon">🏗️</div>
                  <div className="worker-project-info">
                    <div className="worker-project-name">{p.name}</div>
                    <div className="worker-project-meta">{p.code} · {p.manager}</div>
                  </div>
                  {projectId === p.id && (
                    <CheckCircle2 size={20} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
                  )}
                </button>
              ))}
            </div>

            <div style={{ marginTop: 24 }}>
              <label className="worker-label">Hạng mục thi công hôm nay</label>
              <div className="worker-tag-grid">
                {TASK_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    id={`category-${cat}`}
                    className={`worker-tag-btn ${category === cat ? 'selected' : ''}`}
                    onClick={() => setCategory(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ===== STEP 3: Mô tả công việc ===== */}
        {step === 3 && (
          <div className="worker-step-content">
            <div className="worker-step-header">
              <div className="worker-step-num">3</div>
              <div>
                <h2 className="worker-step-title">Công việc hôm nay</h2>
                <p className="worker-step-sub">Mô tả chi tiết những gì đã làm</p>
              </div>
            </div>

            <label className="worker-label">🔨 Đã làm gì hôm nay? <span style={{ color: '#EF4444' }}>*</span></label>
            <textarea
              className="worker-textarea"
              rows={5}
              placeholder={`VD:\n- Sơn tường phòng khách lớp 1\n- Lắp đặt khung trần phòng ngủ\n- Cắt và gia công tủ bếp...`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            <label className="worker-label" style={{ marginTop: 20 }}>📈 Tiến độ đạt được?</label>
            <input
              className="worker-input"
              placeholder="VD: Hoàn thành 70% sơn tường phòng khách..."
              value={progressNote}
              onChange={(e) => setProgressNote(e.target.value)}
            />

            <label className="worker-label" style={{ marginTop: 16 }}>⚠️ Vấn đề phát sinh (nếu có)</label>
            <input
              className="worker-input"
              placeholder="VD: Thiếu sơn màu xanh, hỏng máy cắt..."
              value={issues}
              onChange={(e) => setIssues(e.target.value)}
            />

            {/* Weather */}
            <label className="worker-label" style={{ marginTop: 16 }}>🌤️ Thời tiết hôm nay</label>
            <div className="worker-weather-grid">
              {WEATHER_OPTIONS.map((w) => (
                <button
                  key={w.value}
                  id={`weather-${w.value}`}
                  className={`worker-weather-btn ${weather === w.value ? 'selected' : ''}`}
                  onClick={() => setWeather(w.value)}
                >
                  <span style={{ fontSize: 22 }}>{w.icon}</span>
                  <span style={{ fontSize: 11 }}>{w.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ===== STEP 4: Nhân công & Giờ công ===== */}
        {step === 4 && (
          <div className="worker-step-content">
            <div className="worker-step-header">
              <div className="worker-step-num">4</div>
              <div>
                <h2 className="worker-step-title">Nhân công & Giờ công</h2>
                <p className="worker-step-sub">Báo cáo số người và thời gian làm việc</p>
              </div>
            </div>

            {/* Số lượng nhân công */}
            <label className="worker-label">👷 Số lượng nhân công hôm nay</label>
            <div className="worker-counter">
              <button
                className="worker-counter-btn"
                onClick={() => setWorkerCount((v) => Math.max(1, v - 1))}
              >−</button>
              <div className="worker-counter-value">{workerCount} người</div>
              <button
                className="worker-counter-btn"
                onClick={() => setWorkerCount((v) => v + 1)}
              >+</button>
            </div>

            {/* Giờ công */}
            <label className="worker-label" style={{ marginTop: 24 }}>⏰ Tổng giờ làm việc / người</label>
            <div className="worker-hours-grid">
              {[4, 6, 8, 10, 12].map((h) => (
                <button
                  key={h}
                  id={`hours-${h}`}
                  className={`worker-hours-btn ${hoursWorked === h ? 'selected' : ''}`}
                  onClick={() => setHoursWorked(h)}
                >
                  {h}h
                </button>
              ))}
              <button
                id="hours-custom"
                className={`worker-hours-btn ${![4, 6, 8, 10, 12].includes(hoursWorked) ? 'selected' : ''}`}
                onClick={() => {
                  const v = prompt('Nhập số giờ:');
                  if (v && !isNaN(Number(v))) setHoursWorked(Number(v));
                }}
              >
                Khác
              </button>
            </div>

            <div className="worker-total-hours">
              <TrendingUp size={18} style={{ color: 'var(--color-primary)' }} />
              <span>Tổng giờ công: <strong>{(workerCount * hoursWorked).toFixed(0)} giờ</strong></span>
            </div>

            {/* Danh sách nhân công */}
            <label className="worker-label" style={{ marginTop: 20 }}>📋 Danh sách nhân công (tùy chọn)</label>
            <textarea
              className="worker-textarea"
              rows={3}
              placeholder="VD: Huy, Minh, Tuấn, Long&#10;Hoặc ghi nhóm thợ sơn, nhóm thợ mộc..."
              value={workerList}
              onChange={(e) => setWorkerList(e.target.value)}
            />
          </div>
        )}

        {/* ===== STEP 5: Xác nhận & Gửi ===== */}
        {step === 5 && (
          <div className="worker-step-content">
            <div className="worker-step-header">
              <div className="worker-step-num">✓</div>
              <div>
                <h2 className="worker-step-title">Xác nhận & Gửi</h2>
                <p className="worker-step-sub">Kiểm tra lại thông tin trước khi gửi</p>
              </div>
            </div>

            <div className="worker-review">
              <div className="worker-review-row">
                <span className="worker-review-label">👤 Nhân viên</span>
                <span className="worker-review-value">{effectiveName}</span>
              </div>
              <div className="worker-review-row">
                <span className="worker-review-label">📅 Ngày</span>
                <span className="worker-review-value">{new Date().toLocaleDateString('vi-VN')}</span>
              </div>
              <div className="worker-review-row">
                <span className="worker-review-label">🏗️ Dự án</span>
                <span className="worker-review-value">{selectedProject?.name}</span>
              </div>
              <div className="worker-review-row">
                <span className="worker-review-label">🔧 Hạng mục</span>
                <span className="worker-review-value">{category}</span>
              </div>
              {weather && (
                <div className="worker-review-row">
                  <span className="worker-review-label">🌤️ Thời tiết</span>
                  <span className="worker-review-value">{weather}</span>
                </div>
              )}
              <div className="worker-review-row">
                <span className="worker-review-label">👷 Nhân công</span>
                <span className="worker-review-value">{workerCount} người × {hoursWorked}h = {workerCount * hoursWorked}h</span>
              </div>
              <div className="worker-review-desc">
                <span className="worker-review-label">🔨 Công việc</span>
                <p>{description}</p>
              </div>
              {progressNote && (
                <div className="worker-review-desc">
                  <span className="worker-review-label">📈 Tiến độ</span>
                  <p>{progressNote}</p>
                </div>
              )}
              {issues && (
                <div className="worker-review-desc">
                  <span className="worker-review-label" style={{ color: '#F59E0B' }}>⚠️ Vấn đề</span>
                  <p style={{ color: '#F59E0B' }}>{issues}</p>
                </div>
              )}
            </div>

            {error && (
              <div className="alert alert-danger" style={{ marginTop: 16 }}>{error}</div>
            )}
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="worker-nav">
          {step > 1 && (
            <button className="worker-btn-back" onClick={back}>
              <ChevronLeft size={18} /> Quay lại
            </button>
          )}
          <div style={{ flex: 1 }} />
          {step < 5 ? (
            <button
              className={`worker-btn-next ${!canProceed() ? 'disabled' : ''}`}
              onClick={next}
              disabled={!canProceed()}
            >
              Tiếp theo <ChevronRight size={18} />
            </button>
          ) : (
            <button
              className="worker-btn-submit"
              onClick={handleSubmit}
              disabled={submitting}
              id="submit-daily-log"
            >
              {submitting ? '⏳ Đang gửi...' : '✅ Xác nhận & Gửi'}
            </button>
          )}
        </div>

        {/* Validation hint */}
        {!canProceed() && (
          <p className="worker-hint">
            {step === 1 && '⬆️ Vui lòng chọn hoặc nhập tên'}
            {step === 2 && '⬆️ Vui lòng chọn dự án và hạng mục'}
            {step === 3 && '⬆️ Vui lòng mô tả công việc (tối thiểu 10 ký tự)'}
            {step === 4 && '⬆️ Vui lòng điền số nhân công và giờ công'}
          </p>
        )}
      </div>

      {/* Footer */}
      <p className="worker-footer">
        HomePro Manager · Nhật ký thi công hàng ngày
      </p>
    </div>
  );
}
