-- Remove unused encrypted columns from profiles table
ALTER TABLE public.profiles DROP COLUMN IF EXISTS email_encrypted;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS phone_encrypted;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS whatsapp_encrypted;

-- Drop encryption-related functions if they exist
DROP FUNCTION IF EXISTS public.encrypt_sensitive_data(text);
DROP FUNCTION IF EXISTS public.decrypt_sensitive_data(text);
DROP FUNCTION IF EXISTS public.get_encryption_key();