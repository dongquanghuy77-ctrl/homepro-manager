export type {
  PwrTask,
  NewPwrTask,
  PwrWorkLog,
  NewPwrWorkLog,
  PwrTaskAuditLog,
  NewPwrTaskAuditLog,
  PwrStatus,
  PwrCategory,
  PwrPriority,
  PwrLogType,
  PwrAuditAction,
} from '@/db/schema';

export interface PwrTaskListResponse {
  tasks: import('@/db/schema').PwrTask[];
  stats: {
    total: number;
    overdue: number;
    waiting: number;
    inProgress: number;
  };
}

export interface PwrTaskDetailResponse {
  task: import('@/db/schema').PwrTask;
  workLogs: import('@/db/schema').PwrWorkLog[];
  auditLog: import('@/db/schema').PwrTaskAuditLog[];
}
