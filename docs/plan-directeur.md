# Plan directeur Jokko

Le plan directeur vivant (architecture backend NestJS hexagonale, refonte du
frontend, pile technique complète, sécurité, IA, déploiement VPS, feuille de
route) est maintenu comme document visuel :

**https://claude.ai/code/artifact/b5fbb7ae-680e-4bf9-a421-c4708f22550f**

## Décisions actées (v0.4)

| Sujet             | Décision                                                                                  |
| ----------------- | ---------------------------------------------------------------------------------------- |
| Marque            | **Jokko** — site `jokko.com`, boutiques en `*.jokko.shop`                                |
| Marché pilote     | Sénégal + Côte d'Ivoire · zone **XOF** · FR · WhatsApp canal n°1                         |
| Paiement          | **Flutterwave** d'abord (mobile money + cartes) ; Stripe/PayPal pour la diaspora        |
| SMS               | Termii (secours Africa's Talking)                                                        |
| Verticales        | Électronique, Mode & accessoires, Maison & cuisine, Beauté & soin, Sport                 |
|                   | Immobilier & automobile → Phase 3 (schémas + flux « lead » dédiés)                      |
| Backend           | NestJS 11 (Fastify), hexagonal, PostgreSQL 16, MikroORM, Redis/BullMQ, Meilisearch      |
| Multi-tenant      | Schéma partagé + `shop_id` + filtre ORM global + RLS Postgres                            |
| Frontend          | 3 apps Next.js 15 (`storefront` RSC/ISR/PWA, `dashboard`, `admin`) + `packages/ui`      |
| Auth              | SuperTokens self-hosted + CASL                                                          |
| Déploiement       | VPS unique · Docker Compose · Caddy (on-demand TLS) · Cloudflare devant · Dokploy/Coolify |
| Monorepo          | pnpm + Nx                                                                               |

## Incréments de mise en place

- **0 — Fondations** ✅ : monorepo, `domain-kernel`, `contracts`, API qui démarre, contexte `catalog`, infra Docker locale.
- **1 — Persistance** ✅ : MikroORM + PostgreSQL + migrations + RLS (rôle applicatif restreint) ; Outbox transactionnel + relais ; repo `catalog` réel ; isolation vérifiée API + base.
- **2 — Tenant & Auth** ✅ : contexte `shop` (création en un clic) ; résolution du tenant (en-tête HMAC → sous-domaine → domaine perso → chemin) ; contexte `identity` (register/login/refresh rotatif/logout/me, JWT + cookies, bcrypt) ; appartenances + guard CASL sur les écritures. SuperTokens/OAuth/OTP = adaptateurs à venir derrière le port de session.
- **3 — Recherche & Médias** ✅ : bus d'événements (Outbox → EventEmitter2) ; index Meilisearch `products` alimenté par événement, recherche à facettes bornée à la boutique ; publication produit ; upload S3/MinIO pré-signé + URLs imgproxy ; CLI de réindexation.
- **4 — Vitrine** ✅ : `packages/ui` (tokens + helpers) ; `apps/storefront` Next.js 15 (RSC/ISR) — middleware de résolution du tenant par sous-domaine, accueil/catégorie/fiche produit (OG + JSON-LD)/recherche, instant search via BFF, deep links WhatsApp/SMS/appel.
- **5 — Back-office vendeur** ✅ : API `PATCH`/`unpublish`/`edit` produit + réindexation par événement ; `apps/dashboard` Next.js 15 (BFF — jetons jamais exposés au navigateur, proxy authentifié avec refresh rotatif) — login/onboarding « boutique en un clic », table catalogue, publier/dépublier, éditeur produit avec upload d'images pré-signé. Reste : inbox, analytique, `admin`, PWA/i18n storefront, Storybook.
- **6 — CI/CD & VPS** ✅ : Dockerfiles multi-stage (api `pnpm deploy`, next `standalone`) ; `compose.prod.yaml` (Caddy + services + profils outils) ; Caddyfile prod (wildcard + on-demand TLS autorisé par l'API) ; GitHub Actions CI + Release (build/push GHCR → SSH deploy) ; Terraform (Hetzner + Cloudflare) + Ansible (bootstrap hôte). Runbook : `infra/README.md`.
- **7 — Suite** : storefront PWA/i18n/thème éditable ; dashboard inbox/analytique ; `apps/admin` ; SuperTokens/OAuth/OTP ; tests d'intégration Testcontainers en CI.
