-- Add GPS coordinates columns to queues table
ALTER TABLE queues
ADD COLUMN IF NOT EXISTS check_in_latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS check_in_longitude DOUBLE PRECISION;

-- Fix queue_number column size (increase from VARCHAR(8) to VARCHAR(20))
-- Format is Q-YYYYMMDD-XXX which needs 14 characters
ALTER TABLE queues
ALTER COLUMN queue_number TYPE VARCHAR(20);

-- Add comment to document the columns
COMMENT ON COLUMN queues.check_in_latitude IS 'GPS latitude coordinate where driver checked in';
COMMENT ON COLUMN queues.check_in_longitude IS 'GPS longitude coordinate where driver checked in';
