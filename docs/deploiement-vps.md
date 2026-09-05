# Déploiement en production — VPS nginx + pm2

Ce guide déploie Jokko sur le VPS `167.114.96.163` (2 vCores / 4 Go RAM /
40 Go NVMe) avec **nginx** en frontal et **pm2** pour les 4 apps Node. Seuls
les services de données (Postgres, Meilisearch, MinIO, imgproxy) restent en
conteneurs Docker (`infra/docker/compose.data.yaml`), liés uniquement à
`127.0.0.1`. Aucun registre d'images, aucun CI/CD : le VPS fait `git pull` +
build localement.

**Cohabitation avec l'app déjà déployée sur ce VPS via nginx** : ce guide
n'ajoute qu'un **nouveau fichier** de config nginx (`jokko.conf`), avec ses
propres noms d'hôtes (`scoliaa.com`, `api.scoliaa.com`, etc.). Il ne
modifie, ne remplace et ne recharge aucun fichier de l'app existante — un même
process nginx sert plusieurs sites en parallèle en les distinguant par nom
d'hôte (`server_name`), exactement comme il le fait déjà pour votre app
actuelle. **Aucun changement pour l'autre application.**

**Garantie demandée — persistance de l'URL de boutique** : chaque boutique
obtient son URL par sous-domaine (`ma-boutique.scoliaa.com`), généré par
l'appli elle-même à la création — nginx n'a besoin d'aucune config par
boutique. Le bloc « Vitrine » ci-dessous (§6) répond pour
`*.scoliaa.com`, donc pour n'importe quel nom de boutique, présent ou
futur, sans jamais toucher à nginx. Le certificat TLS utilisé (§5) est un
certificat **wildcard** qui couvre lui aussi tous les sous-domaines d'un
coup. Une fois sur `ma-boutique.scoliaa.com`, l'acheteur y reste : toutes
les pages et tous les appels internes de la vitrine sont construits par
Next.js à partir de ce même hôte (transmis par nginx via l'en-tête
`X-Forwarded-Host`, §7) — il n'y a aucune redirection vers un autre domaine.

Ce guide est écrit pour être exécuté **tel quel, dans l'ordre** : tous les
fichiers référencés sont déjà renseignés pour le domaine **scoliaa.com**,
rien à remplacer vous-même.

## 0. Vue d'ensemble

| Hôte public (HTTPS, nginx) | → | Process | Port local |
| --- | --- | --- | --- |
| `scoliaa.com`, `*.scoliaa.com` | → | `jokko-storefront` (pm2) | 127.0.0.1:3000 |
| `api.scoliaa.com` | → | `jokko-api` (pm2) | 127.0.0.1:3333 |
| `dashboard.scoliaa.com` | → | `jokko-dashboard` (pm2) | 127.0.0.1:3001 |
| `console.scoliaa.com` | → | `jokko-admin` (pm2) | 127.0.0.1:3002 |
| `media.scoliaa.com` | → | MinIO (Docker) | 127.0.0.1:9000 |
| `img.scoliaa.com` | → | imgproxy (Docker) | 127.0.0.1:8080 |

