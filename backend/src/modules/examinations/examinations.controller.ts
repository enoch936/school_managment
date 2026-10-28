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
import { ExaminationsService } from './examinations.service';
import { CreateExamDto, ExamQueryDto, RecordGradeDto, UpdateExamDto } from './dto/examination.dto';

@ApiTags('examinations')
@ApiBearerAuth()
@Controller('examinations')
export class ExaminationsController {
  constructor(private readonly exams: ExaminationsService) {}

  @Post()
  @RequirePermissions(PERMISSIONS.EXAM_MANAGE)
  @Audit('exam.create', 'Exam')
  create(@ActiveTenant() tenant: TenantContext, @Body() dto: CreateExamDto) {
    return this.exams.create(tenant.organizationId, dto);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.EXAM_READ)
  findAll(@ActiveTenant() tenant: TenantContext, @Query() query: ExamQueryDto) {
    return this.exams.findAll(tenant.organizationId, query);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.EXAM_READ)
  findOne(
    @ActiveTenant() tenant: TenantContext,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.exams.findOne(tenant.organizationId, id);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.EXAM_MANAGE)
  @Audit('exam.update', 'Exam')
  update(
    @ActiveTenant() tenant: TenantContext,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateExamDto,
  ) {
    return this.exams.update(tenant.organizationId, id, dto);
  }

  @Post(':id/publish')
  @RequirePermissions(PERMISSIONS.GRADE_PUBLISH)
  @Audit('exam.publish', 'Exam')
  publish(
    @ActiveTenant() tenant: TenantContext,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.exams.publish(tenant.organizationId, id);
  }

  @Post(':id/grades')
  @RequirePermissions(PERMISSIONS.GRADE_MANAGE)
  @Audit('exam.record_grade', 'ExamAttempt')
  recordGrade(
    @ActiveTenant() tenant: TenantContext,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: RecordGradeDto,
  ) {
    return this.exams.recordGrade(tenant.organizationId, id, dto);
  }

  @Get(':id/results')
  @RequirePermissions(PERMISSIONS.GRADE_READ)
  getResults(
    @ActiveTenant() tenant: TenantContext,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.exams.getResultsSummary(tenant.organizationId, id);
  }
}
