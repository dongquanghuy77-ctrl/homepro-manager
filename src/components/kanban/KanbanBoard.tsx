'use client';

import { useState, useRef } from 'react';
import type { Task, TaskStatus } from '@/db/schema';
import { TASK_STATUS, TASK_PRIORITY } from '@/lib/constants';
import type { TaskPriority } from '@/db/schema';
import { formatDate } from '@/lib/utils';

// ============================================================
// 5 GIAI ĐOẠN XƯỞNG CHUẨN (Pipeline Stages)
// ============================================================
export const KANBAN_STAGES: {
  id: TaskStatus;
  label: string;
  icon: string;
  color: string;
  bg: string;
}[] = [
  {
    id: 'NOT_STARTED',
    label: 'Chưa bắt đầu',
    icon: '⏳',
    color: '#94A3B8',
    bg: 'rgba(148,163,184,0.06)',
  },
  {
    id: 'IN_PROGRESS',
    label: 'Đang thực hiện',
    icon: '⚡',
    color: '#F59E0B',
    bg: 'rgba(245,158,11,0.06)',
  },
  {
    id: 'PAUSED',
    label: 'Tạm dừng',
    icon: '⏸️',
    color: '#8B5CF6',
    bg: 'rgba(139,92,246,0.06)',
  },
  {
    id: 'OVERDUE',
    label: 'Quá hạn',
    icon: '🚨',
    color: '#EF4444',
    bg: 'rgba(239,68,68,0.06)',
  },
  {
    id: 'COMPLETED',
    label: 'Hoàn thành',
    icon: '✅',
    color: '#10B981',
    bg: 'rgba(16,185,129,0.06)',
  },
];

interface KanbanBoardProps {
  tasks: Task[];
  onTaskUpdate: (taskId: number, newStatus: TaskStatus) => void;
  onTaskEdit?: (task: Task) => void;
}

export default function KanbanBoard({ tasks, onTaskUpdate, onTaskEdit }: KanbanBoardProps) {
  const [dragging, setDragging] = useState<number | null>(null);
  const [dragOverCol, setDragOverCol] = useState<TaskStatus | null>(null);
  const dragTaskRef = useRef<Task | null>(null);

  function handleDragStart(task: Task) {
    setDragging(task.id);
    dragTaskRef.current = task;
  }

  function handleDragEnd() {
    setDragging(null);
    setDragOverCol(null);
    dragTaskRef.current = null;
  }

  function handleDragOver(e: React.DragEvent, status: TaskStatus) {
    e.preventDefault();
    setDragOverCol(status);
  }

  function handleDrop(e: React.DragEvent, newStatus: TaskStatus) {
    e.preventDefault();
    const task = dragTaskRef.current;
    if (task && task.status !== newStatus) {
      onTaskUpdate(task.id, newStatus);
    }
    setDragging(null);
    setDragOverCol(null);
    dragTaskRef.current = null;
  }

  function handleDragLeave() {
    setDragOverCol(null);
  }

  return (
    <div className="kanban-board">
      {KANBAN_STAGES.map((stage) => {
        const stageTasks = tasks.filter((t) => t.status === stage.id);
        const isOver = dragOverCol === stage.id;

        return (
          <div
            key={stage.id}
            className={`kanban-col${isOver ? ' kanban-col-over' : ''}`}
            style={{
              background: isOver ? stage.bg : undefined,
              borderColor: isOver ? stage.color : undefined,
            }}
            onDragOver={(e) => handleDragOver(e, stage.id)}
            onDrop={(e) => handleDrop(e, stage.id)}
            onDragLeave={handleDragLeave}
          >
            {/* Column Header */}
            <div className="kanban-col-header" style={{ borderColor: stage.color }}>
              <div className="flex items-center gap-2">
                <span style={{ fontSize: 16 }}>{stage.icon}</span>
                <span className="kanban-col-title" style={{ color: stage.color }}>
                  {stage.label}
                </span>
              </div>
              <span
                className="kanban-col-count"
                style={{ background: `${stage.color}20`, color: stage.color }}
              >
                {stageTasks.length}
              </span>
            </div>

            {/* Cards */}
            <div className="kanban-cards">
              {stageTasks.length === 0 ? (
                <div
                  className="kanban-empty"
                  style={{ borderColor: isOver ? stage.color : undefined }}
                >
                  {isOver ? `Thả vào đây` : 'Không có công việc'}
                </div>
              ) : (
                stageTasks.map((task) => (
                  <KanbanCard
                    key={task.id}
                    task={task}
                    stageColor={stage.color}
                    isDragging={dragging === task.id}
                    onDragStart={() => handleDragStart(task)}
                    onDragEnd={handleDragEnd}
                    onClick={() => onTaskEdit?.(task)}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// KANBAN CARD
// ============================================================
interface KanbanCardProps {
  task: Task;
  stageColor: string;
  isDragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onClick: () => void;
}

function KanbanCard({
  task,
  stageColor,
  isDragging,
  onDragStart,
  onDragEnd,
  onClick,
}: KanbanCardProps) {
  const priority = TASK_PRIORITY[task.priority as TaskPriority];

  return (
    <div
      draggable
      className={`kanban-card${isDragging ? ' kanban-card-dragging' : ''}`}
      style={{ borderLeftColor: stageColor }}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
    >
      {/* Title */}
      <div className="kanban-card-title">{task.title}</div>

      {/* Meta row */}
      <div className="kanban-card-meta">
        {task.category && (
          <span className="kanban-card-tag">{task.category}</span>
        )}
        <span
          className="kanban-card-priority"
          style={{ color: priority?.color }}
        >
          {priority?.icon}
        </span>
      </div>

      {/* Assignee & deadline */}
      <div className="kanban-card-footer">
        {task.assignee && (
          <div className="kanban-card-avatar" title={task.assignee}>
            {task.assignee.charAt(0).toUpperCase()}
          </div>
        )}
        {task.endDate && (
          <span className="kanban-card-date">{formatDate(task.endDate)}</span>
        )}
      </div>

      {/* Progress Bar */}
      {task.progress > 0 && (
        <div className="kanban-card-progress-wrap">
          <div
            className="kanban-card-progress-fill"
            style={{
              width: `${task.progress}%`,
              background: task.progress === 100 ? '#10B981' : stageColor,
            }}
          />
        </div>
      )}
    </div>
  );
}
