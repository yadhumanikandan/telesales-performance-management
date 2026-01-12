#!/bin/bash
set -e

if [ -z "${POSTGRES_PASSWORD:-}" ]; then
  echo "ERROR: POSTGRES_PASSWORD is not set (required to set role passwords)" >&2
  exit 1
fi

# This script sets up role passwords using the POSTGRES_PASSWORD environment variable.
# It is executed during first DB initialization by the postgres image.
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -v db_pass="$POSTGRES_PASSWORD" <<'EOSQL'
  DO $$
  BEGIN
    IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'supabase_admin') THEN
      ALTER ROLE supabase_admin WITH PASSWORD :'db_pass';
    END IF;

    IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticator') THEN
      ALTER ROLE authenticator WITH PASSWORD :'db_pass';
    END IF;

    IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'supabase_auth_admin') THEN
      ALTER ROLE supabase_auth_admin WITH PASSWORD :'db_pass';
    END IF;

    IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'supabase_storage_admin') THEN
      ALTER ROLE supabase_storage_admin WITH PASSWORD :'db_pass';
    END IF;
  END
  $$;
EOSQL

echo "Role passwords configured successfully"
