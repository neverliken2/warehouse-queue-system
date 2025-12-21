import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Create a dummy client for build time, will be replaced at runtime
let supabaseClient: SupabaseClient;

if (supabaseUrl && supabaseAnonKey) {
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
} else {
  // Create a mock client for build time
  supabaseClient = createClient('https://placeholder.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDUxOTEzNzIsImV4cCI6MTk2MDc2NzM3Mn0.placeholder');
}

export const supabase = supabaseClient;

// Database Types
export interface Queue {
  id: string;
  queue_number: string;
  driver_name: string;
  vehicle_plate: string;
  carrier: string;
  job_type: string;
  truck_type: 'heavy' | 'light';
  trip_number?: string;
  time_slot: 'morning' | 'afternoon';
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
  line_user_id?: string;
  notes?: string;
  check_in_latitude?: number;
  check_in_longitude?: number;
}

export interface QueueInsert {
  driver_name: string;
  vehicle_plate: string;
  carrier: string;
  job_type: string;
  truck_type: 'heavy' | 'light';
  trip_number?: string;
  time_slot: 'morning' | 'afternoon';
  line_user_id?: string;
  check_in_latitude?: number;
  check_in_longitude?: number;
}
