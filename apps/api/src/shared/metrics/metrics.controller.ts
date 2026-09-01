import {
  Controller,
  Get,
  Headers,
  NotFoundException,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiExcludeController } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import type { FastifyReply } from 'fastify';
import type { AppConfig } from '../../config/configuration';
import { metricsRegistry } from './metrics';

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

/** Exposition Prometheus — montée hors préfixe API (`GET /metrics`). */
@ApiExcludeController()
@SkipThrottle()
@Controller()
export class MetricsController {
  private readonly enabled: boolean;
  private readonly token: string | null;

  constructor(config: ConfigService<AppConfig, true>) {
    const m = config.get('metrics', { infer: true });
    this.enabled = m.enabled;
    this.token = m.token;
  }

  @Get('metrics')
  async metrics(
    @Headers('authorization') auth: string | undefined,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    if (!this.enabled) throw new NotFoundException();
    if (this.token && (!auth || !safeEqual(auth, `Bearer ${this.token}`))) {
      throw new UnauthorizedException('jeton de métriques requis');
    }
    reply.header('content-type', metricsRegistry.contentType);
    reply.send(await metricsRegistry.metrics());
  }
}
