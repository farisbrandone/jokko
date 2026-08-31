# Jokko

Plateforme SaaS de **boutiques sociales** : un vendeur crée sa boutique en un clic,
la diffuse sur Facebook / YouTube / WhatsApp, et l'acheteur qui suit le lien ne
navigue, ne filtre et ne contacte que sur les produits de _cette_ boutique.

> `jokko` — « relier / communiquer » en wolof.

Le plan directeur complet (architecture, pile technique, feuille de route) :
**[docs/plan-directeur.md](docs/plan-directeur.md)**.

---

## Prérequis

| Outil          | Version                          |
| -------------- | -------------------------------- |
| Node           | 22 LTS (`nvm use` lit `.nvmrc`)  |
| pnpm           | 9.x (`corepack enable`)          |
| Docker + Compose | pour l'infra locale           |

## Démarrage

```bash
nvm use                       # Node 22
corepack enable               # active pnpm
pnpm install

cp .env.example .env          # ajuster si besoin
pnpm infra:up                 # postgres, redis, meilisearch, minio, imgproxy, mailpit

pnpm --filter @jokko/api db:migrate   # applique les migrations SQL
pnpm dev:api                          # API sur http://localhost:3333/api  (docs: /docs)
```

### Base de données

- **Deux rôles Postgres** : `jokko` (propriétaire, superuser — migrations et admin,
  `DATABASE_ADMIN_URL`) et `jokko_app` (non-superuser, non-bypassrls — l'API,
  `DATABASE_URL`). Le rôle applicatif restreint est ce qui rend la Row-Level
  Security effective.
- **Isolation multi-tenant** : chaque table locataire porte `shop_id` ; une
  transaction pose `set_config('app.current_shop_id', …)` et la politique RLS
  `catalog_products_tenant_isolation` filtre lecture **et** écriture. Le filtre
  MikroORM `tenant` double la protection au niveau ORM.
- **Migrations** : `apps/api/src/migrations/*.ts` (MikroORM Migrator), lancées par
  `pnpm --filter @jokko/api db:migrate`.
- **Outbox** : les événements métier sont écrits dans `outbox_messages` dans la
  même transaction que l'agrégat ; `OutboxRelay` (toutes les 2 s) les publie et
  les marque traités.

Vérifs rapides :

```bash
curl -s localhost:3333/healthz
curl -s -X POST localhost:3333/api/v1/shops/00000000-0000-0000-0000-000000000001/products \
  -H 'content-type: application/json' \
  -d '{"name":"Casque Bluetooth","category":"electronique","price":{"amount":15000,"currency":"XOF"}}'
curl -s localhost:3333/api/v1/shops/00000000-0000-0000-0000-000000000001/products
```

## Structure

```
apps/
  api/            NestJS (Fastify) — architecture hexagonale par contexte
packages/
  domain-kernel/  primitives DDD (Result, Entity, AggregateRoot, ValueObject, DomainEvent)
  contracts/      schémas Zod partagés backend / frontend
infra/
  docker/         infra locale (compose)
  caddy/          reverse proxy (dev)
  postgres/       scripts d'init
docs/             plan directeur
```

### Anatomie d'un module (`apps/api/src/modules/<contexte>/`)

```
domain/          agrégats, value objects, événements, ports (interfaces) — zéro dépendance framework
application/     cas d'usage, DTO, orchestration
infrastructure/  adaptateurs (persistance, index, API tierces)
presentation/    contrôleurs NestJS + validation Zod
```

## État

**Incrément 0 — fondations**

- [x] Monorepo pnpm + Nx, TypeScript strict, ESLint/Prettier
- [x] `domain-kernel` + `contracts`
- [x] API NestJS/Fastify qui démarre : config validée par Zod, logs Pino, `/healthz` + `/readyz`, Swagger `/docs`
- [x] Contexte `catalog` hexagonal de bout en bout
- [x] Infra locale Docker (Postgres 16, Redis 7, Meilisearch, MinIO, imgproxy, Mailpit)

**Incrément 1 — persistance**

- [x] MikroORM + PostgreSQL, migrations SQL (Migrator)
- [x] Repository `catalog` réel (RLS + filtre ORM), rôle applicatif restreint
- [x] Isolation multi-tenant vérifiée au niveau **API et base** (lecture + écriture)
- [x] Transactional Outbox + `OutboxRelay`
- [x] `/readyz` sonde la base

**Suite**

- [ ] Auth (SuperTokens) + résolution du tenant par sous-domaine / domaine perso / en-tête signé
- [ ] Recherche Meilisearch (indexation par événement) + upload signé MinIO/imgproxy
- [ ] CI GitHub Actions + Terraform/Ansible (VPS)
- [ ] Apps `storefront` / `dashboard` / `admin` (Next.js) + `packages/ui`
```
