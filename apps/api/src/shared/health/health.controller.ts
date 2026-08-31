import { Controller, Get } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  MikroOrmHealthIndicator,
} from '@nestjs/terminus';

@ApiExcludeController()
@Controller()
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: MikroOrmHealthIndicator,
  ) {}

  /** Sonde liveness — le process répond. */
  @Get('healthz')
  @HealthCheck()
  liveness() {
    return this.health.check([]);
  }

  /** Sonde readiness — prête à recevoir du trafic (base joignable). */
  @Get('readyz')
  @HealthCheck()
  readiness() {
    return this.health.check([() => this.db.pingCheck('database', { timeout: 1500 })]);
  }
}
