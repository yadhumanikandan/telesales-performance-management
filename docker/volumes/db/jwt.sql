-- ===========================================
-- JWT Configuration for Supabase
-- ===========================================

-- Create the pgjwt extension if not exists
CREATE EXTENSION IF NOT EXISTS pgjwt WITH SCHEMA extensions;

-- Set JWT secret from environment
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-super-secret-jwt-token-with-at-least-32-characters';
