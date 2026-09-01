import { Injectable, type OnModuleInit } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { AppConfig } from '../../config/configuration';
import { ensureDefaultMetrics, httpRequestDuration } from './metrics';

/** Hook Fastify `onResponse` : observe la latence + le code de statut réels. */
@Injectable()
export class MetricsHook implements OnModuleInit {
  private readonly enabled: boolean;

  constructor(
    private readonly adapterHost: HttpAdapterHost,
    config: ConfigService<AppConfig, true>,
  ) {
    this.enabled = config.get('metrics', { infer: true }).enabled;
  }

  onModuleInit(): void {
    if (!this.enabled) return;
    ensureDefaultMetrics();
    const instance = this.adapterHost.httpAdapter.getInstance<FastifyInstance>();
    instance.addHook('onResponse', (req: FastifyRequest, reply, done) => {
      const route = req.routeOptions?.url ?? 'unmatched';
      // Le /metrics lui-même et les sondes de santé ne polluent pas l'histogramme.
      if (route === '/metrics' || route === '/healthz' || route === '/readyz') {
        return done();
      }
      httpRequestDuration.observe(
        { method: req.method, route, status: String(reply.statusCode) },
        reply.elapsedTime / 1000,
      );
      done();
    });
  }
}