Budget RAM (4 Go total, partagé avec l'app déjà en place) : Postgres ~200 Mo,
Meilisearch ~150 Mo, MinIO ~100 Mo, imgproxy ~50 Mo, API ~250-450 Mo, 3× Next
standalone ~150-350 Mo chacune. **Serré** si l'autre app consomme déjà de la
RAM : voir §2 (swap) et construire les 4 apps **une par une**, jamais en
parallèle.

## 1. DNS — à créer chez votre registraire

| Type | Nom | Valeur |
| --- | --- | --- |
| A | `@` | `167.114.96.163` |
| A | `*` | `167.114.96.163` |
| A | `api` | `167.114.96.163` (inutile si `*` déjà présent) |
| A | `dashboard` | idem |
| A | `console` | idem |
| A | `media` | idem |
| A | `img` | idem |

Un enregistrement `A *` couvre déjà tous les sous-domaines
(`api.`, `dashboard.`, `console.`, `media.`, `img.`, et tout
`<slug-boutique>.scoliaa.com`) : les lignes dédiées sont facultatives si
le wildcard est en place.

## 2. Certificat TLS wildcard (une seule fois)

Un certificat classique ne couvre pas `*.scoliaa.com` : il faut soit du
DNS-01, soit passer par Cloudflare. **Option la plus simple** (recommandée,
gratuite, sans renouvellement à automatiser) : mettre la zone DNS derrière
Cloudflare et utiliser son certificat d'origine.

1. Créer un compte Cloudflare (gratuit) et y ajouter votre domaine (suivre
   l'assistant : Cloudflare vous donne 2 serveurs de noms à renseigner chez
   votre registraire — cette étape se fait sur le site du registraire, hors
   VPS).
2. Une fois le domaine actif sur Cloudflare, recréer les enregistrements du
   §1 dans le tableau de bord Cloudflare, **nuage orange activé** (proxy) sur
   chacun.
3. **SSL/TLS → Vue d'ensemble** → mode **Full (strict)**.
4. **SSL/TLS → Origine → Créer un certificat** :
   - Hôtes : `scoliaa.com`, `*.scoliaa.com`
   - Validité : 15 ans
   - Cliquer **Créer** → **copier le certificat ET la clé privée affichés**
     (ils ne seront plus jamais réaffichés ensuite).

Gardez ces deux blocs de texte sous la main pour l'étape 5.

## 3. Préparation du VPS

```bash
apt update && apt upgrade -y
apt install -y git curl build-essential

# swap de sécurité (build de 4 apps Next + API sur 4 Go RAM partagés avec
# l'app déjà en place) — 2 Go suffisent, à sauter si un swap existe déjà
swapon --show   # si une ligne s'affiche, un swap existe déjà : passer à la suite
fallocate -l 2G /swapfile && chmod 600 /swapfile
mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab

# Docker (services de données uniquement — à sauter si déjà installé pour l'autre app)
docker --version || curl -fsSL https://get.docker.com | sh

# Node 22 + pnpm (dédié à Jokko, n'interfère pas avec le Node de l'autre app)
curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh"
nvm install 22 && corepack enable

# pm2 global (si déjà installé pour l'autre app, cette commande ne fait rien de plus)
npm install -g pm2
```

## 4. Récupération du code

```bash
git clone <votre-dépôt> /srv/jokko   # ou, pour une mise à jour : cd /srv/jokko && git pull
cd /srv/jokko
nvm use
corepack enable
pnpm install
```

## 5. Certificat TLS — dépôt des fichiers

```bash
mkdir -p /etc/nginx/certs
nano /etc/nginx/certs/cloudflare-origin.pem   # coller le certificat de l'étape 2 → Ctrl+O, Entrée, Ctrl+X
nano /etc/nginx/certs/cloudflare-origin.key   # coller la clé privée de l'étape 2 → Ctrl+O, Entrée, Ctrl+X
chmod 600 /etc/nginx/certs/cloudflare-origin.key
```

## 6. Config nginx — ajout du site Jokko

```bash
cd /srv/jokko

mkdir -p /etc/nginx/snippets
cp infra/nginx/snippets/jokko-proxy.conf /etc/nginx/snippets/jokko-proxy.conf

cp infra/nginx/jokko.conf /etc/nginx/sites-available/jokko.conf
ln -s /etc/nginx/sites-available/jokko.conf /etc/nginx/sites-enabled/jokko.conf

nginx -t                        # doit afficher "syntax is ok" / "test is successful"
systemctl reload nginx
```

> Cette étape ne touche à aucun fichier existant : elle ne fait que créer
> `jokko.conf` (déjà réglé pour `scoliaa.com`) puis le lier dans
> `sites-enabled`, à côté de ce qui y est déjà pour l'autre app.

## 7. Services de données (Docker)

```bash
cd /srv/jokko
cp infra/docker/.env.prod.pm2.example .env
nano .env
# → domaine déjà réglé sur scoliaa.com, rien à changer sur ce point
# → renseigner tous les CHANGE_ME_* (générer chaque secret avec la commande
#   indiquée en commentaire au-dessus de chaque ligne, ou voir §8)
# → ⚠️ CHANGE_ME_pg_owner et CHANGE_ME_pg_app apparaissent CHACUN 2 fois
#   (une fois seul, une fois recopié dans une URL DATABASE_*) : remplacez
#   les 2 occurrences par la MÊME valeur, sinon l'API échoue à se
#   connecter à Postgres ("password authentication failed").

docker compose -f infra/docker/compose.data.yaml --env-file .env up -d
docker compose -f infra/docker/compose.data.yaml ps   # tout doit afficher "healthy"
```

## 8. Secrets — checklist `.env` complète

Déjà dans `.env` (§7) — valeurs à fournir vous-même :

| Variable | Obligatoire | Commande pour la générer |
| --- | --- | --- |
| `POSTGRES_PASSWORD` | ✅ | `openssl rand -hex 32` (pas de `base64` : recopié dans une URL `postgres://`, un `/` généré la casserait) |
| `JOKKO_APP_PASSWORD` | ✅ | `openssl rand -hex 32` (même raison) |
| `MEILI_MASTER_KEY` | ✅ | `openssl rand -base64 36` |
| `S3_SECRET_KEY` | ✅ | `openssl rand -base64 36` |
| `AUTH_JWT_SECRET` | ✅ | `openssl rand -base64 48` |
| `TENANT_HEADER_SECRET` | ✅ | `openssl rand -base64 36` |
| `SMTP_URL` (hôte + identifiants) | ✅ | fourni par votre relais SMTP — voir §9 |
| `METRICS_TOKEN` | recommandé | `openssl rand -base64 24` (sinon `/metrics` reste accessible sans auth) |
| `IMGPROXY_KEY` / `IMGPROXY_SALT` | recommandé | `openssl rand -hex 64` (deux fois) |
| `GOOGLE_OAUTH_CLIENT_ID/SECRET` | optionnel | console Google Cloud → identifiants OAuth 2.0 |
| `FACEBOOK_OAUTH_CLIENT_ID/SECRET` | optionnel | Meta for Developers → app Facebook Login |
| `TERMII_API_KEY` | optionnel | tableau de bord Termii |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | optionnel | `npx web-push generate-vapid-keys` (local) |
| `FLW_SECRET_KEY` / `FLW_WEBHOOK_SECRET` | optionnel* | tableau de bord Flutterwave |

`*` Sans clé Flutterwave, la passerelle de paiement retombe en mode « fake »
(valide tout paiement automatiquement) — à ne pas garder dès que de vrais
paiements sont attendus. Toute variable non « ✅ »/« recommandé » peut rester
vide : le module correspondant se dégrade proprement (SMS/WhatsApp/push en
no-op, OAuth désactivé, paiement fake).

## 9. Services tiers — ce qui est utilisé et son coût

| Service | Rôle | Obligatoire | Coût |
| --- | --- | --- | --- |
| VPS (déjà acheté) | héberge tout | — | déjà payé |
| Nom de domaine (déjà acheté) | DNS | — | déjà payé |
| Cloudflare | DNS + TLS wildcard (§2) | recommandé | **gratuit** (plan Free) |
| Relais SMTP (Brevo, Postmark, Resend, Amazon SES, Mailgun…) | e-mails transactionnels (confirmation commande, invitations équipe) | **oui** | variable — Brevo : 300 e-mails/jour gratuits ; Postmark/Resend : payant au-delà d'un petit quota gratuit ; SES : ~0,10 $/1000 e-mails. Voir `docs/email-dns.md` (SPF/DKIM/DMARC) |
| Flutterwave | paiement réel (commandes + abonnements vendeur) | non (fake sans clé) | pas d'abonnement — commission au % par transaction |
| Termii | OTP SMS + WhatsApp/SMS | non (log sans clé) | pas d'abonnement — facturé au message |
| Google / Facebook OAuth | connexion sociale | non | gratuit |
| VAPID (Web Push) | notifications navigateur | non | gratuit (auto-généré) |
| Prometheus/Grafana | supervision | non | gratuit mais consomme de la RAM — déconseillé sur ce VPS |

Le seul vivement recommandé dès le lancement est le **relais SMTP** (sans
lui, aucune confirmation de commande ni invitation d'équipe ne part
réellement par e-mail).

## 10. Build et démarrage

```bash
cd /srv/jokko
pnpm run build:packages

cp apps/storefront/.env.production.example apps/storefront/.env
cp apps/dashboard/.env.production.example  apps/dashboard/.env
cp apps/admin/.env.production.example      apps/admin/.env
# déjà réglés sur scoliaa.com, rien à éditer

pnpm --filter @jokko/api run build
pnpm --filter @jokko/storefront run build
pnpm --filter @jokko/dashboard run build
pnpm --filter @jokko/admin run build

bash infra/scripts/build-standalone.sh
```

Base de données + premier compte administrateur :

```bash
pnpm --filter @jokko/api run db:migrate:prod
pnpm --filter @jokko/api run make-admin -- <votre-email>
```

Démarrage pm2 :

```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup   # copier-coller la commande qu'elle affiche, puis l'exécuter
```

## 11. Vérification

```bash
curl -I https://scoliaa.com
curl -I https://api.scoliaa.com/api
curl -I https://dashboard.scoliaa.com
curl -I https://console.scoliaa.com
pm2 status               # les 4 process "online"
pm2 logs --lines 50
nginx -t                  # toujours "ok" — confirme que rien n'a cassé pour l'autre app
```

Dans un navigateur : créer un compte sur `dashboard.scoliaa.com`, créer
une boutique, publier un produit, vérifier son apparition sur
`https://<slug>.scoliaa.com` — c'est cette URL, générée automatiquement,
que le créateur de boutique donne à ses clients, et sur laquelle ils restent
en naviguant.

## 12. Mise à jour (redéploiement)

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

## 13. Sauvegardes

```bash
crontab -e
# ajouter une ligne :
# 0 3 * * * cd /srv/jokko && DATABASE_ADMIN_URL=postgres://jokko:<mot-de-passe>@localhost:5432/jokko bash infra/scripts/pg-backup.sh
```

Pointer `BACKUP_BUCKET` (dans `.env`) vers un stockage **externe** au VPS (ex.
OVH Object Storage, Backblaze B2) — MinIO local ne protège pas d'une panne
disque.

## 14. Limites connues

- Domaine **personnalisé** d'une boutique (propre nom de domaine du vendeur,
  distinct du sous-domaine Jokko) : la fonctionnalité existe côté app, mais
  ce déploiement nginx n'automatise pas l'émission d'un certificat par
  domaine — à traiter au cas par cas (`certbot --nginx -d
  <domaine-du-vendeur>`) le jour où un vendeur l'utilise réellement. Le
  sous-domaine Jokko (`<slug>.scoliaa.com`, §0/§11), lui, fonctionne
  pour toutes les boutiques dès le premier déploiement, sans limite.
- Un seul VPS = pas de haute disponibilité ; 1 instance pm2 par app (pas de
  cluster mode), cohérent avec 2 vCores/4 Go.
- Observabilité (Prometheus/Grafana) volontairement omise pour préserver la
  RAM ; `GET /metrics` reste disponible pour un scraping ponctuel.
