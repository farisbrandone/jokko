import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';

@ApiExcludeController()
@Controller({ version: VERSION_NEUTRAL })
export class HealthController {
  constructor(private readonly health: HealthCheckService) {}

  /** Sonde liveness — le process répond. */
  @Get('healthz')
  @HealthCheck()
  liveness() {
    return this.health.check([]);
  }

  /** Sonde readiness — prête à recevoir du trafic. Les dépendances (DB, Redis,
   *  Meili) seront branchées ici au fil des incréments. */
  @Get('readyz')
  @HealthCheck()
  readiness() {
    return this.health.check([]);
  }
}
