import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { Public } from '../../common/decorators/public.decorator';
import { PrismaHealthIndicator } from '../../health/prisma.health';

@ApiTags('monitoring')
@Controller('monitoring/health')
export class MonitoringHealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prisma: PrismaHealthIndicator,
  ) {}

  @Public()
  @Get()
  @HealthCheck()
  get() {
    return this.health.check([() => this.prisma.isHealthy('database')]);
  }
}
