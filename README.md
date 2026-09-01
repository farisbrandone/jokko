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
  admin/          Next.js 15 — console plateforme opérateur
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
- [x] GitHub Actions : `ci.yml` (job `check` : typecheck + lint + tests unitaires + build ;
  job `integration` : Testcontainers), `release.yml`
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

**Incrément 8 — notifications e-mail**

- [x] Contexte `notifications` : `Mailer` (nodemailer / SMTP — dev : Mailpit, prod : SES/Postmark…)
- [x] `NewMessageListener` : `@OnEvent('messaging.message.sent')` → e-mail à tous les membres de la
  boutique quand un **acheteur** écrit (aperçu du message + lien direct vers le fil du dashboard) ;
  erreurs avalées (notification « au mieux »)
- [x] `MembershipRepository.listMembers(shopId)` (membres + e-mails)

**Incrément 9 — analytique**

- [x] Contexte `analytics` : table `analytics_events` (RLS par boutique), ingestion par lots
  (`POST /shops/:id/events`, public) + synthèse SQL (`GET /shops/:id/analytics/summary?days=7|30`)
- [x] Vitrine : SDK `track()` (session locale) → BFF `/api/ev` ; `page_view`, `product_view`,
  `search`, `contact_click` (canal : whatsapp / sms / call / message / share)
- [x] Dashboard : page **Statistiques** (`/s/:id/analytics`) — KPI, visites/jour, contacts par
  canal, top produits, recherches fréquentes, bascule 7 j / 30 j

**Incrément 10 — console plateforme (`apps/admin`)**

- [x] `users.is_platform_admin` + `PlatformAdminGuard` + CLI `pnpm --filter @jokko/api make-admin <email>`
- [x] `SessionUser.isPlatformAdmin` exposé par `/auth/me`
- [x] API `modules/admin` (pool `pg` dédié sur `DATABASE_ADMIN_URL`, lecture transverse hors RLS) :
  `GET /admin/overview`, `GET /admin/shops?q=`, `POST /admin/shops/:id/status` (active / suspended)
- [x] Boutique suspendue → `GET /shops/:slug` renvoie 404 (plus servie par la vitrine)
- [x] `apps/admin` Next.js 15 (port 3002) : `/login` (réservé aux admins), `/` (KPI plateforme),
  `/shops` (liste, recherche, suspendre / réactiver) — image + service prod + route Caddi `console.jokko.shop`

**Incrément 11 — tests d'intégration bout-en-bout**

- [x] `apps/api/test/harness.ts` : Testcontainers (Postgres 16 + Meilisearch v1.12), rôle
  applicatif `jokko_app` (`NOSUPERUSER NOBYPASSRLS`), migrations via la CLI compilée
  (`dist/cli/migrate.js`), app Nest démarrée depuis `dist/` (métadonnées de décorateur émises
  par `tsc`, pas de dépendance SWC)
- [x] `apps/api/test/platform.int.spec.ts` : auth (rotation refresh), isolation multi-tenant
  (RLS liste + recherche + écriture inter-boutiques refusée), catalogue → Outbox → Meilisearch,
  messagerie acheteur ↔ vendeur, analytique
- [x] `mikro-orm.config.ts` : `preferTs` déterministe (extension du fichier) — neutralise
  `detectTsNode()` qui se déclenchait à tort sous Vitest
- [x] `pnpm --filter @jokko/api test:int` (`pretest:int` = `build`) ; job CI `integration` dédié

**Incrément 12 — notifications multi-canal, préférences & anti-spam**

- [x] Ports `SmsSender` / `WhatsAppSender` (hexagonal) : adaptateur **Termii** si
  `TERMII_API_KEY`, sinon adaptateur « log » (dev / CI)
- [x] `notification_settings` par boutique (RLS) : canaux e-mail / WhatsApp / SMS +
  `cooldownSeconds` ; API `GET|PATCH /shops/:id/settings/notifications` (CASL `Shop`)
- [x] `NewMessageListener` multi-canal : fan-out e-mail + WhatsApp + SMS selon les
  préférences ; `notification_dispatch_log` (RLS) → **cooldown par conversation & canal**
  (anti re-notification)
