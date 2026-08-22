import type { PwrStatus } from '@/db/schema';
import { VALID_TRANSITIONS } from './constants';

export function validateTransition(from: PwrStatus, to: PwrStatus): boolean {
  return (VALID_TRANSITIONS[from] as PwrStatus[]).includes(to);
}

export function getRequiredFields(to: PwrStatus): string[] {
  if (to === 'WAITING') return ['waitingFor'];
  if (to === 'DEFERRED') return ['deferredTo'];
  return [];
}

export function isReopen(from: PwrStatus, to: PwrStatus): boolean {
  return from === 'DONE' && (to === 'TODO' || to === 'IN_PROGRESS');
}
