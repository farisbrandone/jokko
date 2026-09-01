# @jokko/e2e — tests bout-en-bout (Playwright)

Exercent la pile réelle : API compilée + `apps/dashboard` + `apps/storefront`,
contre l'infra Docker locale (Postgres, Meilisearch, MinIO).

## Lancer en local

```bash
pnpm infra:up                                   # postgres, meili, minio…
pnpm run build:packages && pnpm -r run build    # dist/ + .next/
pnpm --filter @jokko/api db:migrate
pnpm --filter @jokko/e2e install:browsers       # chromium (1re fois)
pnpm --filter @jokko/e2e test
```

Playwright démarre lui-même les 3 serveurs (API :3333, dashboard :3001,
vitrine :3000) via `webServer` et les arrête à la fin.

## Couverture

| Fichier | Scénario |
| --- | --- |
| `dashboard.spec.ts` | inscription e-mail → boutique en un clic → boutique listée ; connexion OTP (code de dev) |
| `storefront.spec.ts` | boutique + produit semés par l'API → vitrine `/s/<slug>` affiche la boutique, la fiche produit et la barre de contact |
