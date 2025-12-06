-- Add GPS coordinates columns to queues table
ALTER TABLE queues
ADD COLUMN IF NOT EXISTS check_in_latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS check_in_longitude DOUBLE PRECISION;

-- Fix queue_number column size (increase from VARCHAR(8) to VARCHAR(20))
-- Format is Q-YYYYMMDD-XXX which needs 14 characters
-- Need to drop and recreate trigger because it depends on queue_number column

-- Drop the trigger temporarily
DROP TRIGGER IF EXISTS generate_queue_number_trigger ON queues;

-- Change column type
ALTER TABLE queues
ALTER COLUMN queue_number TYPE VARCHAR(20);

-- Recreate the trigger
CREATE TRIGGER generate_queue_number_trigger
  BEFORE INSERT ON queues
  FOR EACH ROW
  WHEN (NEW.queue_number IS NULL OR NEW.queue_number = '')
  EXECUTE FUNCTION generate_queue_number();

-- Add comment to document the columns
COMMENT ON COLUMN queues.check_in_latitude IS 'GPS latitude coordinate where driver checked in';
COMMENT ON COLUMN queues.check_in_longitude IS 'GPS longitude coordinate where driver checked in';
