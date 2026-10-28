import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ActiveTenant, TenantContext } from '../../common/decorators/active-tenant.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../common/constants/permissions';
import { Audit } from '../audit/audit.decorator';
import { StaffService } from './staff.service';
import {
  CreateStaffDto,
  CreateTeacherAssignmentDto,
  CreateTeacherDto,
  StaffQueryDto,
} from './dto/staff.dto';

@ApiTags('staff')
@ApiBearerAuth()
@Controller()
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Post('staff')
  @RequirePermissions(PERMISSIONS.STAFF_MANAGE)
  @Audit('staff.create', 'Staff')
  createStaff(@ActiveTenant() tenant: TenantContext, @Body() dto: CreateStaffDto) {
    return this.staffService.createStaff(tenant.organizationId, dto);
  }

  @Get('staff')
  @RequirePermissions(PERMISSIONS.STAFF_READ)
  listStaff(@ActiveTenant() tenant: TenantContext, @Query() query: StaffQueryDto) {
    return this.staffService.findAllStaff(tenant.organizationId, query);
  }

  @Post('teachers')
  @RequirePermissions(PERMISSIONS.TEACHER_MANAGE)
  @Audit('teacher.create', 'Teacher')
  createTeacher(@ActiveTenant() tenant: TenantContext, @Body() dto: CreateTeacherDto) {
    return this.staffService.createTeacher(tenant.organizationId, dto);
  }

  @Get('teachers')
  @RequirePermissions(PERMISSIONS.TEACHER_READ)
  listTeachers(@ActiveTenant() tenant: TenantContext, @Query() query: StaffQueryDto) {
    return this.staffService.findAllTeachers(tenant.organizationId, query);
  }

  @Post('teachers/assignments')
  @RequirePermissions(PERMISSIONS.TEACHER_MANAGE)
  @Audit('teacher-assignment.create', 'TeacherAssignment')
  assignTeacher(@ActiveTenant() tenant: TenantContext, @Body() dto: CreateTeacherAssignmentDto) {
    return this.staffService.assignTeacher(tenant.organizationId, dto);
  }

  @Get('teachers/:id/assignments')
  @RequirePermissions(PERMISSIONS.TEACHER_READ)
  listAssignments(
    @ActiveTenant() tenant: TenantContext,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.staffService.findTeacherAssignments(tenant.organizationId, id);
  }
}
