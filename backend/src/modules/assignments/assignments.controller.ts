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
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthPrincipal } from '../../common/interfaces/auth-principal.interface';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../common/constants/permissions';
import { Audit } from '../audit/audit.decorator';
import { AssignmentsService } from './assignments.service';
import {
  AssignmentQueryDto,
  CreateAssignmentDto,
  GradeSubmissionDto,
  SubmitAssignmentDto,
} from './dto/assignment.dto';

@ApiTags('assignments')
@ApiBearerAuth()
@Controller('assignments')
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Post()
  @RequirePermissions(PERMISSIONS.ASSIGNMENT_MANAGE)
  @Audit('assignment.create', 'Assignment')
  create(
    @ActiveTenant() tenant: TenantContext,
    @Body() dto: CreateAssignmentDto,
  ) {
    return this.assignmentsService.create(tenant.organizationId, dto);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.ASSIGNMENT_READ)
  findAll(
    @ActiveTenant() tenant: TenantContext,
    @Query() query: AssignmentQueryDto,
  ) {
    return this.assignmentsService.findAll(tenant.organizationId, query);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.ASSIGNMENT_READ)
  findOne(
    @ActiveTenant() tenant: TenantContext,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.assignmentsService.findOne(tenant.organizationId, id);
  }

  @Post(':id/publish')
  @RequirePermissions(PERMISSIONS.ASSIGNMENT_MANAGE)
  @Audit('assignment.publish', 'Assignment')
  publish(
    @ActiveTenant() tenant: TenantContext,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.assignmentsService.publish(tenant.organizationId, id);
  }

  @Post(':id/submissions')
  @RequirePermissions(PERMISSIONS.ASSIGNMENT_READ)
  @Audit('assignment.submit', 'Submission')
  submit(
    @ActiveTenant() tenant: TenantContext,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: SubmitAssignmentDto,
  ) {
    return this.assignmentsService.submit(tenant.organizationId, id, dto);
  }

  @Get(':id/submissions')
  @RequirePermissions(PERMISSIONS.ASSIGNMENT_READ)
  listSubmissions(
    @ActiveTenant() tenant: TenantContext,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.assignmentsService.listSubmissions(tenant.organizationId, id);
  }

  @Patch(':id/submissions/:submissionId/grade')
  @RequirePermissions(PERMISSIONS.ASSIGNMENT_MANAGE)
  @Audit('assignment.grade', 'Submission')
  grade(
    @ActiveTenant() tenant: TenantContext,
    @CurrentUser() user: AuthPrincipal,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('submissionId', new ParseUUIDPipe()) submissionId: string,
    @Body() dto: GradeSubmissionDto,
  ) {
    return this.assignmentsService.gradeSubmission(
      tenant.organizationId,
      id,
      submissionId,
      user.userId,
      dto,
    );
  }
}
