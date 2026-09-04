# Déploiement en production — VPS nginx + pm2

Ce guide déploie Jokko sur un VPS nu (2 vCores / 4 Go RAM / 40 Go NVMe,
`167.114.96.163`) avec **nginx** en frontal et **pm2** pour les 4 apps Node.
Seuls les services de données (Postgres, Meilisearch, MinIO, imgproxy) restent
en conteneurs Docker (`infra/docker/compose.data.yaml`), liés uniquement à
`127.0.0.1`. Aucun registre d'images, aucun CI/CD : le VPS fait
`git pull` + build localement.

> Ce chemin remplace `infra/docker/compose.prod.yaml` + Caddy (toujours
> disponible dans le repo pour un autre déploiement) par nginx + pm2, à la
> demande explicite.

Remplacer partout `VOTREDOMAINE.TLD` par votre domaine réel.

## 0. Vue d'ensemble

| Hôte public (HTTPS, nginx) | → | Process | Port local |
| --- | --- | --- | --- |
| `VOTREDOMAINE.TLD` + `*.VOTREDOMAINE.TLD` | → | `jokko-storefront` (pm2) | 127.0.0.1:3000 |
| `api.VOTREDOMAINE.TLD` | → | `jokko-api` (pm2) | 127.0.0.1:3333 |
| `dashboard.VOTREDOMAINE.TLD` | → | `jokko-dashboard` (pm2) | 127.0.0.1:3001 |
| `admin.VOTREDOMAINE.TLD` | → | `jokko-admin` (pm2) | 127.0.0.1:3002 |
| `media.VOTREDOMAINE.TLD` | → | MinIO (Docker) | 127.0.0.1:9000 |
| `img.VOTREDOMAINE.TLD` | → | imgproxy (Docker) | 127.0.0.1:8080 |

Budget RAM approximatif (4 Go total) : Postgres ~200 Mo, Meilisearch ~150 Mo,
MinIO ~100 Mo, imgproxy ~50 Mo, API ~250-450 Mo, 3× Next standalone
~150-350 Mo chacune, nginx ~10 Mo, OS ~300 Mo → tient, mais **serré** : voir
§2 (swap) et construire les 4 apps **séquentiellement**, jamais en parallèle.

## 1. DNS — domaine et sous-domaines

Enregistrements à créer chez votre registraire / gestionnaire DNS :

| Type | Nom | Valeur |
| --- | --- | --- |
| A | `@` | `167.114.96.163` |
| A | `*` | `167.114.96.163` |
| A | `api` | `167.114.96.163` (inutile si couvert par le wildcard `*`) |
| A | `dashboard` | idem |
| A | `admin` | idem |
| A | `media` | idem |
| A | `img` | idem |

Un enregistrement `A *` couvre déjà `api.`, `dashboard.`, `admin.`, `media.`,
`img.` et tout sous-domaine de boutique (`ma-boutique.VOTREDOMAINE.TLD`) : les
lignes dédiées ci-dessus sont facultatives si le wildcard est en place.

### TLS wildcard — deux options

Un certificat classique (`certbot --nginx`) ne sait pas couvrir
`*.VOTREDOMAINE.TLD` : il faut une validation **DNS-01**.

- **Option recommandée — Cloudflare (gratuit)** : passer la zone DNS chez
  Cloudflare (nuage orange = proxy actif), qui gère le TLS en périphérie ;
  sur le VPS, utiliser un **certificat d'origine Cloudflare** (gratuit,
  valable 15 ans, généré dans le tableau de bord Cloudflare → SSL/TLS →
  Origine) directement dans nginx — pas de renouvellement à automatiser.
  C'est le schéma déjà documenté dans `infra/docker/Caddyfile` pour le
  déploiement Docker/Caddy existant.
