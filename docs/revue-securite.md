# Revue de sécurité — Jokko

Revue manuelle du dépôt (l'outil `/security-review` requiert un distant `origin`,
absent ici : le dépôt est local). À rejouer avant chaque mise en production, et à
compléter par un audit externe avant ouverture publique.

Dernière passe : incrément 26.

## Périmètre couvert

| Domaine | État | Notes |
| --- | --- | --- |
| Cloisonnement multi-locataire (RLS) | ✅ | L'API se connecte via le rôle `jokko_app` (`NOBYPASSRLS`) ; `set_config('app.current_shop_id', …, true)` par transaction + filtre MikroORM `tenant`. Pool admin (superuser) réservé aux migrations et au module `admin` (garde `PlatformAdminGuard` en base). |
| En-tête de locataire signé | ✅ | HMAC-SHA256 sur `shopId`, comparaison `timingSafeEqual` (`tenant-resolver.ts:70`). |
| Vitrine : injection d'en-tête `x-jokko-shop` | ✅ | Le middleware `delete(SHOP_HEADER)` sur la requête entrante avant de le repositionner depuis l'API — un client ne peut pas le forger. |
| Sessions & jetons | ✅ | Accès JWT HS256 court (30 min) + rafraîchissement opaque rotatif (SHA-256 en base). Cookies `httpOnly`, `SameSite=Lax`, `Secure` en prod. BFF dashboard/admin : cookies distincts, jamais exposés au navigateur. |
| Mots de passe | ✅ | `bcrypt` coût 12 ; `login` refuse un compte sans `passwordHash` (comptes créés par OTP). |
| OTP par SMS | ✅ | Code 6 chiffres, haché SHA-256, TTL 5 min, 5 tentatives max puis consommation, plafond `OTP_MAX_PER_HOUR` par numéro (429). `OTP_DEV_CODE` **doit rester vide en production** (absent de `.env.prod.example`). |
| Usurpation d'identité (support) | ✅ | Jeton 15 min, claim `act`, sans rafraîchissement, tracé (`impersonatedBy`). Transmis en query au `POST /impersonate` du BFF ; TTL court accepté pour un outil interne. |
| Limitation de débit | ✅ | `@nestjs/throttler` global (`APP_GUARD`), 12/min sur `/auth`, ~600/min ailleurs. Bypass `THROTTLE_TRUSTED_IPS` — n'y mettre que des IP internes. |
| Webhook facturation | ✅ (corrigé inc. 26) | Voir ci-dessous. |
| En-têtes de sécurité | ✅ | API : `@fastify/helmet` (CSP désactivée sur JSON). Apps Next : `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, HSTS, CSP. |
| CSP | ⚠️ | `script-src 'unsafe-inline'` (limite Next : bootstrap inline). À durcir en nonce + `strict-dynamic`. |
| Recherche (Meilisearch) | ✅ | Filtre serveur toujours `shopId` + `status = "published"` ; la clé maître n'est jamais exposée. |
| Secrets en dépôt | ✅ | `.gitignore` exclut `.env*` (sauf `.env.example`) ; `.env.prod.example` en `CHANGE_ME_*`. Clés VAPID de test et `OTP_DEV_CODE` codés en dur **uniquement** dans `harness.ts` / `playwright.config.ts`. |
| Chaîne de dépendances | ✅ | Dependabot (npm groupé + actions + docker) ; `pnpm audit --prod` en CI (advisory). |

## Corrigé dans l'incrément 26

**Webhook `POST /billing/webhook/flutterwave` acceptait des requêtes non signées
en mode « fake ».** L'ancienne logique ne vérifiait l'en-tête `verif-hash` que si
un secret était configuré ; sans passerelle réelle (dev, ou prod mal configurée),
n'importe qui pouvait `POST { data: { tx_ref } }` et, la passerelle fake
répondant toujours « succès », prolonger un abonnement gratuitement.

Correctif :

- `billing.webhookSecret` découplé de `billing.flutterwave` (source directe
  `FLW_WEBHOOK_SECRET`).
- Sans secret → `503 Service Unavailable` (le webhook est fermé).
- Signature absente ou incorrecte → `403 Forbidden`.
- Comparaison de la signature en temps constant (`timingSafeEqual`).
- Test d'intégration : ajout du cas « sans `verif-hash` → 403 ».

## Risques résiduels connus (à traiter)

1. **CSP `unsafe-inline`** sur les scripts — passer en nonce (`strict-dynamic`).
2. **Secrets de production** dans un fichier `.env` sur la VPS — migrer vers un
   gestionnaire de secrets (SOPS/age, Vault, ou secrets Docker Swarm).
3. **RGPD** : export (`GET /me/export`) + effacement (`DELETE /me`) + purge
   programmée `data-retention` livrés (inc. 28). Reste : registre des
   traitements, DPA sous-traitants, bandeau cookies si ajout de mesure tierce.
4. **Pages légales** (CGU, confidentialité, mentions) absentes.
5. **SPF/DKIM/DMARC** : à configurer côté DNS pour le domaine d'envoi.
6. **`/metrics`** (inc. 27) : jeton porteur optionnel (`METRICS_TOKEN`) +
   `METRICS_ENABLED`. En production, le restreindre en plus au réseau
   d'observabilité (pare-feu / reverse-proxy) même avec jeton.
7. Audit de pénétration externe non réalisé.
