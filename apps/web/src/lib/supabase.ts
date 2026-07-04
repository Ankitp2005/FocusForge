import { createClient } from '@supabase/supabase-js';

// These are public client keys, safe to include in the client bundle.
const supabaseUrl = 'https://sxjahrrnjtahpwjpdgod.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4amFocnJuanRhaHB3anBkZ29kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxNTAzNDYsImV4cCI6MjA5ODcyNjM0Nn0.2vAzcMDV2cUGnmn6-jU5--pdNwCQeAfnoadq0uLHiHo';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
