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
import {
  CreateCampusDto,
  CreateSchoolDto,
  SchoolQueryDto,
  UpdateCampusDto,
  UpdateSchoolDto,
} from './dto/school.dto';
import { SchoolsService } from './schools.service';

@ApiTags('schools')
@ApiBearerAuth()
@Controller()
export class SchoolsController {
  constructor(private readonly schools: SchoolsService) {}

  @Post('schools')
  @RequirePermissions(PERMISSIONS.SCHOOL_MANAGE)
  @Audit('school.create', 'School')
  create(@ActiveTenant() tenant: TenantContext, @Body() dto: CreateSchoolDto) {
    return this.schools.createSchool(tenant.organizationId, dto);
  }

  @Get('schools')
  @RequirePermissions(PERMISSIONS.SCHOOL_READ)
  list(@ActiveTenant() tenant: TenantContext, @Query() query: SchoolQueryDto) {
    return this.schools.listSchools(tenant.organizationId, query);
  }

  @Get('schools/:id')
  @RequirePermissions(PERMISSIONS.SCHOOL_READ)
  get(@ActiveTenant() tenant: TenantContext, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.schools.getSchool(tenant.organizationId, id);
  }

  @Patch('schools/:id')
  @RequirePermissions(PERMISSIONS.SCHOOL_MANAGE)
  @Audit('school.update', 'School')
  update(
    @ActiveTenant() tenant: TenantContext,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateSchoolDto,
  ) {
    return this.schools.updateSchool(tenant.organizationId, id, dto);
  }

  @Delete('schools/:id')
  @RequirePermissions(PERMISSIONS.SCHOOL_MANAGE)
  @Audit('school.delete', 'School')
  remove(@ActiveTenant() tenant: TenantContext, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.schools.deleteSchool(tenant.organizationId, id);
  }

  @Post('campuses')
  @RequirePermissions(PERMISSIONS.CAMPUS_MANAGE)
  @Audit('campus.create', 'Campus')
  createCampus(@ActiveTenant() tenant: TenantContext, @Body() dto: CreateCampusDto) {
    return this.schools.createCampus(tenant.organizationId, dto);
  }

  @Get('schools/:schoolId/campuses')
  @RequirePermissions(PERMISSIONS.CAMPUS_READ)
  listCampuses(
    @ActiveTenant() tenant: TenantContext,
    @Param('schoolId', new ParseUUIDPipe()) schoolId: string,
  ) {
    return this.schools.listCampuses(tenant.organizationId, schoolId);
  }

  @Patch('campuses/:id')
  @RequirePermissions(PERMISSIONS.CAMPUS_MANAGE)
  @Audit('campus.update', 'Campus')
  updateCampus(
    @ActiveTenant() tenant: TenantContext,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateCampusDto,
  ) {
    return this.schools.updateCampus(tenant.organizationId, id, dto);
  }
}
