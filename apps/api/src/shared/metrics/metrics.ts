import { collectDefaultMetrics, Histogram, Registry } from 'prom-client';

/**
 * Registre Prometheus dédié (pas le registre global de prom-client) : évite les
 * doubles enregistrements si un test réinstancie le module dans le même process.
 */
export const metricsRegistry = new Registry();
metricsRegistry.setDefaultLabels({
  service: process.env.OTEL_SERVICE_NAME ?? 'jokko-api',
});

let defaultsStarted = false;
export function ensureDefaultMetrics(): void {
  if (defaultsStarted) return;
  defaultsStarted = true;
  collectDefaultMetrics({ register: metricsRegistry });
}

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Durée des requêtes HTTP servies par l\'API (secondes).',
  labelNames: ['method', 'route', 'status'] as const,
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [metricsRegistry],
});
