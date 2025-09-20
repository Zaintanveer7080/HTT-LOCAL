import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vpxkxjnghgrrolfjjswx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZweGt4am5naGdycm9sZmpqc3d4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1MTA1NjEsImV4cCI6MjA3MzA4NjU2MX0.yP2McuMnOvQbb_0L7xG_ZPfYASAeHDLEPSEgDpqHqc8';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);