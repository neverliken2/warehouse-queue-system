import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database Types
export interface Queue {
  id: string;
  queue_number: string;
  driver_name: string;
  phone_number: string;
  vehicle_plate: string;
  company: string;
  scheduled_time: string;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
  line_user_id?: string;
}

export interface QueueInsert {
  driver_name: string;
  phone_number: string;
  vehicle_plate: string;
  company: string;
  scheduled_time: string;
  line_user_id?: string;
}
