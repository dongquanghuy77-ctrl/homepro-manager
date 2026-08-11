-- Migration: 0013_offline_sync.sql
-- Them cac cot de theo doi cham cong offline va phat hien gian lan
ALTER TABLE attendance 
  ADD COLUMN is_offline_sync BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN client_timestamp TIMESTAMP,
  ADD COLUMN offline_sync_delta INTEGER,
  ADD COLUMN is_flagged BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN flag_reason TEXT;