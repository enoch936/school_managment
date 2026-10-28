import {
  Controller,
  Get,
  Param,
  Query,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ActiveTenant, TenantContext } from '../../common/decorators/active-tenant.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../common/constants/permissions';
import { ReportsService } from './reports.service';
import { ReportFilterDto } from './dto/report.dto';

@ApiTags('reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('enrollment')
  @RequirePermissions(PERMISSIONS.REPORT_READ)
  getEnrollment(
    @ActiveTenant() tenant: TenantContext,
    @Query() filter: ReportFilterDto,
  ) {
    return this.reports.getEnrollmentReport(tenant.organizationId, filter);
  }

  @Get('attendance')
  @RequirePermissions(PERMISSIONS.REPORT_READ)
  getAttendance(
    @ActiveTenant() tenant: TenantContext,
    @Query() filter: ReportFilterDto,
  ) {
    return this.reports.getAttendanceReport(tenant.organizationId, filter);
  }

  @Get('finance')
  @RequirePermissions(PERMISSIONS.REPORT_READ)
  getFinance(
    @ActiveTenant() tenant: TenantContext,
    @Query() filter: ReportFilterDto,
  ) {
    return this.reports.getFinanceReport(tenant.organizationId, filter);
  }

  @Get('export/:type')
  @RequirePermissions(PERMISSIONS.REPORT_EXPORT)
  async exportCsv(
    @ActiveTenant() tenant: TenantContext,
    @Param('type') type: 'students' | 'invoices' | 'attendance',
    @Query() filter: ReportFilterDto,
    @Res() res: Response,
  ) {
    const csvData = await this.reports.exportCsv(tenant.organizationId, type, filter);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${type}-export-${Date.now()}.csv"`);
    res.send(csvData);
  }
}
