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
import { CreateStudentDto, StudentQueryDto, UpdateStudentDto } from './dto/student.dto';
import { StudentsService } from './students.service';

@ApiTags('students')
@ApiBearerAuth()
@Controller('students')
export class StudentsController {
  constructor(private readonly students: StudentsService) {}

  @Post()
  @RequirePermissions(PERMISSIONS.STUDENT_MANAGE)
  @Audit('student.create', 'Student')
  create(@ActiveTenant() tenant: TenantContext, @Body() dto: CreateStudentDto) {
    return this.students.create(tenant.organizationId, dto);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.STUDENT_READ)
  findAll(@ActiveTenant() tenant: TenantContext, @Query() query: StudentQueryDto) {
    return this.students.findAll(tenant.organizationId, query);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.STUDENT_READ)
  findOne(
    @ActiveTenant() tenant: TenantContext,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.students.findOne(tenant.organizationId, id);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.STUDENT_MANAGE)
  @Audit('student.update', 'Student')
  update(
    @ActiveTenant() tenant: TenantContext,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateStudentDto,
  ) {
    return this.students.update(tenant.organizationId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.STUDENT_MANAGE)
  @Audit('student.delete', 'Student')
  remove(
    @ActiveTenant() tenant: TenantContext,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.students.softDelete(tenant.organizationId, id);
  }
}
