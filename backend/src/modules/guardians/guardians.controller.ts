import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ActiveTenant, TenantContext } from '../../common/decorators/active-tenant.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../common/constants/permissions';
import { Audit } from '../audit/audit.decorator';
import { GuardiansService } from './guardians.service';
import { CreateGuardianDto, GuardianQueryDto, LinkStudentDto, UpdateGuardianDto } from './dto/guardian.dto';

@ApiTags('guardians')
@ApiBearerAuth()
@Controller('guardians')
export class GuardiansController {
  constructor(private readonly guardians: GuardiansService) {}

  @Post()
  @RequirePermissions(PERMISSIONS.GUARDIAN_MANAGE)
  @Audit('guardian.create', 'Guardian')
  create(@ActiveTenant() tenant: TenantContext, @Body() dto: CreateGuardianDto) {
    return this.guardians.create(tenant.organizationId, dto);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.GUARDIAN_READ)
  findAll(@ActiveTenant() tenant: TenantContext, @Query() query: GuardianQueryDto) {
    return this.guardians.findAll(tenant.organizationId, query);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.GUARDIAN_READ)
  findOne(
    @ActiveTenant() tenant: TenantContext,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.guardians.findOne(tenant.organizationId, id);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.GUARDIAN_MANAGE)
  @Audit('guardian.update', 'Guardian')
  update(
    @ActiveTenant() tenant: TenantContext,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateGuardianDto,
  ) {
    return this.guardians.update(tenant.organizationId, id, dto);
  }

  @Post(':id/students')
  @RequirePermissions(PERMISSIONS.GUARDIAN_MANAGE)
  @Audit('guardian.link_student', 'Guardian')
  linkStudent(
    @ActiveTenant() tenant: TenantContext,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: LinkStudentDto,
  ) {
    return this.guardians.linkStudent(tenant.organizationId, id, dto);
  }

  @Delete(':id/students/:studentId')
  @RequirePermissions(PERMISSIONS.GUARDIAN_MANAGE)
  @Audit('guardian.unlink_student', 'Guardian')
  unlinkStudent(
    @ActiveTenant() tenant: TenantContext,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('studentId', new ParseUUIDPipe()) studentId: string,
  ) {
    return this.guardians.unlinkStudent(tenant.organizationId, id, studentId);
  }
}
