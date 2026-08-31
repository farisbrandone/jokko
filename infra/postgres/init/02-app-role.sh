#!/bin/sh
# Rôle applicatif : NON superuser, NON bypassrls → la Row-Level Security s'applique.
# Le rôle propriétaire (POSTGRES_USER) reste réservé aux migrations / admin.
# Mot de passe pris dans JOKKO_APP_PASSWORD (défaut dev : jokko_app_dev_pwd).
set -e

APP_PWD="${JOKKO_APP_PASSWORD:-jokko_app_dev_pwd}"

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-SQL
	DO \$\$
	BEGIN
	  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'jokko_app') THEN
	    CREATE ROLE jokko_app LOGIN PASSWORD '${APP_PWD}'
	      NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
	  ELSE
	    ALTER ROLE jokko_app PASSWORD '${APP_PWD}';
	  END IF;
	END
	\$\$;

	GRANT USAGE ON SCHEMA public TO jokko_app;
	GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO jokko_app;
	GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO jokko_app;

	ALTER DEFAULT PRIVILEGES FOR ROLE "$POSTGRES_USER" IN SCHEMA public
	  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO jokko_app;
	ALTER DEFAULT PRIVILEGES FOR ROLE "$POSTGRES_USER" IN SCHEMA public
	  GRANT USAGE, SELECT ON SEQUENCES TO jokko_app;
SQL
