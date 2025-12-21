-- Add time_slot column to queues table
-- time_slot can be 'morning' (เช้า) or 'afternoon' (บ่าย)
ALTER TABLE queues ADD COLUMN IF NOT EXISTS time_slot VARCHAR(20) CHECK (time_slot IN ('morning', 'afternoon'));

-- Create index for faster queries by time_slot
CREATE INDEX IF NOT EXISTS idx_queues_time_slot ON queues(time_slot);

-- Update queue number generation to include time slot prefix
CREATE OR REPLACE FUNCTION generate_queue_number()
RETURNS TRIGGER AS $$
DECLARE
  date_prefix VARCHAR(20);
  slot_prefix VARCHAR(5);
  sequence_num INTEGER;
  new_queue_number VARCHAR(25);
BEGIN
  -- Format: Q-M/A-YYYYMMDD-XXX (M=Morning, A=Afternoon)
  slot_prefix := CASE 
    WHEN NEW.time_slot = 'morning' THEN 'M'
    WHEN NEW.time_slot = 'afternoon' THEN 'A'
    ELSE 'X'
  END;
  
  date_prefix := 'Q-' || slot_prefix || '-' || TO_CHAR(NOW(), 'YYYYMMDD');

  -- Get the next sequence number for today and this time slot
  SELECT COUNT(*) + 1 INTO sequence_num
  FROM queues
  WHERE queue_number LIKE date_prefix || '%';

  -- Generate queue number
  new_queue_number := date_prefix || '-' || LPAD(sequence_num::TEXT, 3, '0');

  NEW.queue_number := new_queue_number;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
