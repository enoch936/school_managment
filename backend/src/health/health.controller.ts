import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { Public } from '../common/decorators/public.decorator';
import { PrismaHealthIndicator } from './prisma.health';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prisma: PrismaHealthIndicator,
  ) {}

  /**
   * Liveness: is the process up and able to serve requests? Intentionally
   * dependency-free so orchestrators restart only on a genuinely dead process.
   */
  @Public()
  @Get()
  @HealthCheck()
  liveness() {
    return this.health.check([]);
  }

  /** Readiness: are downstream dependencies (database) reachable? */
  @Public()
  @Get('ready')
  @HealthCheck()
  readiness() {
    return this.health.check([() => this.prisma.isHealthy('database')]);
  }
}
