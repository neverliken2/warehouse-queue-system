-- Add GPS coordinates columns to queues table
ALTER TABLE queues
ADD COLUMN IF NOT EXISTS check_in_latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS check_in_longitude DOUBLE PRECISION;

-- Add comment to document the columns
COMMENT ON COLUMN queues.check_in_latitude IS 'GPS latitude coordinate where driver checked in';
COMMENT ON COLUMN queues.check_in_longitude IS 'GPS longitude coordinate where driver checked in';
