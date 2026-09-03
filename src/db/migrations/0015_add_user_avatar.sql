-- Migration: 0015_add_user_avatar.sql
-- Thêm cột avatar_url vào bảng users cho tính năng ảnh đại diện Kiosk Station
-- Generated: 2026-09-03

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "avatar_url" text;

COMMENT ON COLUMN "users"."avatar_url" IS 'URL ảnh đại diện công nhân — Vercel Blob hoặc data URI. NULL = dùng CSS initials fallback.';
