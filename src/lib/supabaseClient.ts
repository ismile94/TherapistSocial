import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ukxcfzcvkmtjtwtrsotb.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVreGNmemN2a210anR3dHJzb3RiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwMzczOTQsImV4cCI6MjA3NTYxMzM5NH0.hD3eW9c1mESHOpQVVI-lAVEW_SBCeyB40Ox1OCGjDy4'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
