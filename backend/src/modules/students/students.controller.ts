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
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../common/constants/permissions';
import { Audit } from '../audit/audit.decorator';
import type { AuthPrincipal } from '../../common/interfaces/auth-principal.interface';
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
  create(@CurrentUser() principal: AuthPrincipal, @Body() dto: CreateStudentDto) {
    return this.students.create(principal, dto);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.STUDENT_READ)
  findAll(@CurrentUser() principal: AuthPrincipal, @Query() query: StudentQueryDto) {
    return this.students.findAll(principal, query);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.STUDENT_READ)
  findOne(
    @CurrentUser() principal: AuthPrincipal,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.students.findOne(principal, id);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.STUDENT_MANAGE)
  @Audit('student.update', 'Student')
  update(
    @CurrentUser() principal: AuthPrincipal,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateStudentDto,
  ) {
    return this.students.update(principal, id, dto);
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
