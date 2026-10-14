import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ActiveTenant, TenantContext } from '../../common/decorators/active-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../common/constants/permissions';
import { Audit } from '../audit/audit.decorator';
import { AttendanceQueryDto, BulkAttendanceDto } from './dto/attendance.dto';
import { AttendanceService } from './attendance.service';

@ApiTags('attendance')
@ApiBearerAuth()
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendance: AttendanceService) {}

  @Post('bulk')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_RECORD)
  @Audit('attendance.record', 'AttendanceRecord')
  recordBulk(
    @ActiveTenant() tenant: TenantContext,
    @CurrentUser('userId') userId: string,
    @Body() dto: BulkAttendanceDto,
  ) {
    return this.attendance.recordBulk(tenant.organizationId, userId, dto);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.ATTENDANCE_READ)
  list(@ActiveTenant() tenant: TenantContext, @Query() query: AttendanceQueryDto) {
    return this.attendance.list(tenant.organizationId, query);
  }

  @Get('summary')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_READ)
  summary(
    @ActiveTenant() tenant: TenantContext,
    @Query('schoolId') schoolId: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.attendance.summary(tenant.organizationId, schoolId, dateFrom, dateTo);
  }
}
