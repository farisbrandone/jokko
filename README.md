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

### Parcours type

```bash
API=http://localhost:3333/api
curl -s $API/healthz $API/readyz

# 1. créer un compte (renvoie { user, tokens })
TOKEN=$(curl -s -X POST $API/auth/register -H 'content-type: application/json' \
  -d '{"email":"awa@ex.com","password":"motdepasse1","name":"Awa"}' \
  | node -pe 'JSON.parse(require("fs").readFileSync(0)).tokens.accessToken')

# 2. créer sa boutique (on en devient owner) → { shop, tenantHeader signé }
curl -s -X POST $API/shops -H "authorization: Bearer $TOKEN" -H 'content-type: application/json' \
  -d '{"name":"Chez Awa Électro","verticals":["electronique"],"whatsapp":"+221771234567"}'

# 3. ajouter un produit (réservé aux membres autorisés — CASL)
curl -s -X POST $API/shops/<shopId>/products -H "authorization: Bearer $TOKEN" -H 'content-type: application/json' \
  -d '{"name":"Frigo Samsung","category":"electronique","price":{"amount":250000}}'

# 4. publier le produit puis (après ~2 s d'indexation) le chercher
curl -s -X POST $API/shops/<shopId>/products/<productId>/publish -H "authorization: Bearer $TOKEN"
curl -s "$API/shops/<shopId>/search?q=frigo&sort=price_asc"

# 5. téléverser une image : URL PUT pré-signée puis PUT direct vers l'object store
curl -s -X POST $API/shops/<shopId>/media/upload-url -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' -d '{"contentType":"image/webp"}'
```

## Structure

```
apps/
  api/            NestJS (Fastify) — architecture hexagonale par contexte
  storefront/     Next.js 15 — vitrine publique par boutique (RSC/ISR)
  dashboard/      Next.js 15 — back-office vendeur (BFF, jetons côté serveur)
packages/
  domain-kernel/  primitives DDD (Result, Entity, AggregateRoot, ValueObject, DomainEvent)
  contracts/      schémas Zod partagés backend / frontend
  ui/             tokens de design + helpers partagés
infra/
  docker/         infra locale (compose)
  caddy/          reverse proxy (dev)
  postgres/       scripts d'init
docs/             plan directeur
```

### Lancer la vitrine

```bash
cd apps/storefront && cp .env.example .env      # JOKKO_API_URL, SHOP_ROOT_DOMAIN, DEFAULT_SHOP_SLUG
cd ../.. && pnpm dev:storefront                 # http://lvh.me:3000
# une boutique de slug « ma-boutique » est servie sur http://ma-boutique.lvh.me:3000
# ou, sans sous-domaine : http://localhost:3000/s/ma-boutique
```

### Lancer le back-office vendeur

