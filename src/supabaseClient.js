import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://wgdatsboryieahzrpnzb.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndnZGF0c2JvcnlpZWFoenJwbnpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3MjY3ODAsImV4cCI6MjA4ODMwMjc4MH0.mzD8CfVH8jeurXZWjJxszcrD0ky_7pekOMhlhnkwM8M'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
