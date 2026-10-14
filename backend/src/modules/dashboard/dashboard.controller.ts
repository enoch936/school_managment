import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ActiveTenant, TenantContext } from '../../common/decorators/active-tenant.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../common/constants/permissions';
import { DashboardService } from './dashboard.service';

@ApiTags('dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('overview')
  @RequirePermissions(PERMISSIONS.REPORT_READ)
  overview(@ActiveTenant() tenant: TenantContext) {
    return this.dashboard.overview(tenant.organizationId);
  }

  @Get('enrollment-trend')
  @RequirePermissions(PERMISSIONS.REPORT_READ)
  trend(@ActiveTenant() tenant: TenantContext, @Query('months') months?: string) {
    return this.dashboard.enrollmentTrend(
      tenant.organizationId,
      months ? Number(months) : undefined,
    );
  }
}
