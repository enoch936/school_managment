import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { PrismaHealthIndicator } from '../../health/prisma.health';
import { MonitoringHealthController } from './monitoring-health.controller';

@Module({
  imports: [TerminusModule],
  controllers: [MonitoringHealthController],
  providers: [PrismaHealthIndicator],
})
export class MonitoringModule {}
