import {
  Body,
  Controller,
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
  AcademicsQueryDto,
  CreateAcademicYearDto,
  CreateClassDto,
  CreateSubjectDto,
  CreateTermDto,
  UpdateAcademicYearDto,
  UpdateClassDto,
  UpdateSubjectDto,
} from './dto/academics.dto';
import { AcademicsService } from './academics.service';

@ApiTags('academics')
@ApiBearerAuth()
@Controller()
export class AcademicsController {
  constructor(private readonly academics: AcademicsService) {}

  @Post('academic-years')
  @RequirePermissions(PERMISSIONS.ACADEMIC_YEAR_MANAGE)
  @Audit('academic-year.create', 'AcademicYear')
  createYear(@ActiveTenant() tenant: TenantContext, @Body() dto: CreateAcademicYearDto) {
    return this.academics.createYear(tenant.organizationId, dto);
  }

  @Get('academic-years')
  @RequirePermissions(PERMISSIONS.ACADEMIC_YEAR_READ)
  listYears(@ActiveTenant() tenant: TenantContext, @Query() query: AcademicsQueryDto) {
    return this.academics.listYears(tenant.organizationId, query);
  }

  @Patch('academic-years/:id')
  @RequirePermissions(PERMISSIONS.ACADEMIC_YEAR_MANAGE)
  @Audit('academic-year.update', 'AcademicYear')
  updateYear(
    @ActiveTenant() tenant: TenantContext,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateAcademicYearDto,
  ) {
    return this.academics.updateYear(tenant.organizationId, id, dto);
  }

  @Post('terms')
  @RequirePermissions(PERMISSIONS.ACADEMIC_YEAR_MANAGE)
  @Audit('term.create', 'Term')
  createTerm(@ActiveTenant() tenant: TenantContext, @Body() dto: CreateTermDto) {
    return this.academics.createTerm(tenant.organizationId, dto);
  }

  @Get('academic-years/:academicYearId/terms')
  @RequirePermissions(PERMISSIONS.ACADEMIC_YEAR_READ)
  listTerms(
    @ActiveTenant() tenant: TenantContext,
    @Param('academicYearId', new ParseUUIDPipe()) academicYearId: string,
  ) {
    return this.academics.listTerms(tenant.organizationId, academicYearId);
  }

  @Post('classes')
  @RequirePermissions(PERMISSIONS.CLASS_MANAGE)
  @Audit('class.create', 'Class')
  createClass(@ActiveTenant() tenant: TenantContext, @Body() dto: CreateClassDto) {
    return this.academics.createClass(tenant.organizationId, dto);
  }

  @Get('classes')
  @RequirePermissions(PERMISSIONS.CLASS_READ)
  listClasses(@ActiveTenant() tenant: TenantContext, @Query() query: AcademicsQueryDto) {
    return this.academics.listClasses(tenant.organizationId, query);
  }

  @Patch('classes/:id')
  @RequirePermissions(PERMISSIONS.CLASS_MANAGE)
  @Audit('class.update', 'Class')
  updateClass(
    @ActiveTenant() tenant: TenantContext,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateClassDto,
  ) {
    return this.academics.updateClass(tenant.organizationId, id, dto);
  }

  @Post('subjects')
  @RequirePermissions(PERMISSIONS.SUBJECT_MANAGE)
  @Audit('subject.create', 'Subject')
  createSubject(@ActiveTenant() tenant: TenantContext, @Body() dto: CreateSubjectDto) {
    return this.academics.createSubject(tenant.organizationId, dto);
  }

  @Get('subjects')
  @RequirePermissions(PERMISSIONS.SUBJECT_READ)
  listSubjects(@ActiveTenant() tenant: TenantContext, @Query() query: AcademicsQueryDto) {
    return this.academics.listSubjects(tenant.organizationId, query);
  }

  @Patch('subjects/:id')
  @RequirePermissions(PERMISSIONS.SUBJECT_MANAGE)
  @Audit('subject.update', 'Subject')
  updateSubject(
    @ActiveTenant() tenant: TenantContext,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateSubjectDto,
  ) {
    return this.academics.updateSubject(tenant.organizationId, id, dto);
  }
}
