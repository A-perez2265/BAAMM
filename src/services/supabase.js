import { createClient } from '@supabase/supabase-js'

// Read the Supabase connection values from the local .env file
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

// Shared Supabase client used throughout the app
export const supabase = createClient(supabaseUrl, supabaseKey)