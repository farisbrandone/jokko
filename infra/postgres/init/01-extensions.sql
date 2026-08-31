-- Extensions requises par Jokko (exécuté une fois à la création du volume Postgres).
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";
-- pgvector : décommenter quand l'image Postgres embarquera l'extension (recherche sémantique, Phase 3)
-- CREATE EXTENSION IF NOT EXISTS vector;
