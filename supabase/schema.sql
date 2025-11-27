-- Create queues table for warehouse queue registration
CREATE TABLE IF NOT EXISTS queues (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  queue_number VARCHAR(20) UNIQUE NOT NULL,
  driver_name VARCHAR(100) NOT NULL,
  phone_number VARCHAR(20) NOT NULL,
  vehicle_plate VARCHAR(20) NOT NULL,
  company VARCHAR(100) NOT NULL,
  scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  line_user_id VARCHAR(100),
  notes TEXT
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_queues_status ON queues(status);
CREATE INDEX IF NOT EXISTS idx_queues_scheduled_time ON queues(scheduled_time);
CREATE INDEX IF NOT EXISTS idx_queues_queue_number ON queues(queue_number);
CREATE INDEX IF NOT EXISTS idx_queues_line_user_id ON queues(line_user_id);

-- Create function to generate queue number
CREATE OR REPLACE FUNCTION generate_queue_number()
RETURNS TRIGGER AS $$
DECLARE
  date_prefix VARCHAR(8);
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

-- Create trigger to auto-generate queue number
DROP TRIGGER IF EXISTS generate_queue_number_trigger ON queues;
CREATE TRIGGER generate_queue_number_trigger
  BEFORE INSERT ON queues
  FOR EACH ROW
  WHEN (NEW.queue_number IS NULL OR NEW.queue_number = '')
  EXECUTE FUNCTION generate_queue_number();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_queues_updated_at ON queues;
CREATE TRIGGER update_queues_updated_at
  BEFORE UPDATE ON queues
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE queues ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access
CREATE POLICY "Allow public read access" ON queues
  FOR SELECT
  USING (true);

-- Create policy for public insert access
CREATE POLICY "Allow public insert access" ON queues
  FOR INSERT
  WITH CHECK (true);

-- Create policy for public update access (users can update their own queues)
CREATE POLICY "Allow public update access" ON queues
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Insert sample data (optional)
-- INSERT INTO queues (driver_name, phone_number, vehicle_plate, company, scheduled_time, queue_number)
-- VALUES
--   ('สมชาย ใจดี', '081-234-5678', 'กข-1234', 'บริษัท ABC จำกัด', NOW() + INTERVAL '1 hour', ''),
--   ('สมหญิง รักสงบ', '082-345-6789', 'คง-5678', 'บริษัท XYZ จำกัด', NOW() + INTERVAL '2 hours', '');