- [x] Fonction pure `selectChannels()` (canal activé ∧ destinataire dispo ∧ hors cooldown)
  couverte par tests unitaires
- [x] Anti-spam acheteur : `MESSAGING_MAX_NEW_CONVERSATIONS_PER_HOUR` par numéro → `429`
- [x] `Mailer` : `SMTP_URL=json` → transport sans réseau (dev / CI)
- [x] Dashboard : page `/s/:id/settings` (canaux + délai anti-spam)
- [x] Intégration : préférences (défauts + persistance), cooldown, rate-limit `429`

**Incrément 13 — storefront : aperçus de lien enrichis (Open Graph dynamique)**

- [x] `opengraph-image.tsx` (boutique) : carte 1200×630 générée via `next/og` — nom,
  verticales, nombre de produits, sur dégradé de marque
- [x] `p/[slug]/opengraph-image.tsx` (produit) : nom + prix + visuel + boutique
  (vérification `HEAD` de l'image distante → repli texte si indisponible)
- [x] `siteUrl()` : URL publique dérivée de l'hôte de la requête (chaque boutique a
  son sous-domaine / domaine) → `metadataBase`, `canonical`, `og:url` corrects
- [x] `layout` : `openGraph` / `twitter` par défaut hérités par toutes les pages ;
  page produit allégée (le visuel vient de la carte générée)
- [x] `sitemap.xml` propre à la boutique (pages + produits publiés, paginé) et
  `robots.txt` (avec lien sitemap)

**Incrément 14 — identité de marque par boutique (couleur éditable)**

- [x] `shops.brand_color` (agrégat + entité + migration) ; `Shop.updateProfile()`
  (nom, WhatsApp, thème, couleur — hex `#rrggbb` normalisé/validé), tests unitaires
- [x] API `PATCH /shops/:id` (TenantGuard + AuthGuard + CASL `update Shop`) →
  `UpdateShopUseCase` ; `brandColor` exposé par `GET /shops/:slug`
- [x] storefront `lib/theme.ts` : `brandThemeCss()` surcharge `--color-brand` /
  `--color-brand-ink` (luminance WCAG) / `--color-brand-soft` (`color-mix`) ;
  `<meta name="theme-color">` ; carte OG boutique teintée à la couleur
- [x] dashboard : `/s/:id/settings` → section « Profil de la boutique »
  (nom, WhatsApp, mise en page, sélecteur de couleur)
- [x] Intégration : édition membre (nom + thème + couleur), non-membre `403`,
  hex invalide `400`, propagation à `GET /shops/:slug`

**Incrément 15 — storefront : PWA installable**

- [x] `manifest.webmanifest` dynamique par boutique (`name`, `theme_color` = couleur
  de marque, `display: standalone`)
- [x] `icon.tsx` / `apple-icon.tsx` : icône générée (`next/og`) — monogramme sur la
  couleur de la boutique, encre choisie par luminance
- [x] `sw.js` : service worker minimal — navigations réseau-d'abord + repli cache /
  page `/offline` ; assets `_next/static` + images en stale-while-revalidate ;
  jamais `/api/` ; caches versionnés, isolés par origine (sous-domaine)
- [x] `ServiceWorkerRegistrar` (enregistrement en production) ; `generateViewport`
  (`theme-color`) ; `appleWebApp` ; page `/offline`
- [x] Fumée : `/manifest.webmanifest` (JSON), `/sw.js`, `/icon` (PNG 512²),
  `/apple-icon`, `/offline` → `200`

**Incrément 16 — modération : signalements & retrait de contenu**

- [x] Contexte `moderation` : `content_reports` (RLS) — `POST /shops/:id/reports`
  (public vitrine) ; index unique partiel = dédoublonnage par auteur ; garde-fou
  anti-flood par boutique
- [x] `admin` : `GET /admin/reports?status=`, `POST /admin/reports/:id/resolve`
  (`dismiss` | `takedown`) ; takedown produit → `archived` + retrait de l'index
  Meilisearch ; takedown boutique → `suspended` ; clôture des doublons ;
  `pendingReports` dans `/admin/overview`
