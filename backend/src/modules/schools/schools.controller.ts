import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ActiveTenant, TenantContext } from '../../common/decorators/active-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../common/constants/permissions';
import { Audit } from '../audit/audit.decorator';
import type { AuthPrincipal } from '../../common/interfaces/auth-principal.interface';
import {
  CalendarQueryDto,
  CreateCalendarEventDto,
  CreateCampusDto,
  CreateDocumentTemplateDto,
  CreateGradingScaleDto,
  CreateSchoolDto,
  SchoolOnboardingDto,
  SchoolQueryDto,
  ToggleFeatureFlagDto,
  UpdateCalendarEventDto,
  UpdateCampusDto,
  UpdateDocumentTemplateDto,
  UpdateGradingScaleDto,
  UpdateSchoolDto,
  UpdateSubscriptionDto,
  UpdateTenantSettingsDto,
  UpsertSchoolPolicyDto,
} from './dto/school.dto';
import { SchoolsService } from './schools.service';

@ApiTags('schools')
@ApiBearerAuth()
@Controller()
export class SchoolsController {
  constructor(private readonly schools: SchoolsService) {}

  // --- Onboarding & Setup ----------------------------------------------------

  @Post('schools/onboard')
  @ApiOperation({ summary: 'Guided school registration and automated foundational onboarding' })
  @RequirePermissions(PERMISSIONS.SCHOOL_MANAGE)
  @Audit('school.onboard', 'School')
  onboard(
    @ActiveTenant() tenant: TenantContext,
    @CurrentUser() principal: AuthPrincipal,
    @Body() dto: SchoolOnboardingDto,
  ) {
    return this.schools.onboardSchool(tenant.organizationId, principal, dto);
  }

  // --- Schools CRUD ----------------------------------------------------------

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

  // --- Campuses CRUD ---------------------------------------------------------

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

