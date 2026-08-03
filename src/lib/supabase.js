import { createClient } from '@supabase/supabase-js'

export const SUPABASE_URL = 'https://mahmyrtioxyxtoaluscl.supabase.co'
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_PoRe10c6N1DoqMCDU1VhEg_kIPt9dJr'

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

export const CLOUD_STATE_ID = 'acq-scuola-calcio-main'
