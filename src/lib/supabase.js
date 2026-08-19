import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  // eslint-disable-next-line no-console
  console.error(
    'Missing Supabase environment variables. Create a .env file (see .env.example) with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
  )
}

// This is the ONLY Supabase client used in the whole app.
// It is created with the public "anon" key only - safe to expose in the
// browser. All sensitive operations (money, wallet, order creation,
// rate changes) are enforced by Postgres Row Level Security policies and
// SECURITY DEFINER database functions, never by trusting this client.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
})
