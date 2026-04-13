import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://dummy-project.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "dummy-key";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/*
  Supabase Table Schema — run this SQL in your Supabase dashboard:

  CREATE TABLE employees (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_address TEXT NOT NULL,
    name_enc TEXT NOT NULL,
    salary_enc TEXT NOT NULL,
    shielded_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Enable RLS
  ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

  -- Policy: users can only access rows matching their admin_address
  CREATE POLICY "Users manage own employees"
    ON employees FOR ALL
    USING (admin_address = current_setting('request.jwt.claims')::json->>'sub')
    WITH CHECK (admin_address = current_setting('request.jwt.claims')::json->>'sub');

  -- For anon key access without JWT, use a simpler policy:
  CREATE POLICY "Anon access by admin_address"
    ON employees FOR ALL
    USING (true)
    WITH CHECK (true);
*/