- [x] storefront : `ReportButton` (motif + note) sur la fiche produit → BFF
  `/api/report` ; `reporterKey` d'appareil (localStorage)
- [x] `apps/admin` : page `/reports` (onglets en attente / traités / rejetés,
  actions), KPI signalements
- [x] Intégration : dépôt + dédoublonnage, non-admin `403`, `takedown` → produit
  hors recherche, re-traitement `409` ; assertions de recherche rendues
  robustes (`expectSearchTotal` sonde la cohérence éventuelle de Meilisearch)

**Incrément 17 — notifications Web Push (VAPID)**

- [x] Contexte `push` : ports `PushSender` / `PushSubscriptionRepository` ;
  `WebPushSender` (lib `web-push`) si clés VAPID, sinon adaptateur « log » ;
  table `push_subscriptions` (clé = utilisateur, sans RLS)
- [x] API `GET /push/public-key`, `POST|DELETE /push/subscriptions` (AuthGuard,
  upsert par endpoint, purge auto sur `404/410`)
- [x] Canal `push` intégré au fan-out : `NewMessageListener` cible les abonnements
  des membres, `selectChannels` gère `hasPush` + cooldown ; `pushEnabled` dans
  `notification_settings` (défaut activé)
- [x] Dashboard : `public/sw.js` (push + `notificationclick`), `PushToggle`
  (permission → abonnement → `applicationServerKey`) sur `/s/:id/settings` ;
  case « Notifications push » dans le formulaire de préférences
- [x] Intégration : clé publique, abonnement idempotent, désabonnement, `401`
  sans jeton ; un message acheteur tente le canal sans lever d'exception

**Incrément 18 — support : usurpation d'identité (impersonation)**

- [x] `TokenService.signAccess(claims, { ttlSec })` + claim `act` (RFC 8693) ;
  `AuthGuard` expose `impersonatedBy`
- [x] `POST /admin/impersonate { userId }` (PlatformAdminGuard) → jeton d'accès
  court (15 min, sans refresh) agissant comme la cible ; audit
  `impersonation_events` (qui / sur qui / quand)
- [x] `GET /admin/shops/:id` : détail boutique + propriétaire (pool admin, hors RLS)
- [x] `apps/admin` : page `/shops/[id]` — vue support **lecture seule** (stats 7 j,
  boîte de réception, produits) via un jeton d'usurpation obtenu côté serveur ;
  lien « Inspecter » depuis la liste
- [x] Intégration : non-admin `403`, utilisateur inconnu `404`, jeton agissant
  comme le vendeur (`/auth/me`, route membre `/inbox`), ligne d'audit,
  `GET /admin/shops/:id`

**Incrément 19 — support : session d'usurpation inter-apps + signalement de conversation**

- [x] `/auth/me` renvoie `impersonatedBy` (contrat `SessionUser`)
- [x] Dashboard : route `/impersonate?token=&shopId=` — vérifie que le jeton est
  bien une usurpation (`act`) puis le pose en cookie court (`d_access`, 15 min,
  sans refresh) et redirige ; bandeau `SupportBanner` permanent (bouton
  « Quitter ») dans le layout dès que `impersonatedBy`
- [x] Console : bouton « Ouvrir le tableau de bord » sur `/shops/[id]`
  (`DASHBOARD_PUBLIC_URL/impersonate?token=…`)
- [x] Signalement de conversation : `reportTargetSchema` += `conversation`
  (colonne `target_type` élargie) ; `takedown` → conversation `closed` ;
  libellé admin = « Conversation — <acheteur> » ; bouton `ReportConversation`
  dans le fil de la boîte de réception
- [x] Intégration : `impersonatedBy` présent/nul selon la session ; signalement
  vendeur → file admin → conversation clôturée

**Suite**

- [ ] `storefront` : i18n (next-intl), invite d'installation PWA
- [ ] `dashboard` : TanStack Query, Storybook pour `packages/ui`
- [ ] Adaptateur SuperTokens ; OAuth ; OTP acheteurs
```
