-- ============================================================
-- ZMM Seating Chart — DB migration
-- Run this once in the Supabase SQL editor (Dashboard → SQL Editor)
-- ============================================================

-- One-time seat fields on the seats table
ALTER TABLE seats
  ADD COLUMN IF NOT EXISTS is_one_time   boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS one_time_from date,
  ADD COLUMN IF NOT EXISTS one_time_until date;

-- One-time date fields on the requests table
ALTER TABLE requests
  ADD COLUMN IF NOT EXISTS one_time_from  date,
  ADD COLUMN IF NOT EXISTS one_time_until date;

-- Optional: index to speed up expiry cleanup queries
CREATE INDEX IF NOT EXISTS idx_seats_one_time_until
  ON seats (one_time_until)
  WHERE is_one_time = true;
