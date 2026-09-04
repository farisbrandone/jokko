# Guide de test local

Objectif : lancer Jokko en local et parcourir toutes les fonctionnalités.

## 1. Prérequis

| Outil | Version |
| --- | --- |
| Node | 22 LTS (`nvm use` lit `.nvmrc`) |
| pnpm | 9.x (`corepack enable`) |
| Docker + Compose | pour l'infra (Postgres, Meilisearch, MinIO, imgproxy, Mailpit) |

`*.lvh.me` pointe déjà sur `127.0.0.1` : les sous-domaines de boutiques
(`ma-boutique.lvh.me:3000`) fonctionnent sans configuration.

## 2. Installation (une seule fois)

```bash
nvm use && corepack enable
pnpm install

cp .env.example .env        # déjà fait : valeurs de dev
pnpm infra:up               # conteneurs (Postgres, Meili, MinIO, imgproxy, Mailpit)
pnpm db:migrate             # applique les migrations SQL
```

Le `.env` livré est réglé pour le test :

- `OTP_DEV_CODE=000000` — code SMS fixe (connexion par téléphone)
- `OAUTH_ALLOW_FAKE=true` — bouton « fournisseur de test » sur l'écran de connexion
- `DNS_STUB_ENABLED=1` — résolveur DNS simulé (domaine personnalisé)
- `SMTP_URL=smtp://localhost:51025` — e-mails visibles dans **Mailpit**
- passerelle de paiement en mode **fake** (aucune clé Flutterwave) → tout
  paiement est validé automatiquement

## 3. Démarrage

```bash
pnpm dev          # lance API + vitrine + dashboard + admin (4 process)
```

Dans un autre terminal, injecter des données de démo :

```bash
pnpm seed
```

> `pnpm seed` est idempotent : relançable sans risque. Il crée un vendeur, une
> boutique inscrite à l'annuaire et 4 produits publiés (dont un en rupture).

## 4. Accès

| Application | URL | Identifiants |
| --- | --- | --- |
| Vitrine (boutique démo) | http://la-boutique-demo.lvh.me:3000 | — |
| Vitrine (annuaire, apex) | http://lvh.me:3000 | — |
| Back-office vendeur | http://localhost:3001 | `demo@jokko.test` / `motdepasse1` |
| Console plateforme | http://localhost:3002 | voir §5.10 |
| Mailpit (e-mails) | http://localhost:58025 | — |
| Meilisearch | http://localhost:57700 | clé `jokko_dev_meili_master_key` |
| API + Swagger | http://localhost:3333/api — http://localhost:3333/docs | — |

## 5. Scénarios

### 5.1 Boutique en un clic + catalogue (dashboard)

1. http://localhost:3001 → **Créer le compte** (e-mail au choix) OU se connecter
   avec `demo@jokko.test`.
2. Si nouveau compte : `/onboarding` → nom + WhatsApp → **Créer la boutique**.
3. Sur la boutique : **Ajouter un produit** → nom, catégorie, prix (en plus
   petite unité — ex. `24900` pour 24 900 XOF), stock, image (URL) → créer.
4. Table catalogue : **Publier**. Un produit publié apparaît en vitrine après
   ~2 s (indexation Meilisearch).

### 5.2 Vitrine acheteur

1. http://la-boutique-demo.lvh.me:3000
2. Accueil = liste des produits + facettes par catégorie. Barre de recherche
   (instantanée via le BFF).
3. Fiche produit : prix, stock (« En stock » / « Rupture de stock »), galerie,
   **partage** (WhatsApp / SMS / appel), **Signaler**, bloc **Avis**.
4. Changer de langue (pied de page) : FR / EN.

### 5.3 Panier & paiement (checkout)