```bash
cd apps/dashboard && cp .env.example .env && cd ../..
pnpm --filter @jokko/dashboard run dev        # http://localhost:3001
# /login → créer un compte → /onboarding (boutique en un clic) → /s/<id> (catalogue)
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

**Incrément 2 — tenant & auth**

- [x] Contexte `shop` : création de boutique en un clic, `GET /shops/:slug` public
- [x] Résolution du tenant : en-tête signé HMAC → sous-domaine → domaine perso → repli `/shops/:id`
- [x] Contexte `identity` : register / login / refresh (rotation) / logout / me — JWT (jose) + cookies, bcrypt
- [x] Appartenances `owner|admin|staff|viewer` + guard **CASL** (`@CheckPolicies`) sur les écritures catalogue
- [x] `AuthGuard` + `TenantGuard` + `PoliciesGuard`

**Incrément 3 — recherche & médias**

- [x] Bus d'événements in-process : `OutboxRelay` rejoue les événements vers `EventEmitter2`
- [x] Contexte `search` : index Meilisearch `products` alimenté par les événements catalogue
  (l'instantané produit voyage dans l'événement) ; `GET /shops/:id/search` public, à facettes,
  **strictement borné à la boutique** + `status = published` imposés serveur
- [x] `POST /shops/:id/products/:id/publish` (rôle `update Product`)
- [x] Contexte `media` : `POST /shops/:id/media/upload-url` → URL PUT pré-signée (S3/MinIO) +
  `publicUrl` + helper d'URL imgproxy
- [x] CLI `pnpm --filter @jokko/api search:reindex` (backfill de l'index)

**Incrément 4 — vitrine (frontend)**

- [x] `packages/ui` : tokens de design (light/dark, brand par boutique), helpers (`formatMoney`, `whatsappLink`…)
- [x] `apps/storefront` — Next.js 15 (App Router, RSC + ISR) :
  - middleware de résolution du tenant (sous-domaine `<slug>.<root>` → préfixe `/s/<slug>` → défaut dev)
  - accueil + catégorie (facettes) + **fiche produit** (OG/Twitter, **JSON-LD `Product`/`Offer`**) + recherche
  - `SearchBox` (instant search) via BFF qui **injecte l'id de boutique côté serveur** ; `ContactBar` WhatsApp/SMS/appel
- [x] `GET /shops/:id/products/:idOrSlug` public (fiche produit publiée) côté API

**Incrément 5 — back-office vendeur**

- [x] API : `PATCH /shops/:id/products/:id` (édition), `POST …/unpublish`, `GET …/:id/edit` (membre, tout statut) ;
  événements `catalog.product.updated` / `…unpublished` → réindexation Meili
- [x] `apps/dashboard` — Next.js 15, **jetons jamais exposés au navigateur** :
  route handlers `/api/auth/*` (posent des cookies httpOnly côté dashboard) + proxy authentifié
  `/api/proxy/*` (ajoute le Bearer, gère le refresh rotatif)
  - `/login` (connexion + création de compte), middleware de garde de session
  - `/onboarding` : boutique en un clic (nom, verticales, WhatsApp)
  - `/s/:id` : table produits (statut, prix, stock) + publier / dépublier
  - éditeur produit (création + édition) avec **téléversement d'images via URL PUT pré-signée**

**Incrément 6 — CI/CD &amp; déploiement VPS**

- [x] `Dockerfile` multi-stage : `infra/docker/api.Dockerfile` (NestJS → `pnpm deploy`, ~240 Mo)
  et `infra/docker/next.Dockerfile` (sortie `standalone`, param. `--build-arg APP=`)
- [x] `infra/docker/compose.prod.yaml` : caddy, api, storefront, dashboard, postgres, redis,
  meilisearch, minio, imgproxy (+ profils `tools` : `api-migrate`, `minio-setup`)
- [x] `infra/caddy/Caddyfile` prod : TLS auto, `*.jokko.shop`, **on-demand TLS** pour les
  domaines personnalisés — autorisé par `GET /api/internal/tls-authorize`
- [x] GitHub Actions : `ci.yml` (typecheck + lint + tests + build), `release.yml`
  (build + push GHCR des 3 images, puis `ssh → pull → migrate → up -d`)
- [x] `infra/terraform/` (VPS Hetzner + DNS Cloudflare) et `infra/ansible/playbook.yml`
  (Docker, UFW, fail2ban, MAJ auto, utilisateur `deploy`)
- [x] Runbook : [`infra/README.md`](infra/README.md)

**Incrément 7 — messagerie acheteur ↔ vendeur**

- [x] Contexte `messaging` : agrégat `Conversation` (+ messages), RLS par boutique, Outbox
- [x] API acheteur (public, vitrine) : `POST /shops/:id/conversations` → `{ conversationId, buyerToken }` ;
  suivi du fil et réponses par **jeton** (sans compte)
- [x] API vendeur (membre) : `GET /shops/:id/inbox`, `GET/POST …/:id`, `POST …/:id/close`
  (CASL `read` / `update` `Message`)
- [x] Vitrine : `ContactBar` → formulaire « Envoyer un message » ; page `/m/:id?token=` (fil acheteur)
- [x] Dashboard : `/s/:id/inbox` (liste filtrable open/closed) + fil + réponse + clôture

**Suite**

- [ ] Notifications sur nouveau message (e-mail / WhatsApp / push) via l'Outbox
- [ ] `storefront` : PWA, i18n (next-intl), thème par boutique éditable, image OG dynamique
- [ ] `dashboard` : analytique, TanStack Query, Storybook pour `packages/ui`
- [ ] `apps/admin` (console plateforme)
- [ ] Adaptateur SuperTokens ; OAuth ; OTP acheteurs
- [ ] Tests d'intégration (Testcontainers) dans la CI
```
