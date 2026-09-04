#!/usr/bin/env bash
# Complète la sortie « standalone » de Next (API + 3 apps) avec les assets
# statiques (.next/static, public/) que Next ne copie pas automatiquement.
# À lancer UNE FOIS après chaque `pnpm build` (avant de démarrer/redémarrer pm2).
set -euo pipefail
cd "$(dirname "$0")/../.."   # racine du repo

for app in storefront dashboard admin; do
  src="apps/$app"
  dst="apps/$app/.next/standalone/apps/$app"
  if [ ! -d "$src/.next/standalone" ]; then
    echo "⚠ $app : pas de sortie standalone — lancer d'abord pnpm --filter @jokko/$app run build (ignoré)"
    continue
  fi
  rm -rf "${dst:?}/.next/static" "${dst:?}/public"
  cp -r "$src/.next/static" "$dst/.next/static"
  if [ -d "$src/public" ]; then
    cp -r "$src/public" "$dst/public"
  fi
  echo "✓ assets statiques copiés pour $app"
done
