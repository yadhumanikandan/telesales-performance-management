-- ===========================================
-- Realtime Schema Setup
-- ===========================================

-- Create realtime schema if not exists
CREATE SCHEMA IF NOT EXISTS _realtime;

-- Grant permissions to realtime schema
GRANT USAGE ON SCHEMA _realtime TO supabase_admin;
GRANT ALL ON SCHEMA _realtime TO supabase_admin;

-- Create publication for realtime if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
END
$$;
