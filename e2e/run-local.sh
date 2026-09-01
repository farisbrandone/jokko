#!/usr/bin/env bash
# Aide au débogage local : lance les E2E et écrit tout dans e2e/last-run.log
set -o pipefail
cd "$(dirname "$0")"
OUT="last-run.log"
: > "$OUT"
pkill -9 -f 'next-server|next start|dist/main.js' 2>/dev/null || true
sleep 1
CI="${CI:-1}" node ./node_modules/@playwright/test/cli.js test --reporter=list "$@" >> "$OUT" 2>&1
echo "EXIT=$?" >> "$OUT"
