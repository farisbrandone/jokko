# Déploiement en production — VPS Caddy + pm2

Ce guide déploie Jokko sur un VPS nu (2 vCores / 4 Go RAM / 40 Go NVMe,
`167.114.96.163`) avec **Caddy** en frontal et **pm2** pour les 4 apps Node.
Seuls les services de données (Postgres, Meilisearch, MinIO, imgproxy) restent
en conteneurs Docker (`infra/docker/compose.data.yaml`), liés uniquement à
`127.0.0.1`. Aucun registre d'images, aucun CI/CD : le VPS fait
`git pull` + build localement.

> Caddy est choisi plutôt que nginx pour deux raisons propres à ce projet :
> son HTTPS automatique élimine tout le pan opérationnel certbot/cron/reload,
> et surtout `infra/caddy/Caddyfile` (déploiement Docker/Caddy déjà existant
> dans le repo) contient déjà le routage multi-tenant validé pour cette appli
> (sous-domaines de boutiques, domaines personnalisés en on-demand TLS) —
> `infra/caddy/Caddyfile.pm2` en est une adaptation directe (mêmes hôtes,
> proxy vers `127.0.0.1:<port>` au lieu des noms de conteneurs Docker).
> Docker Compose + Caddy conteneurisé (`compose.prod.yaml`) reste disponible
> pour un autre déploiement ; ce chemin est indépendant et ne le modifie pas.

Remplacer partout `VOTREDOMAINE.TLD` par votre domaine réel.

## 0. Vue d'ensemble

| Hôte public (HTTPS, Caddy) | → | Process | Port local |
| --- | --- | --- | --- |
| `VOTREDOMAINE.TLD`, `www.`, `*.VOTREDOMAINE.TLD` | → | `jokko-storefront` (pm2) | 127.0.0.1:3000 |
| `api.VOTREDOMAINE.TLD` | → | `jokko-api` (pm2) | 127.0.0.1:3333 |
| `dashboard.VOTREDOMAINE.TLD` | → | `jokko-dashboard` (pm2) | 127.0.0.1:3001 |
| `console.VOTREDOMAINE.TLD` | → | `jokko-admin` (pm2) | 127.0.0.1:3002 |
| `media.VOTREDOMAINE.TLD` | → | MinIO (Docker) | 127.0.0.1:9000 |
| `img.VOTREDOMAINE.TLD` | → | imgproxy (Docker) | 127.0.0.1:8080 |
| domaines personnalisés des boutiques | → | `jokko-storefront` (pm2) | 127.0.0.1:3000 |

Budget RAM approximatif (4 Go total) : Postgres ~200 Mo, Meilisearch ~150 Mo,
MinIO ~100 Mo, imgproxy ~50 Mo, API ~250-450 Mo, 3× Next standalone
~150-350 Mo chacune, Caddy ~30-50 Mo, OS ~300 Mo → tient, mais **serré** :
voir §2 (swap) et construire les 4 apps **séquentiellement**, jamais en
parallèle.

## 1. DNS — domaine et sous-domaines

Jokko a besoin de deux familles d'hôtes DNS, traités différemment par Caddy
(voir `infra/caddy/Caddyfile.pm2`, en tête de fichier) :

### 1.1 Hôtes propres à la plateforme (proxied Cloudflare)

| Type | Nom | Valeur | Proxy Cloudflare |
| --- | --- | --- | --- |
| A | `@` | `167.114.96.163` | 🟠 activé |
| A | `www` | `167.114.96.163` | 🟠 activé |
| A | `*` | `167.114.96.163` | 🟠 activé |
| A | `api` | `167.114.96.163` | 🟠 activé |
| A | `dashboard` | `167.114.96.163` | 🟠 activé |
| A | `console` | `167.114.96.163` | 🟠 activé |
| A | `media` | `167.114.96.163` | 🟠 activé |
| A | `img` | `167.114.96.163` | 🟠 activé |

Passer la zone DNS chez **Cloudflare** (gratuit) est la voie recommandée : le
nuage orange (proxy actif) fait que le navigateur ne parle TLS qu'à
Cloudflare, qui gère lui-même le certificat public wildcard — Caddy n'a alors
besoin, côté origine, que d'un **certificat d'origine Cloudflare** statique
(gratuit, valable 15 ans, aucun renouvellement à automatiser).

