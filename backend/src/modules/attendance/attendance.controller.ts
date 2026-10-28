import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../common/constants/permissions';
import { Audit } from '../audit/audit.decorator';
import type { AuthPrincipal } from '../../common/interfaces/auth-principal.interface';
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
    @CurrentUser() principal: AuthPrincipal,
    @Body() dto: BulkAttendanceDto,
  ) {
    return this.attendance.recordBulk(principal, dto);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.ATTENDANCE_READ)
  list(@CurrentUser() principal: AuthPrincipal, @Query() query: AttendanceQueryDto) {
    return this.attendance.list(principal, query);
  }

  @Get('summary')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_READ)
  summary(
    @CurrentUser() principal: AuthPrincipal,
    @Query('schoolId') schoolId: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.attendance.summary(principal, schoolId, dateFrom, dateTo);
  }
}
