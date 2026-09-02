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

**Incrément 20 — storefront : i18n (next-intl) + invite d'installation PWA**

- [x] `next-intl` **sans routing par URL** : `src/i18n/request.ts` résout la locale
  par cookie `NEXT_LOCALE` → `locale` de la boutique → repli `fr` ; `next.config`
  enveloppé par `createNextIntlPlugin`
- [x] Catalogues `messages/{fr,en}.json` (namespaces `nav`, `home`, `product`,
  `contact`, `search`, `thread`, `report`, `errors`, `footer`, `install`) —
  toutes les chaînes visibles de la vitrine extraites (pluriels ICU inclus)
- [x] `<html lang>` = locale résolue ; `NextIntlClientProvider` global ;
  `LocaleSwitcher` (FR / EN, cookie) dans le pied de page
- [x] `InstallPrompt` : capture `beforeinstallprompt`, propose l'installation,
  « plus tard » mémorisé (localStorage)
- [x] Fumée : cookie `NEXT_LOCALE=en` → « Shop not found » + `<html lang="en">` ;
  défaut → « Boutique introuvable » + `lang="fr"`

**Incrément 21 — facturation : abonnement vendeur (Flutterwave)**

- [x] Contexte `billing` : agrégat `Subscription` (essai → `pro`, `renew` cumulatif,
  `isEntitled` avec fenêtre de grâce) ; tables `subscriptions` + `billing_payments`
- [x] Passerelle `PaymentGateway` : adaptateur **Flutterwave** (flux Standard :
  lien hébergé + `verify_by_reference`) si `FLW_SECRET_KEY`, sinon **fake** (auto-OK)
- [x] API : `GET /shops/:id/billing` (résumé + `entitled`), `POST …/checkout`
  (→ URL de paiement), `POST …/confirm` (retour), `POST /billing/webhook/flutterwave`
  (signé `verif-hash`) → `ApplyPaymentUseCase` **idempotent** par `tx_ref`
- [x] `BillingEnforcer` (`@Cron` horaire) : suspend les boutiques dont l'abonnement
  est échu au-delà de la grâce ; réactivation sur paiement
- [x] `Shop.suspend()` / `activate()` ; essai créé à la volée à la 1ʳᵉ consultation
- [x] Dashboard : page `/s/:id/billing` (formule, statut, renouvellement, paiement) ;
  admin : KPI « Abonnements actifs »
- [x] Intégration : essai → confirm → `pro` (idempotent), webhook, cron qui suspend

**Incrément 22 — durcissement production**

- [x] Limitation de débit globale (`@nestjs/throttler` + `APP_GUARD`) : 600 req/min/IP
  par défaut ; **12/min sur `/auth/*`** ; `@SkipThrottle` sur `/healthz` et le webhook ;
  IP internes exemptées (`THROTTLE_TRUSTED_IPS`)
- [x] En-têtes de sécurité : `@fastify/helmet` sur l'API (nosniff / frameguard / HSTS /
  `Referrer-Policy: no-referrer`) ; `headers()` sur les 3 apps Next (X-Frame-Options,
  nosniff, Referrer-Policy, Permissions-Policy, HSTS)
- [x] Observabilité : `src/tracing.ts` — SDK OpenTelemetry (auto-instrumentations +
  exporteur OTLP/HTTP) chargé en tout premier, actif seulement si
  `OTEL_EXPORTER_OTLP_ENDPOINT`
- [x] Sauvegardes : `infra/scripts/pg-backup.sh` (pg_dump → gzip → MinIO, rétention) +
  service compose `pg-backup` (profil `tools`) ; commande de restauration documentée
- [x] Intégration : présence des en-têtes de sécurité sur les réponses

**Incrément 23 — connexion par SMS (OTP)**

- [x] `users.phone` (index unique partiel) + `password_hash` nullable ; table
  `otp_challenges` ; `User.createWithPhone` (e-mail synthétique, sans mot de passe)
- [x] `OtpService` : demande (rate-limit `OTP_MAX_PER_HOUR`, code haché + TTL,
  envoi SMS Termii ou « log »), vérification (5 tentatives max, consommation) →
  compte créé/retrouvé par numéro
