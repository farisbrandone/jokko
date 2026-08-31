-- Rôle applicatif : NON superuser, NON bypassrls.
-- L'API se connecte avec ce rôle → la Row-Level Security s'applique réellement.
-- Le rôle `jokko` (superuser) reste réservé aux migrations et à l'administration.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'jokko_app') THEN
    CREATE ROLE jokko_app LOGIN PASSWORD 'jokko_app_dev_pwd'
      NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO jokko_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO jokko_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO jokko_app;

-- Tables/séquences créées ensuite par les migrations (rôle jokko) :
-- droits DML accordés automatiquement à jokko_app.
ALTER DEFAULT PRIVILEGES FOR ROLE jokko IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO jokko_app;
ALTER DEFAULT PRIVILEGES FOR ROLE jokko IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO jokko_app;
