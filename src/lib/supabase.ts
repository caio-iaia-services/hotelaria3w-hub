import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://zaitvvwoqwdgtliocvtf.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InphaXR2dndvcXdkZ3RsaW9jdnRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMTEwNzAsImV4cCI6MjA4NTc4NzA3MH0.jQwaWsV_kcrrvbrYwSoy7yAkEZR6dTw4Ve3iMg5VCbU'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
