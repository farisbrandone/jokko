import { Module } from '@nestjs/common';
import { MetricsController } from './metrics.controller';
import { MetricsHook } from './metrics.hook';

@Module({
  controllers: [MetricsController],
  providers: [MetricsHook],
})
export class MetricsModule {}