1. Fiche produit en stock → régler la quantité → **Ajouter au panier**
   (bouton « Panier » avec badge dans l'en-tête).
2. `/panier` : ajuster les quantités, saisir **nom + téléphone** (`+221…`),
   e-mail et note facultatifs → **Payer**.
3. Passerelle *fake* → retour immédiat → la commande passe à **Payée**, le
   stock est décrémenté, un e-mail arrive dans **Mailpit**.
4. Page `/commande/<id>` : suivi de la commande (jeton conservé dans le
   navigateur).
5. Dashboard → **Commandes** : onglet « À expédier » → **Marquer expédiée** /
   **Annuler**.

### 5.4 Messagerie acheteur ↔ vendeur

1. Fiche produit → **Contacter la boutique** → nom + téléphone + message → envoi
   (aucun compte requis). Lien « Voir la conversation » = fil acheteur par
   jeton.
2. Dashboard → **Inbox** : répondre, clôturer. Un e-mail de notification arrive
   dans Mailpit (anti-spam : une seule notif par fenêtre de cooldown).

### 5.5 Avis produits

1. Fiche produit → formulaire **Laisser un avis** (note + texte + nom) → envoi.
2. L'avis est **en attente** (invisible en vitrine).
3. Dashboard → **Avis** → onglet « En attente » → **Publier** / **Rejeter**.
4. Publié → visible en vitrine, la moyenne (étoiles) se met à jour.

### 5.6 Annuaire des boutiques

1. Dashboard → **Réglages** → section **Annuaire Jokko** → cocher + phrase
   d'accroche → Enregistrer.
2. http://lvh.me:3000 (domaine apex, sans sous-domaine) → la boutique apparaît.
   Recherche plein-texte + filtre par catégorie. Clic → sous-domaine de la
   boutique.

### 5.7 Import de produits

1. Dashboard → boutique → **Importer**.
2. Onglet **CSV** : coller par ex.
   ```
   nom,prix,stock,catégorie,image
   Souris sans fil,7500,20,Accessoires,https://picsum.photos/seed/souris/800
   Tapis de souris,2000,50,Accessoires,https://picsum.photos/seed/tapis/800
   ```
   → **Importer** → produits créés en **brouillon** (à publier ensuite).
3. Onglet **page produit** : coller l'URL d'une fiche produit d'un site tiers
   (https, avec balises OpenGraph / JSON-LD) → **Prévisualiser** → ajuster →
   **Créer le produit**. Les URL privées/`http://` sont refusées (anti-SSRF).

### 5.8 Équipe (invitations)

1. Dashboard → boutique → **Équipe** → **Inviter** : e-mail + rôle
   (`admin` / `staff` / `viewer`).
2. Le lien d'invitation est dans **Mailpit** → l'ouvrir dans une fenêtre privée,
   se connecter/s'inscrire avec l'adresse invitée → **Accepter**.
3. La personne apparaît dans la liste des membres ; changer le rôle / retirer.

### 5.9 Connexions alternatives (dashboard)

- **Téléphone (OTP)** : onglet « Téléphone » → n° `+221…` → **Recevoir un code**
  → saisir `000000` → connecté (compte créé au besoin).
- **OAuth** : bouton « Continuer avec le fournisseur de test » (`OAUTH_ALLOW_FAKE`).
- **Passkey** : `/account` → **Ajouter une passkey**. Nécessite un
  authentificateur réel (Touch ID / Windows Hello) ou l'authentificateur
  virtuel des DevTools Chrome (`More tools → WebAuthn → Add virtual
  authenticator`). Ensuite : se déconnecter → **Se connecter avec une passkey**.

### 5.10 Console plateforme (admin)

1. Se donner les droits (l'API doit tourner) :
   ```bash
   pnpm --filter @jokko/api run make-admin -- demo@jokko.test
   ```
2. http://localhost:3002 → se connecter avec `demo@jokko.test` → KPI plateforme,
   liste des boutiques (**suspendre / réactiver** — une boutique suspendue
   renvoie 404 en vitrine), file des **signalements** (retirer un produit /
   suspendre une boutique), **usurpation d'identité** support.

### 5.11 RGPD (dashboard)

- `/account` → **Télécharger l'archive** (export JSON de toutes vos données).
- **Supprimer mon compte** : refusé tant que vous possédez une boutique
  (transférez le rôle `owner` via l'onglet Équipe, ou supprimez la boutique).

### 5.12 Observabilité

- `curl http://localhost:3333/metrics` → métriques Prometheus (histogramme
  `http_request_duration_seconds`, `process_*`, `nodejs_*`).
- Pile Grafana optionnelle : `docker compose -f infra/docker/compose.obs.yaml up -d`
  (nécessite le réseau `jokko_internal` — voir `infra/observability/README.md`).

## 6. Limites du test local

- **Domaine personnalisé** (Réglages → Domaine) : l'enregistrement fonctionne,
  mais la **vérification** exige un vrai enregistrement DNS TXT ; en local elle
  échoue avec « TXT introuvable » (`DNS_STUB_ENABLED` ne fait que court-circuiter
  l'appel réseau).
- **Paiement réel** : renseigner `FLW_SECRET_KEY` + `FLW_WEBHOOK_SECRET` dans
  `.env` pour passer de la passerelle *fake* à Flutterwave.
- **Recherche** : ~2 s de latence après publication (file Meilisearch via
  l'Outbox). `pnpm --filter @jokko/api run search:reindex` force une réindexation.

## 7. Réinitialiser

```bash
pnpm --filter @jokko/api run db:fresh   # drop + recrée le schéma, rejoue les migrations
pnpm infra:down                          # arrête et supprime les conteneurs
```
