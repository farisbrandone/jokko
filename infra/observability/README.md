# Observabilité

Deux volets complémentaires :

| Volet | Transport | Cible |
| --- | --- | --- |
| **Métriques** | `GET /metrics` (Prometheus text) | Prometheus → Grafana + Alertmanager |
| **Traces** | OTLP/HTTP | Collecteur OTel (activé si `OTEL_EXPORTER_OTLP_ENDPOINT`) |

## Métriques exposées par l'API

- `http_request_duration_seconds{method,route,status}` — histogramme (hook Fastify
  `onResponse` ; `route` = motif de route, faible cardinalité ; `/metrics` et les
  sondes de santé sont exclus).
- Métriques process par défaut de `prom-client` : `process_*`, `nodejs_*`
  (event-loop lag, tas V8, handles, GC…).

`GET /metrics` est **hors** préfixe API (`/metrics`, pas `/api/metrics`),
`@SkipThrottle`, exclu de Swagger. Si `METRICS_TOKEN` est défini, la route exige
`Authorization: Bearer <token>` (comparaison à temps constant). `METRICS_ENABLED=false`
⇒ 404. En production, restreindre la route au réseau d'observabilité (pare-feu /
reverse-proxy) même avec un jeton.

## Démarrage local / prod (VPS unique)

```sh
docker compose -f infra/docker/compose.prod.yaml up -d       # crée jokko_internal
docker compose -f infra/docker/compose.obs.yaml up -d         # Prometheus/Grafana
```

- Grafana : http://127.0.0.1:3009 — `admin` / `$GRAFANA_ADMIN_PASSWORD`
  (datasource + dashboard « Jokko — API » provisionnés).
- Prometheus : conteneur `prometheus` (non publié ; `--web.enable-lifecycle`).
- Alertmanager : brancher un `slack_configs` / `webhook_configs` dans
  `alertmanager/alertmanager.yml` (récepteur `default` vide par défaut).

Si `METRICS_TOKEN` est défini côté API : déposer le jeton brut dans
`prometheus/metrics-token` (une ligne) et décommenter le bloc `authorization`
de `prometheus/prometheus.yml`.

## Alertes (`prometheus/alerts.yml`)

`ApiDown`, `HighHttp5xxRate` (>5 % / 5 min), `HighRequestLatencyP95` (>1,5 s),
`EventLoopLagHigh` (p99 > 0,2 s), `ProcessHeapHigh` (tas > 90 %).