- **Alternative — DNS-01 chez votre registraire** : `certbot` avec un plugin
  DNS spécifique à votre hébergeur DNS (ex. `certbot-dns-ovh` si le domaine
  est géré chez OVH — cohérent avec l'IP `167.114.96.163`, plage OVH) et
  renouvellement automatique via `certbot renew` (cron déjà posé par le
  paquet Debian/Ubuntu `certbot`).

La suite du guide utilise l'option `certbot` (DNS-01) car elle ne dépend pas
d'un choix de CDN ; avec un certificat d'origine Cloudflare, sautez
simplement l'étape « 5. Certificat TLS » et déposez les fichiers `.pem`
fournis par Cloudflare aux chemins référencés dans `infra/nginx/jokko.conf`.

## 2. Préparation du VPS

```bash
apt update && apt upgrade -y
apt install -y git curl build-essential nginx

# swap de sécurité (build de 4 apps Next + API sur 4 Go RAM) — 2 Go suffisent
fallocate -l 2G /swapfile && chmod 600 /swapfile
mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab

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

## 5. Certificat TLS (DNS-01, certbot)

```bash
apt install -y certbot python3-certbot-dns-ovh   # adapter le plugin à votre DNS
certbot certonly --dns-ovh -d 'VOTREDOMAINE.TLD' -d '*.VOTREDOMAINE.TLD'
# → certificats dans /etc/letsencrypt/live/VOTREDOMAINE.TLD/
```

(Avec l'option Cloudflare origin cert : déposer `fullchain.pem`/`privkey.pem`
manuellement au même emplacement — pas de commande `certbot`.)

## 6. nginx

```bash
cp infra/nginx/jokko.conf /etc/nginx/sites-available/jokko.conf
sed -i 's/VOTREDOMAINE\.TLD/votredomaine.tld/g' /etc/nginx/sites-available/jokko.conf
ln -s /etc/nginx/sites-available/jokko.conf /etc/nginx/sites-enabled/jokko.conf
rm -f /etc/nginx/sites-enabled/default

mkdir -p /etc/nginx/snippets
cp infra/nginx/snippets/jokko-proxy.conf /etc/nginx/snippets/jokko-proxy.conf

nginx -t && systemctl reload nginx
```

## 7. Secrets — checklist `.env` complète

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
| `SMTP_URL` (hôte/identifiants) | ✅ | relais SMTP réel — voir §8 |
| `METRICS_TOKEN` | recommandé | `openssl rand -base64 24` (sinon `/metrics` reste accessible sans auth) |
| `IMGPROXY_KEY` / `IMGPROXY_SALT` | recommandé | `openssl rand -hex 64` chacune (sinon URLs imgproxy non signées) |
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
publiques (`apps/*/.env.production.example` fournis, §9).

## 8. Services tiers — ce qui est utilisé et son coût

| Service | Rôle | Obligatoire | Coût |
| --- | --- | --- | --- |
| VPS (déjà acheté) | héberge tout | — | déjà payé |
| Nom de domaine (déjà acheté) | DNS | — | déjà payé |
| Relais SMTP (Brevo, Postmark, Resend, Amazon SES, Mailgun…) | e-mails transactionnels (confirmation commande, invitations équipe, notifications) | **oui** | variable — ex. Brevo : 300 e-mails/jour gratuits ; Postmark/Resend : payant au volume au-delà d'un petit quota gratuit ; SES : ~0,10 $/1000 e-mails. Voir `docs/email-dns.md` pour SPF/DKIM/DMARC. |
| Cloudflare (si choisi pour le TLS wildcard, §1) | DNS + certificat d'origine | recommandé | **gratuit** (plan Free) |
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

## 9. Build et démarrage

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

## 10. Vérification

```bash
curl -I https://VOTREDOMAINE.TLD              # vitrine (annuaire)
curl -I https://api.VOTREDOMAINE.TLD/api      # API
curl -I https://dashboard.VOTREDOMAINE.TLD
curl -I https://admin.VOTREDOMAINE.TLD
pm2 status                                    # les 4 process "online"
pm2 logs --lines 50
```

Puis, dans un navigateur : créer un compte sur `dashboard.VOTREDOMAINE.TLD`,
créer une boutique, publier un produit, vérifier son apparition sur
`https://<slug>.VOTREDOMAINE.TLD`.

## 11. Mise à jour (redéploiement)

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

## 12. Sauvegardes

`infra/scripts/pg-backup.sh` (déjà dans le repo) pousse un dump Postgres vers
un stockage S3-compatible. Sur ce déploiement, pointer `BACKUP_BUCKET` vers un
espace **externe** au VPS (MinIO local ne protège pas d'une panne disque) —
ex. un bucket OVH Object Storage ou Backblaze B2. À planifier via cron :

```bash
crontab -e
# 0 3 * * * cd /srv/jokko && DATABASE_ADMIN_URL=... bash infra/scripts/pg-backup.sh
```

## 13. Limites de ce déploiement

- Un seul VPS = point de défaillance unique (pas de haute disponibilité).
- 1 instance pm2 par app (pas de cluster mode) : cohérent avec 2 vCores/4 Go,
  mais un pic de charge ne sera pas absorbé par du scaling horizontal.
- Observabilité (Prometheus/Grafana) volontairement omise pour préserver la
  RAM ; `GET /metrics` reste disponible pour un sciapping ponctuel ou un
  service externe (ex. Grafana Cloud gratuit en pull distant).
