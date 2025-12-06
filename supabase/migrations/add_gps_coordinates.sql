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

-- Fix generate_queue_number function to use VARCHAR(20) for date_prefix
CREATE OR REPLACE FUNCTION generate_queue_number()
RETURNS TRIGGER AS $$
DECLARE
  date_prefix VARCHAR(20);
  sequence_num INTEGER;
  new_queue_number VARCHAR(20);
BEGIN
  -- Format: Q-YYYYMMDD-XXX
  date_prefix := 'Q-' || TO_CHAR(NEW.scheduled_time, 'YYYYMMDD');

  -- Get the next sequence number for today
  SELECT COUNT(*) + 1 INTO sequence_num
  FROM queues
  WHERE queue_number LIKE date_prefix || '%';

  -- Generate queue number
  new_queue_number := date_prefix || '-' || LPAD(sequence_num::TEXT, 3, '0');

  NEW.queue_number := new_queue_number;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add comment to document the columns
COMMENT ON COLUMN queues.check_in_latitude IS 'GPS latitude coordinate where driver checked in';
COMMENT ON COLUMN queues.check_in_longitude IS 'GPS longitude coordinate where driver checked in';
