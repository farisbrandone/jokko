import 'reflect-metadata';
import './tracing'; // OTEL — doit être chargé en tout premier
import { NestFactory } from '@nestjs/core';
import { Logger as NestLogger } from '@nestjs/common';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import fastifyCookie from '@fastify/cookie';
import fastifyHelmet from '@fastify/helmet';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import type { AppConfig } from './config/configuration';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ trustProxy: true }),
    // `rawBody` : corps brut conservé pour vérifier la signature HMAC du
    // webhook WhatsApp Cloud (X-Hub-Signature-256).
    { bufferLogs: true, rawBody: true },
  );

  app.useLogger(app.get(Logger));
  await app.register(fastifyCookie);
  // En-têtes de sécurité. L'API sert du JSON : pas de CSP (inutile), mais
  // nosniff / frameguard / HSTS / referrer-policy fermes.
  await app.register(fastifyHelmet, {
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    referrerPolicy: { policy: 'no-referrer' },
  });

  const config = app.get(ConfigService<AppConfig, true>);
  const api = config.get('api', { infer: true });

  app.setGlobalPrefix(api.globalPrefix, { exclude: ['healthz', 'readyz', 'metrics'] });
  app.enableCors({ origin: api.corsOrigins, credentials: true });
  // La validation des entrées passe par ZodValidationPipe (schémas @jokko/contracts),
  // pas par le ValidationPipe de Nest (qui exige class-validator).
  app.enableShutdownHooks();

  const swagger = new DocumentBuilder()
    .setTitle('Jokko API')
    .setDescription('Plateforme de boutiques sociales — API interne')
    .setVersion('0.1')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, swagger));

  await app.listen({ port: api.port, host: api.host });
  new NestLogger('Bootstrap').log(
    `Jokko API prête sur http://${api.host}:${api.port}/${api.globalPrefix} — docs: /docs`,
  );
}

void bootstrap();
