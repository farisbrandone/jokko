/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Traçage OpenTelemetry — activé uniquement si `OTEL_EXPORTER_OTLP_ENDPOINT`
 * est défini. À importer AVANT tout autre module (voir `main.ts`).
 * `require` paresseux : le SDK n'est chargé que si le traçage est demandé.
 */
const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

if (endpoint) {
  const { NodeSDK } = require('@opentelemetry/sdk-node');
  const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
  const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
  const { resourceFromAttributes } = require('@opentelemetry/resources');
  const { ATTR_SERVICE_NAME } = require('@opentelemetry/semantic-conventions');

  const sdk = new NodeSDK({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME ?? 'jokko-api',
    }),
    traceExporter: new OTLPTraceExporter({ url: `${endpoint.replace(/\/$/, '')}/v1/traces` }),
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-fs': { enabled: false },
      }),
    ],
  });

  sdk.start();
  process.once('SIGTERM', () => {
    void sdk.shutdown().catch(() => undefined);
  });
  console.log(`[otel] traçage actif → ${endpoint}`);
}