Dans le tableau de bord Cloudflare :

1. **SSL/TLS → Vue d'ensemble** → mode **Full (strict)**.
2. **SSL/TLS → Origine → Créer un certificat** → hôtes
   `VOTREDOMAINE.TLD, *.VOTREDOMAINE.TLD` → copier le certificat et la clé
   générés (valides 15 ans, à ne montrer qu'une fois).

### 1.2 Domaines personnalisés des boutiques (DNS direct, sans Cloudflare)

Une boutique peut brancher son propre domaine (`macboutique.com`) sur Jokko
(fonctionnalité « domaine personnalisé », Réglages → Domaine). Le CNAME que
*vos vendeurs* pointeront chez eux doit rester **DNS direct** (pas de proxy
Cloudflare) pour que Caddy puisse dialoguer en direct avec Let's Encrypt et
émettre un vrai certificat, à la demande, pour chaque domaine vérifié :

| Type | Nom | Valeur | Proxy Cloudflare |
| --- | --- | --- | --- |
| A | `cname` | `167.114.96.163` | ⚪ **désactivé** (DNS only) |

C'est cette adresse (`cname.VOTREDOMAINE.TLD`) que vous communiquez aux
vendeurs comme cible de CNAME pour leur domaine personnalisé.

## 2. Préparation du VPS

```bash
apt update && apt upgrade -y
apt install -y git curl build-essential debian-keyring debian-archive-keyring apt-transport-https

# swap de sécurité (build de 4 apps Next + API sur 4 Go RAM) — 2 Go suffisent
fallocate -l 2G /swapfile && chmod 600 /swapfile
mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab

# Caddy (dépôt officiel)
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt update && apt install -y caddy

# Docker (services de données uniquement)
curl -fsSL https://get.docker.com | sh

# Node 22 + pnpm
curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh"
nvm install 22 && corepack enable

# pm2 global
npm install -g pm2
```

## 3. Récupération du code

Le VPS est déjà ouvert dans VS Code : cloner (première fois) ou tirer
(mises à jour) le dépôt à l'emplacement de votre choix, par ex. `/srv/jokko` :

```bash
git clone <votre-dépôt> /srv/jokko   # ou : cd /srv/jokko && git pull
cd /srv/jokko
nvm use
corepack enable
pnpm install
```

## 4. Services de données (Docker)

```bash
cd /srv/jokko
cp infra/docker/.env.prod.pm2.example .env
$EDITOR .env   # renseigner tous les CHANGE_ME_* (voir §7 « secrets »)

docker compose -f infra/docker/compose.data.yaml --env-file .env up -d
docker compose -f infra/docker/compose.data.yaml ps   # tout doit être "healthy"
```

## 5. Certificat d'origine Cloudflare + Caddy

```bash
mkdir -p /etc/caddy/certs
$EDITOR /etc/caddy/certs/cloudflare-origin.pem   # coller le certificat (§1.1)
$EDITOR /etc/caddy/certs/cloudflare-origin.key   # coller la clé privée
chmod 600 /etc/caddy/certs/cloudflare-origin.key

cp infra/caddy/Caddyfile.pm2 /etc/caddy/Caddyfile
sed -i 's/VOTREDOMAINE\.TLD/votredomaine.tld/g; s/admin@votredomaine\.tld/<votre-e-mail>/' /etc/caddy/Caddyfile

caddy validate --config /etc/caddy/Caddyfile
systemctl reload caddy
```

Le bloc `on_demand_tls` du Caddyfile (domaines personnalisés des boutiques,
§1.2) émet lui un vrai certificat Let's Encrypt par domaine, automatiquement,
la première fois qu'une requête arrive — aucune action manuelle par boutique.

## 6. Secrets — checklist `.env` complète

Fichier : `.env` à la racine du repo (copié depuis
`infra/docker/.env.prod.pm2.example`, §4). Valeurs à fournir vous-même :

| Variable | Obligatoire | Comment l'obtenir |
| --- | --- | --- |
| `POSTGRES_PASSWORD` | ✅ | `openssl rand -base64 36` |
| `JOKKO_APP_PASSWORD` | ✅ | `openssl rand -base64 36` |
| `MEILI_MASTER_KEY` | ✅ | `openssl rand -base64 36` |
| `S3_SECRET_KEY` | ✅ | `openssl rand -base64 36` |
| `AUTH_JWT_SECRET` | ✅ | `openssl rand -base64 48` |
| `TENANT_HEADER_SECRET` | ✅ | `openssl rand -base64 36` |
| `SMTP_URL` (hôte/identifiants) | ✅ | relais SMTP réel — voir §7 |
| `METRICS_TOKEN` | recommandé | `openssl rand -base64 24` (sinon `/metrics` reste accessible sans auth) |
| `IMGPROXY_KEY` / `IMGPROXY_SALT` | recommandé | `openssl rand -hex 64` chacune (sinon URLs imgproxy non signées) |
| Certificat d'origine Cloudflare (§5) | ✅ | tableau de bord Cloudflare → SSL/TLS → Origine |
| `GOOGLE_OAUTH_CLIENT_ID/SECRET` | optionnel | console Google Cloud → identifiants OAuth 2.0 |
| `FACEBOOK_OAUTH_CLIENT_ID/SECRET` | optionnel | Meta for Developers → app Facebook Login |
| `TERMII_API_KEY` | optionnel | tableau de bord Termii (SMS OTP + WhatsApp/SMS) |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | optionnel | `npx web-push generate-vapid-keys` (local, gratuit) |
| `FLW_SECRET_KEY` / `FLW_WEBHOOK_SECRET` | optionnel* | tableau de bord Flutterwave (clés API + secret webhook) |

`*` Sans clé Flutterwave, la passerelle de paiement retombe en mode « fake »
(valide tout paiement automatiquement) — **à ne jamais garder en prod** dès
que de vrais paiements sont attendus.

Chaque variable non « ✅ »/« recommandé » peut rester vide : le module
correspondant se dégrade proprement (canal SMS/WhatsApp en no-op, push
en no-op, OAuth désactivé, paiement fake).

Les apps Next (`apps/storefront/.env`, `apps/dashboard/.env`,
`apps/admin/.env`) n'ont besoin d'aucun secret — seulement des URLs
publiques (`apps/*/.env.production.example` fournis, §8).

## 7. Services tiers — ce qui est utilisé et son coût

| Service | Rôle | Obligatoire | Coût |
| --- | --- | --- | --- |
| VPS (déjà acheté) | héberge tout | — | déjà payé |
| Nom de domaine (déjà acheté) | DNS | — | déjà payé |
| Cloudflare | DNS + TLS wildcard + certificat d'origine (§1, §5) | recommandé | **gratuit** (plan Free) |
| Relais SMTP (Brevo, Postmark, Resend, Amazon SES, Mailgun…) | e-mails transactionnels (confirmation commande, invitations équipe, notifications) | **oui** | variable — ex. Brevo : 300 e-mails/jour gratuits ; Postmark/Resend : payant au volume au-delà d'un petit quota gratuit ; SES : ~0,10 $/1000 e-mails. Voir `docs/email-dns.md` pour SPF/DKIM/DMARC. |
| Flutterwave | paiement réel des commandes et abonnements vendeur | non (fake sans clé) | **pas d'abonnement mensuel** — commission au pourcentage par transaction (voir flutterwave.com/tarifs pour votre marché) |
| Termii | OTP SMS + notifications WhatsApp/SMS | non (log sans clé) | **pas d'abonnement** — facturé au message envoyé (pas de palier gratuit significatif) |
| Google OAuth | connexion sociale | non | **gratuit** |
| Facebook OAuth | connexion sociale | non | **gratuit** |
| VAPID (Web Push) | notifications navigateur | non | **gratuit** (clé auto-générée, aucun compte tiers) |
| Prometheus/Grafana (`infra/observability/`) | supervision | non | gratuit mais **consomme de la RAM** — déconseillé sur 4 Go, à activer seulement sur un VPS plus grand |

Aucun de ces services n'est requis pour que l'application démarre : sans eux,
elle tourne en mode dégradé (paiement fake, pas d'e-mails, pas de SMS/push,
pas de connexion sociale). Le seul qu'il est vivement recommandé de brancher
dès le lancement est le **relais SMTP** (sans lui, aucune confirmation de
commande, invitation d'équipe ou export RGPD par e-mail ne part réellement).

## 8. Build et démarrage

Séquentiel (pas de build en parallèle — RAM limitée) :

```bash
cd /srv/jokko
pnpm run build:packages

# Renseigner les .env des 3 apps Next AVANT de builder (valeurs copiées
# dans la sortie standalone au moment du build, voir apps/*/.env.production.example)
cp apps/storefront/.env.production.example apps/storefront/.env
cp apps/dashboard/.env.production.example  apps/dashboard/.env
cp apps/admin/.env.production.example      apps/admin/.env
# puis sed/$EDITOR pour remplacer VOTREDOMAINE.TLD dans les 3 fichiers

pnpm --filter @jokko/api run build
pnpm --filter @jokko/storefront run build
pnpm --filter @jokko/dashboard run build
pnpm --filter @jokko/admin run build

bash infra/scripts/build-standalone.sh   # copie .next/static + public/
```

Première mise en place de la base et d'un compte admin :

```bash
pnpm --filter @jokko/api run db:migrate:prod
pnpm --filter @jokko/api run make-admin -- <votre-email>
```

Démarrage pm2 :

```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup   # exécuter la commande affichée (persistance au reboot)
```

## 9. Vérification

```bash
curl -I https://VOTREDOMAINE.TLD              # vitrine (annuaire)
curl -I https://api.VOTREDOMAINE.TLD/api      # API
curl -I https://dashboard.VOTREDOMAINE.TLD
curl -I https://console.VOTREDOMAINE.TLD
pm2 status                                    # les 4 process "online"
pm2 logs --lines 50
systemctl status caddy                        # "active (running)"
journalctl -u caddy -n 50                     # erreurs éventuelles de cert
```

Puis, dans un navigateur : créer un compte sur `dashboard.VOTREDOMAINE.TLD`,
créer une boutique, publier un produit, vérifier son apparition sur
`https://<slug>.VOTREDOMAINE.TLD`.

## 10. Mise à jour (redéploiement)

```bash
cd /srv/jokko
git pull
pnpm install
pnpm run build:packages
pnpm --filter @jokko/api run build
pnpm --filter @jokko/storefront run build
pnpm --filter @jokko/dashboard run build
pnpm --filter @jokko/admin run build
bash infra/scripts/build-standalone.sh
pnpm --filter @jokko/api run db:migrate:prod   # si nouvelles migrations
pm2 restart ecosystem.config.cjs
```

Si `infra/caddy/Caddyfile.pm2` a changé (nouveaux hôtes) : rejouer §5.

## 11. Sauvegardes

`infra/scripts/pg-backup.sh` (déjà dans le repo) pousse un dump Postgres vers
un stockage S3-compatible. Sur ce déploiement, pointer `BACKUP_BUCKET` vers un
espace **externe** au VPS (MinIO local ne protège pas d'une panne disque) —
ex. un bucket OVH Object Storage ou Backblaze B2. À planifier via cron :

```bash
crontab -e
# 0 3 * * * cd /srv/jokko && DATABASE_ADMIN_URL=... bash infra/scripts/pg-backup.sh
```

## 12. Limites de ce déploiement

- Un seul VPS = point de défaillance unique (pas de haute disponibilité).
- 1 instance pm2 par app (pas de cluster mode) : cohérent avec 2 vCores/4 Go,
  mais un pic de charge ne sera pas absorbé par du scaling horizontal.
- Le certificat d'origine Cloudflare (§5) ne protège que les hôtes derrière
  le proxy Cloudflare ; les domaines personnalisés des boutiques (§1.2, DNS
  direct) dépendent de la disponibilité de Let's Encrypt pour leur premier
  certificat — un léger délai est possible à la toute première visite.
- Observabilité (Prometheus/Grafana) volontairement omise pour préserver la
  RAM ; `GET /metrics` reste disponible pour un scraping ponctuel ou un
  service externe (ex. Grafana Cloud gratuit en pull distant).