  @Get('campuses/:id')
  @RequirePermissions(PERMISSIONS.CAMPUS_READ)
  getCampus(
    @ActiveTenant() tenant: TenantContext,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.schools.getCampus(tenant.organizationId, id);
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

  @Delete('campuses/:id')
  @RequirePermissions(PERMISSIONS.CAMPUS_MANAGE)
  @Audit('campus.delete', 'Campus')
  deleteCampus(
    @ActiveTenant() tenant: TenantContext,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.schools.deleteCampus(tenant.organizationId, id);
  }

  // --- Academic Calendar Events ----------------------------------------------

  @Post('schools/:schoolId/calendar-events')
  @RequirePermissions(PERMISSIONS.ACADEMIC_YEAR_MANAGE)
  @Audit('calendar.create', 'AcademicCalendarEvent')
  createCalendarEvent(
    @ActiveTenant() tenant: TenantContext,
    @Param('schoolId', new ParseUUIDPipe()) schoolId: string,
    @Body() dto: CreateCalendarEventDto,
  ) {
    return this.schools.createCalendarEvent(tenant.organizationId, schoolId, dto);
  }

  @Get('schools/:schoolId/calendar-events')
  @RequirePermissions(PERMISSIONS.ACADEMIC_YEAR_READ)
  listCalendarEvents(
    @ActiveTenant() tenant: TenantContext,
    @Param('schoolId', new ParseUUIDPipe()) schoolId: string,
    @Query() query: CalendarQueryDto,
  ) {
    return this.schools.listCalendarEvents(tenant.organizationId, schoolId, query);
  }

  @Patch('calendar-events/:id')
  @RequirePermissions(PERMISSIONS.ACADEMIC_YEAR_MANAGE)
  @Audit('calendar.update', 'AcademicCalendarEvent')
  updateCalendarEvent(
    @ActiveTenant() tenant: TenantContext,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateCalendarEventDto,
  ) {
    return this.schools.updateCalendarEvent(tenant.organizationId, id, dto);
  }

  @Delete('calendar-events/:id')
  @RequirePermissions(PERMISSIONS.ACADEMIC_YEAR_MANAGE)
  @Audit('calendar.delete', 'AcademicCalendarEvent')
  deleteCalendarEvent(
    @ActiveTenant() tenant: TenantContext,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.schools.deleteCalendarEvent(tenant.organizationId, id);
  }

  // --- Grading Scales --------------------------------------------------------

  @Post('schools/:schoolId/grading-scales')
  @RequirePermissions(PERMISSIONS.GRADE_MANAGE)
  @Audit('grading_scale.create', 'GradingScale')
  createGradingScale(
    @ActiveTenant() tenant: TenantContext,
    @Param('schoolId', new ParseUUIDPipe()) schoolId: string,
    @Body() dto: CreateGradingScaleDto,
  ) {
    return this.schools.createGradingScale(tenant.organizationId, schoolId, dto);
  }

  @Get('schools/:schoolId/grading-scales')
  @RequirePermissions(PERMISSIONS.GRADE_READ)
  listGradingScales(
    @ActiveTenant() tenant: TenantContext,
    @Param('schoolId', new ParseUUIDPipe()) schoolId: string,
  ) {
    return this.schools.listGradingScales(tenant.organizationId, schoolId);
  }

  @Patch('grading-scales/:id')
  @RequirePermissions(PERMISSIONS.GRADE_MANAGE)
  @Audit('grading_scale.update', 'GradingScale')
  updateGradingScale(
    @ActiveTenant() tenant: TenantContext,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateGradingScaleDto,
  ) {
    return this.schools.updateGradingScale(tenant.organizationId, id, dto);
  }

  // --- School Policies -------------------------------------------------------

  @Get('schools/:schoolId/policies')
  @RequirePermissions(PERMISSIONS.SCHOOL_READ)
  listPolicies(
    @ActiveTenant() tenant: TenantContext,
    @Param('schoolId', new ParseUUIDPipe()) schoolId: string,
    @Query('category') category?: string,
  ) {
    return this.schools.listSchoolPolicies(tenant.organizationId, schoolId, category);
  }

  @Put('schools/:schoolId/policies')
  @RequirePermissions(PERMISSIONS.SCHOOL_MANAGE)
  @Audit('policy.upsert', 'SchoolPolicy')
  upsertPolicy(
    @ActiveTenant() tenant: TenantContext,
    @Param('schoolId', new ParseUUIDPipe()) schoolId: string,
    @Body() dto: UpsertSchoolPolicyDto,
  ) {
    return this.schools.upsertSchoolPolicy(tenant.organizationId, schoolId, dto);
  }

  // --- Document Templates ----------------------------------------------------

  @Post('schools/:schoolId/document-templates')
  @RequirePermissions(PERMISSIONS.SCHOOL_MANAGE)
  @Audit('document_template.create', 'DocumentTemplate')
  createDocumentTemplate(
    @ActiveTenant() tenant: TenantContext,
    @Param('schoolId', new ParseUUIDPipe()) schoolId: string,
    @Body() dto: CreateDocumentTemplateDto,
  ) {
    return this.schools.createDocumentTemplate(tenant.organizationId, schoolId, dto);
  }

  @Get('schools/:schoolId/document-templates')
  @RequirePermissions(PERMISSIONS.SCHOOL_READ)
  listDocumentTemplates(
    @ActiveTenant() tenant: TenantContext,
    @Param('schoolId', new ParseUUIDPipe()) schoolId: string,
    @Query('type') type?: string,
  ) {
    return this.schools.listDocumentTemplates(tenant.organizationId, schoolId, type);
  }

  @Patch('document-templates/:id')
  @RequirePermissions(PERMISSIONS.SCHOOL_MANAGE)
  @Audit('document_template.update', 'DocumentTemplate')
  updateDocumentTemplate(
    @ActiveTenant() tenant: TenantContext,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateDocumentTemplateDto,
  ) {
    return this.schools.updateDocumentTemplate(tenant.organizationId, id, dto);
  }

  @Delete('document-templates/:id')
  @RequirePermissions(PERMISSIONS.SCHOOL_MANAGE)
  @Audit('document_template.delete', 'DocumentTemplate')
  deleteDocumentTemplate(
    @ActiveTenant() tenant: TenantContext,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.schools.deleteDocumentTemplate(tenant.organizationId, id);
  }

  // --- SaaS Subscription & Quotas --------------------------------------------

  @Get('organization/subscription')
  @RequirePermissions(PERMISSIONS.SCHOOL_READ)
  getSubscription(@ActiveTenant() tenant: TenantContext) {
    return this.schools.getTenantSubscription(tenant.organizationId);
  }

  @Patch('organization/subscription')
  @RequirePermissions(PERMISSIONS.PLATFORM_MANAGE)
  @Audit('subscription.update', 'Subscription')
  updateSubscription(
    @ActiveTenant() tenant: TenantContext,
    @Body() dto: UpdateSubscriptionDto,
  ) {
    return this.schools.updateTenantSubscription(tenant.organizationId, dto);
  }

  // --- Feature Flags & Tenant Settings ---------------------------------------

  @Get('organization/feature-flags')
  @RequirePermissions(PERMISSIONS.SCHOOL_READ)
  listFeatureFlags(@ActiveTenant() tenant: TenantContext) {
    return this.schools.listFeatureFlags(tenant.organizationId);
  }

  @Post('organization/feature-flags')
  @RequirePermissions(PERMISSIONS.SCHOOL_MANAGE)
  @Audit('feature_flag.toggle', 'FeatureFlag')
  toggleFeatureFlag(
    @ActiveTenant() tenant: TenantContext,
    @Body() dto: ToggleFeatureFlagDto,
  ) {
    return this.schools.toggleFeatureFlag(tenant.organizationId, dto);
  }

  @Get('organization/settings')
  @RequirePermissions(PERMISSIONS.SCHOOL_READ)
  getTenantSettings(@ActiveTenant() tenant: TenantContext) {
    return this.schools.getTenantSettings(tenant.organizationId);
  }

  @Patch('organization/settings')
  @RequirePermissions(PERMISSIONS.SCHOOL_MANAGE)
  @Audit('tenant_settings.update', 'Organization')
  updateTenantSettings(
    @ActiveTenant() tenant: TenantContext,
    @Body() dto: UpdateTenantSettingsDto,
  ) {
    return this.schools.updateTenantSettings(tenant.organizationId, dto);
  }
}