- [x] API : `POST /auth/otp/request` (202), `POST /auth/otp/verify` → session
  (cookies + tokens, même forme que `login`) ; `OTP_DEV_CODE` pour tests/démo
- [x] `AuthService.sessionFor()` ; `login` refuse un compte sans mot de passe
- [x] Dashboard : page `/login` à deux onglets (E-mail / Téléphone) + BFF
  `/api/auth/otp/{request,verify}`
- [x] Tests : 3 unitaires (`User`), intégration (demande → vérif → session,
  code faux `401`, re-connexion même compte, login e-mail impossible)

**Incrément 24 — tests E2E (Playwright)**

- [x] Paquet `e2e/` : Playwright pilote la pile réelle (API compilée + dashboard +
  vitrine) contre l'infra Docker locale ; `webServer` lance et arrête les 3 serveurs
- [x] Scénarios : inscription e-mail → boutique en un clic → boutique listée ;
  connexion par SMS (code de dev) ; vitrine par sous-domaine (`*.lvh.me`) →
  boutique + fiche produit + barre de contact (après attente de l'indexation Meili)
- [x] Job CI `e2e` (compose dev + migrations + `playwright install` + `test`)
- [x] Correctif : `NextIntlClientProvider` reçoit désormais `messages`/`locale`
  explicites (`getMessages()`) — les composants clients de la vitrine levaient
  `MISSING_MESSAGE`

**Incrément 25 — CSP & chaîne de dépendances**

- [x] `Content-Security-Policy` sur les 3 apps Next : `default-src 'self'`,
  `object-src 'none'`, `base-uri`/`form-action` `'self'`, `frame-ancestors`
  (`'none'` dashboard/admin, `'self'` vitrine), `img-src https:` ;
  `script-src 'unsafe-inline'` (limitation Next, à passer en nonce ensuite)
- [x] `.github/dependabot.yml` : npm (groupé) + github-actions + docker, hebdo
- [x] CI : `pnpm audit --prod --audit-level high` (advisory)
- [x] E2E rejoués avec CSP active (3/3 verts)

**Incrément 26 — revue de sécurité & durcissement du webhook**

- [x] `docs/revue-securite.md` : revue manuelle (l'outil `/security-review` exige
  un distant `origin`, absent — dépôt local) ; tableau de couverture + risques
  résiduels
- [x] Webhook `POST /billing/webhook/flutterwave` : `FLW_WEBHOOK_SECRET` découplé
  de la passerelle ; sans secret → `503` (fermé), signature absente/fausse →
  `403`, comparaison `timingSafeEqual`. Corrige une faille : en mode « fake » le
  webhook acceptait des requêtes non signées → prolongation d'abonnement gratuite
- [x] Tests : cas « webhook sans `verif-hash` → 403 » ; harness fixe
  `FLW_WEBHOOK_SECRET` (20 tests d'intégration verts)

**Incrément 27 — observabilité : métriques Prometheus**

- [x] API : `GET /metrics` (hors préfixe API, `@SkipThrottle`, hors Swagger) —
  `prom-client` (registre dédié) ; `METRICS_ENABLED` (404 si off),
  `METRICS_TOKEN` (porteur exigé, comparaison `timingSafeEqual`)
- [x] Histogramme `http_request_duration_seconds{method,route,status}` via un hook
  Fastify `onResponse` (latence + statut réels ; `route` = motif, faible
  cardinalité ; `/metrics` + sondes exclus) + métriques `process_*` / `nodejs_*`
- [x] `infra/observability/` : Prometheus (scrape + 5 règles d'alerte),
  Alertmanager, Grafana provisionné (datasource + dashboard « Jokko — API ») ;
  `infra/docker/compose.obs.yaml` (rejoint `jokko_internal`)
- [x] Test d'intégration : jeton requis (401 ×2), format Prometheus, histogramme
  HTTP alimenté (`route="/api/shops"`) — 21 tests d'intégration verts

**Incrément 28 — RGPD : purge programmée + export/effacement de compte**

- [x] Module `privacy` : pool propriétaire partagé (`shared/admin-db`, extrait du
  module admin) réutilisé pour les opérations transverses
- [x] Cron `data-retention` (quotidien 02:00) : purge OTP expirés, sessions
  révoquées/expirées (> 30 j), outbox traité (> 7 j), `analytics_events`,
  `notification_dispatch_log`, `impersonation_events`, conversations closes —
  fenêtres configurables (`RETENTION_*`), `RETENTION_ENABLED`
- [x] API : `GET /me/export` (archive JSON : profil, appartenances, sessions,
  push, réglages, facturation, conversations acheteur) ; `DELETE /me` (refus
  `409` si boutiques possédées ; sinon efface + anonymise les conversations ;
  interdit pendant une session support)
- [x] Dashboard : page `/account` (télécharger l'archive, supprimer le compte)
  + BFF `/api/account` & `/api/account/export`
- [x] Tests : 3 d'intégration (export, effacement refusé/accepté, purge) — 24 verts

**Incrément 29 — e-mails HTML + délivrabilité (SPF/DKIM/DMARC)**

- [x] `email-template.ts` : gabarit `renderEmail()` (HTML compatible clients de
  messagerie — tableaux, styles en ligne, largeur 480, en-tête marque, bouton,
  pied de page) + repli texte ; échappement centralisé
- [x] `NewMessageListener` : notification e-mail rendue via le gabarit
  (l'ancien `escapeHtml` local supprimé)
- [x] `docs/email-dns.md` : SPF (`include:` fournisseur), DKIM (CNAME sélecteur),
  DMARC (`p=none` → `quarantine` → `reject`), alignement `SMTP_FROM` / Return-Path
- [x] Tests : 3 unitaires (`renderEmail` : structure, échappement, repli texte) —
  36 unitaires, 24 d'intégration verts

**Incrément 30 — pages légales (CGU / confidentialité / mentions)**

- [x] `@jokko/ui` : `LEGAL_DOCUMENTS` — contenu structuré FR partagé (données
  sans JSX), placeholders `[À COMPLÉTER : …]` pour l'identité de l'éditeur
- [x] Vitrine : `/cgu`, `/confidentialite`, `/mentions-legales` + liens de pied
  de page (i18n `footer.terms/privacy/legal`)
- [x] Dashboard : `/legal/[slug]` (prérendu, `generateStaticParams`), liens sur
  l'écran de connexion et dans le pied de page du `Shell` ; middleware :
  `/legal/*` accessible sans authentification
- [x] Contenu : rôle d'hébergeur technique de Jokko, boutiques éditées par des
  vendeurs indépendants, durées de rétention alignées sur le cron `data-retention`,
  droits RGPD (page « Mon compte » / support), cookies strictement nécessaires

**Incrément 31 — connexion sociale (OAuth Google / Facebook)**

- [x] Port `OAuthProvider` + registre ; adaptateurs `GoogleOAuthProvider` (OIDC,
  userinfo), `FacebookOAuthProvider` (Graph API), `FakeOAuthProvider` (dev/CI,
  sans réseau, auto-activé si `NODE_ENV=test` ou `OAUTH_ALLOW_FAKE`)
- [x] Table `oauth_identities` (unique `provider` + `provider_account_id`) ;
  `User.createFromOAuth` (sans mot de passe) ; `SocialAuthService.completeLogin`
  (identité reliée → sinon compte par e-mail → sinon création + liaison)
- [x] `GET /auth/oauth/:provider/start` (cookie d'état CSRF, 302 vers le
  fournisseur) → `…/callback` (vérifie l'état, mint un *ticket* court 90 s,
  302 vers le dashboard) → `POST /auth/oauth/exchange` (BFF ↔ API : ticket →
  session ; les jetons ne transitent jamais par l'URL) ; `GET …/providers`
- [x] Dashboard : boutons « Continuer avec … » (affichés selon `…/providers`),
  BFF `/api/auth/oauth/[provider]` (redirection navigateur → API publique) et
  `/oauth/callback` (échange ticket → `writeTokens`) ; middleware public
- [x] Config : `GOOGLE_/FACEBOOK_OAUTH_CLIENT_*`, `OAUTH_REDIRECT_BASE_URL`,
  `OAUTH_POST_LOGIN_URL`, `OAUTH_ALLOW_FAKE`, `PUBLIC_API_BASE_URL` (dashboard)
- [x] Tests : 1 unitaire (`createFromOAuth`) + 3 d'intégration (flux complet
  fake + re-login = même compte, état manquant → 400, fournisseur off → 404,
  ticket invalide → 401)

**Incrément 32 — dashboard : TanStack Query**

- [x] `@tanstack/react-query` (+ devtools en dev) ; `QueryProvider` monté dans
  `layout.tsx` (staleTime 30 s, `retry: 1`, pas de refetch au focus)
- [x] `src/lib/bff.ts` : fetchers `bffGet` / `bffSend` + `BffError`
- [x] Migrations : `SocialButtons` (liste des fournisseurs OAuth) → `useQuery` ;
  suppression de compte (`AccountPrivacy`) → `useMutation` ; `del()` obsolète retiré

**Incrément 33 — Storybook pour `packages/ui`**

- [x] Composants partagés `Button` / `Badge` / `Card` : stylés par variables CSS
  (`var(--color-*)`, `var(--radius-*)`) avec repli — se posent dans n'importe
  quelle app et héritent du thème (dont la couleur de marque par boutique)
- [x] Storybook 8 (builder React + Vite) : `.storybook/{main,preview}.ts` ;
  `tokens.css` en CSS brut (miroir du bloc Tailwind `@theme`) pour le rendu hors
  pipeline app ; stories `Button` / `Badge` / `Card` + `Fondations/Tokens`
  (nuancier couleurs & rayons)
- [x] `pnpm --filter @jokko/ui run storybook` (dev) / `run build-storybook` ;
  étape CI `check` ; `storybook-static/` ignoré
- [x] `packages/ui` : `react`/`react-dom` en `peerDependencies`, tsconfig
  `jsx: react-jsx` (stories exclues du `tsc`, compilées par Storybook)

**Incrément 34 — identité de l'éditeur (pages légales)**

- [x] `packages/ui/src/legal.ts` : constantes renseignées — éditeur **Jokko SARL**
  (SARL de droit camerounais), siège Bonabéri / Douala, immatriculation
  M062416873293M, directeur de la publication Faris Kouetessa, hébergeur **OVH**,
  contact `farisbrandone0@gmail.com`
- [x] Droit applicable : droit camerounais / OHADA, tribunaux de Douala
  (section ajoutée aux mentions légales et aux CGU) ; « Transferts hors UE » →
  « Localisation et transferts des données » (hébergement UE, garanties
  contractuelles pour les sous-traitants)
- [x] Plus aucun placeholder `[À COMPLÉTER]` ; revue par un juriste recommandée
  avant ouverture commerciale

**Incrément 35 — adoption de `@jokko/ui` (dashboard & admin)**

- [x] `@jokko/ui` : `buttonStyles()` exporté (mêmes styles que `<Button>`, posables
  sur un `<a>` / `<Link>`)
- [x] Dashboard : `Button` (déconnexion, paiement, suppression de compte,
  onboarding), `buttonStyles` (boutons OAuth, lien d'export), `Badge` (rôle
  d'appartenance sur l'accueil)
- [x] Admin : `Button` (déconnexion, `ShopStatusToggle`, `ReportActions`),
  `Badge` (statut de boutique dans la liste)
- [x] Builds dashboard + admin verts

**Incrément 36 — passkeys (WebAuthn)**

- [x] API : `@simplewebauthn/server`, table `webauthn_credentials`,
  `WebAuthnService` (options / vérification, enregistrement + assertion) ;
  défi porté par un **jeton signé court** (JWT 5 min, `purpose` + `sub`) au lieu
  d'un cookie → transparent pour le BFF
- [x] Routes `POST /auth/webauthn/{register,login}/{options,verify}`,
  `GET`/`DELETE /auth/webauthn/credentials` ; `login/verify` ouvre la session
  (mêmes cookies que `login`)
- [x] Config `WEBAUTHN_RP_ID` / `WEBAUTHN_RP_NAME` / `WEBAUTHN_ORIGINS`
  (liste blanche d'origines) ; compteur anti-rejeu persisté
- [x] Dashboard : `@simplewebauthn/browser`, bouton « Se connecter avec une
  passkey » sur `/login`, section « Passkeys » sur `/account` (ajout / retrait,
  React Query) ; BFF `login/{options,verify}` + proxy authentifié pour le reste
- [x] Tests : 3 d'intégration (options + gardes + assertion bidon) ; **E2E
  Playwright** avec authentificateur virtuel CDP (enregistrement → déconnexion →
  connexion par passkey)

**Incrément 37 — équipe : membres & invitations**

- [x] Contexte `team` (hexagonal) : table `shop_invitations` (jeton haché,
  expiration 7 j, une seule invitation en attente par boutique+e-mail) ;
  `TeamService` (invitation, acceptation, changement de rôle, retrait) avec
  garde-fous « au moins un propriétaire »
- [x] API `shops/:id/members` (garde `manage Member` = owner/admin) : liste,
  `PATCH :userId` (rôle), `DELETE :userId`, `POST`/`GET`/`DELETE invitations` ;
  `GET /invitations/:token` (aperçu public) + `POST /invitations/accept`
  (connecté, e-mail doit correspondre)
- [x] E-mail d'invitation via `renderEmail()` ; `Mailer` expose une boîte
  d'envoi en mémoire (`NODE_ENV=test`) pour les assertions
- [x] Dashboard : page `/s/:id/team` (React Query — inviter, changer les rôles,
  retirer, annuler une invitation) ; page publique `/invite/:token` (aperçu +
  acceptation) ; lien « Équipe »
- [x] Tests : 1 d'intégration couvrant tout le cycle + garde-fous (31 au total) ;
  E2E « inviter un membre »

**Incrément 38 — domaine personnalisé : configuration & vérification DNS**

- [x] Agrégat `Shop` : `requestCustomDomain` / `confirmCustomDomain` /
  `clearCustomDomain` ; colonnes `custom_domain_verified_at` + `custom_domain_token`
- [x] Port `DnsVerifier` (`NodeDnsVerifier` via `dns/promises`, `StubDnsVerifier`
  en mémoire si `DNS_STUB_ENABLED=1`) ; `CustomDomainService` (demande → jeton +
  instructions CNAME/TXT → vérification `_jokko-challenge.<domaine>` → activation)
- [x] Seuls les domaines **vérifiés** résolvent une boutique (`findByCustomDomain`
  filtre) et sont autorisés par `/internal/tls-authorize`
- [x] API `shops/:id/domain` : `GET` (état), `POST` (demande), `POST verify`,
  `DELETE` (garde `update Shop`)
- [x] Dashboard : section « Domaine personnalisé » dans les réglages (React
  Query — saisie, instructions DNS, bouton Vérifier, retrait)
- [x] Tests : 1 d'intégration (domaine invalide/racine → 400, demande → jeton,
  vérif sans TXT → 400, TLS refusé, puis TXT publié → vérif OK → TLS autorisé,
  retrait) — 32 au total

**Incrément 39 — avis produits (notation & modération vendeur)**

- [x] Contexte `reviews` : table `product_reviews` (RLS, note 1–5, statut
  `pending`/`published`/`rejected`) ; dépôt public modéré (`pending` par défaut,
  `@Throttle` 5/min) uniquement sur un produit publié
- [x] API : `GET`/`POST /shops/:id/products/:pid/reviews` (public),
  `GET /shops/:id/reviews?status=` + `POST /shops/:id/reviews/:rid/moderate`
  (membre — `read`/`manage Product`) ; agrégat `{ average, count, distribution }`
- [x] Vitrine : bloc « Avis » sur la fiche produit (étoiles, moyenne, liste,
  formulaire) + `aggregateRating` dans le JSON-LD ; BFF `/api/reviews`
- [x] Dashboard : page `/s/:id/reviews` (onglets En attente / Publiés / Rejetés,
  boutons Publier / Rejeter — React Query) ; lien « Avis »
- [x] Tests : 1 d'intégration (dépôt → file → modération tiers refusée → publier
  → moyenne, rejet sans effet, produit non publié → 404, note invalide → 400) —
  33 au total

**Suite**

- [ ] SuperTokens (fédération d'identité gérée) si besoin ultérieur
```
