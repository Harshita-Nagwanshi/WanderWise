import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

// Only the public anon/publishable key is used here.
export const authEnabled = Boolean(url && key)
export const supabase = authEnabled ? createClient(url, key) : null
