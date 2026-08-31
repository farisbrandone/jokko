# Déploiement Jokko

VPS unique, tout en conteneurs derrière Caddy. Cloudflare devant `*.jokko.shop`.

```
Cloudflare  ──►  Caddy (:80/:443, TLS auto + on-demand)  ──►  api / storefront / dashboard
                                                              postgres · redis · meilisearch
                                                              minio · imgproxy
```

## 1. Provisionner (Terraform)

```bash
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars   # hcloud + cloudflare tokens, zone, clé SSH
terraform init && terraform apply
terraform output server_ipv4
```

Crée : serveur Hetzner (Ubuntu 24.04, cpx41), pare-feu (22/80/443), et les
enregistrements DNS Cloudflare (`@`, `*`, `api`, `dashboard` proxied ; `cname`
DNS-only pour les domaines personnalisés).

## 2. Bootstrap de l'hôte (Ansible)

```bash
cd infra/ansible
cp inventory.example.ini inventory.ini        # IP du VPS
ansible-playbook -i inventory.ini playbook.yml
```

Installe Docker + Compose, UFW, fail2ban, MAJ auto, l'utilisateur `deploy`, et
clone le dépôt dans `/opt/jokko`.

## 3. Configurer les secrets

Sur le VPS, en tant que `deploy` :

```bash
cd /opt/jokko/infra/docker
cp .env.prod.example .env
# éditer .env : générer chaque secret avec `openssl rand -base64 36`
# JOKKO_APP_PASSWORD doit être identique au mot de passe de DATABASE_URL
docker login ghcr.io          # PAT avec scope read:packages
```

## 4. Premier déploiement

```bash
docker compose -f compose.prod.yaml pull
docker compose -f compose.prod.yaml --profile tools run --rm minio-setup
docker compose -f compose.prod.yaml --profile tools run --rm api-migrate
docker compose -f compose.prod.yaml up -d
docker compose -f compose.prod.yaml exec api node dist/cli/reindex.js   # backfill de l'index
```

## 5. Déploiements suivants (automatiques)

`push` sur `main` → GitHub Actions :

1. **CI** : typecheck + lint + tests + build.
2. **Release** : build et push des images `ghcr.io/<owner>/jokko-{api,storefront,dashboard}`
   (tags `latest` + `sha-<commit>`), puis SSH sur le VPS → `pull` → `api-migrate` → `up -d`.

Secrets requis (repo GitHub) : `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`, `VPS_PATH=/opt/jokko`.

## Domaines personnalisés d'une boutique

1. Le vendeur ajoute son domaine dans le dashboard (`shops.custom_domain`).
2. Il crée un `CNAME <son-domaine> → cname.jokko.shop`.
3. À la première visite, Caddy demande à l'API (`/api/internal/tls-authorize`) ;
   comme le domaine correspond à une boutique, un certificat est émis.
