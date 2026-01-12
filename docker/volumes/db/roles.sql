-- ===========================================
-- Supabase Role Configuration
-- This file sets up the role passwords after the supabase/postgres image 
-- has created the roles
-- ===========================================

-- Set passwords for all service roles using the POSTGRES_PASSWORD env var
-- The supabase/postgres image creates these roles but we need to set passwords

DO $$
DECLARE
    db_pass TEXT := current_setting('app.settings.postgres_password', true);
BEGIN
    -- If postgres_password is not set, try to get from environment
    IF db_pass IS NULL OR db_pass = '' THEN
        db_pass := current_setting('POSTGRES_PASSWORD', true);
    END IF;
    
    -- Fallback to default if still not set
    IF db_pass IS NULL OR db_pass = '' THEN
        db_pass := 'your-super-secret-password';
    END IF;

    -- Set passwords for all supabase service roles
    EXECUTE format('ALTER ROLE authenticator WITH PASSWORD %L', db_pass);
    EXECUTE format('ALTER ROLE supabase_auth_admin WITH PASSWORD %L', db_pass);
    EXECUTE format('ALTER ROLE supabase_storage_admin WITH PASSWORD %L', db_pass);
    EXECUTE format('ALTER ROLE supabase_admin WITH PASSWORD %L', db_pass);
    
    RAISE NOTICE 'Role passwords have been configured successfully';
END
$$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON SCHEMA public TO supabase_admin;

-- Default privileges for new tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO supabase_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO anon;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO supabase_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE ON SEQUENCES TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO supabase_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon;
