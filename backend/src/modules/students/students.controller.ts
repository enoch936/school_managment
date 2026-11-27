import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
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
  BulkImportStudentsDto,
  BulkPromoteStudentsDto,
  CreateStudentDto,
  EnrollStudentDto,
  GraduateStudentDto,
  LinkGuardianDto,
  MergeStudentsDto,
  PromoteStudentDto,
  StudentQueryDto,
  TransferStudentDto,
  UpdateStudentDto,
  UploadStudentDocumentDto,
  WithdrawStudentDto,
} from './dto/student.dto';
import { StudentsService } from './students.service';

@ApiTags('students')
@ApiBearerAuth()
@Controller('students')
export class StudentsController {
  constructor(private readonly students: StudentsService) {}

  @Post()
  @RequirePermissions(PERMISSIONS.STUDENT_MANAGE)
  @Audit('student.create', 'Student')
  @ApiOperation({ summary: 'Register a new student profile' })
  create(@CurrentUser() principal: AuthPrincipal, @Body() dto: CreateStudentDto) {
    return this.students.create(principal, dto);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.STUDENT_READ)
  @ApiOperation({ summary: 'List and search students with advanced filters and pagination' })
  findAll(@CurrentUser() principal: AuthPrincipal, @Query() query: StudentQueryDto) {
    return this.students.findAll(principal, query);
  }

  @Get('duplicates')
  @RequirePermissions(PERMISSIONS.STUDENT_MANAGE)
  @ApiOperation({ summary: 'Scan for potential duplicate student profiles' })
  detectDuplicates(
    @CurrentUser() principal: AuthPrincipal,
    @Query('schoolId') schoolId?: string,
  ) {
    return this.students.detectDuplicates(principal, schoolId);
  }

  @Post('merge')
  @RequirePermissions(PERMISSIONS.STUDENT_MANAGE)
  @Audit('student.merge', 'Student')
  @ApiOperation({ summary: 'Controlled merge of duplicate student records' })
  merge(@CurrentUser() principal: AuthPrincipal, @Body() dto: MergeStudentsDto) {
    return this.students.merge(principal, dto);
  }

  @Get('export/csv')
  @RequirePermissions(PERMISSIONS.STUDENT_READ)
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="students-export.csv"')
  @ApiOperation({ summary: 'Export student records to RFC-4180 CSV' })
  exportCsv(@CurrentUser() principal: AuthPrincipal, @Query() query: StudentQueryDto) {
    return this.students.exportStudentsCsv(principal, query);
  }

  @Post('import')
  @RequirePermissions(PERMISSIONS.STUDENT_MANAGE)
  @Audit('student.bulk_import', 'Student')
  @ApiOperation({ summary: 'Bulk import student records' })
  bulkImport(@CurrentUser() principal: AuthPrincipal, @Body() dto: BulkImportStudentsDto) {
    return this.students.bulkImport(principal, dto);
  }

  @Post('bulk-promote')
  @RequirePermissions(PERMISSIONS.STUDENT_MANAGE)
  @Audit('student.bulk_promote', 'Student')
  @ApiOperation({ summary: 'Bulk promote students to the next academic year and class' })
  bulkPromote(@CurrentUser() principal: AuthPrincipal, @Body() dto: BulkPromoteStudentsDto) {
    return this.students.bulkPromote(principal, dto);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.STUDENT_READ)
  @ApiOperation({ summary: 'Retrieve comprehensive student profile and history' })
  findOne(
    @CurrentUser() principal: AuthPrincipal,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.students.findOne(principal, id);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.STUDENT_MANAGE)
  @Audit('student.update', 'Student')
  @ApiOperation({ summary: 'Update student demographics and emergency contacts' })
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
  @ApiOperation({ summary: 'Soft-delete / archive a student record' })
  remove(
    @ActiveTenant() tenant: TenantContext,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.students.softDelete(tenant.organizationId, id);
  }

  // ---------------------------------------------------------------------------
  // Lifecycle Actions
  // ---------------------------------------------------------------------------

  @Post(':id/enroll')
  @RequirePermissions(PERMISSIONS.STUDENT_MANAGE)
  @Audit('student.enroll', 'Enrollment')
  @ApiOperation({ summary: 'Enroll student in an academic year, class, and section' })
  enroll(
    @CurrentUser() principal: AuthPrincipal,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: EnrollStudentDto,
  ) {
    return this.students.enroll(principal, id, dto);
  }

  @Post(':id/transfer')
  @RequirePermissions(PERMISSIONS.STUDENT_MANAGE)
  @Audit('student.transfer', 'Student')
  @ApiOperation({ summary: 'Transfer student internally to another campus or externally' })
  transfer(
    @CurrentUser() principal: AuthPrincipal,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: TransferStudentDto,
  ) {
    return this.students.transfer(principal, id, dto);
  }

  @Post(':id/promote')
  @RequirePermissions(PERMISSIONS.STUDENT_MANAGE)
  @Audit('student.promote', 'Student')
  @ApiOperation({ summary: 'Promote student to next class / academic year' })
  promote(
    @CurrentUser() principal: AuthPrincipal,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: PromoteStudentDto,
  ) {
    return this.students.promote(principal, id, dto);
  }

  @Post(':id/withdraw')
  @RequirePermissions(PERMISSIONS.STUDENT_MANAGE)
  @Audit('student.withdraw', 'Student')
  @ApiOperation({ summary: 'Withdraw student from school with exit reason' })
  withdraw(
    @CurrentUser() principal: AuthPrincipal,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: WithdrawStudentDto,
  ) {
    return this.students.withdraw(principal, id, dto);
  }

  @Post(':id/graduate')
  @RequirePermissions(PERMISSIONS.STUDENT_MANAGE)
  @Audit('student.graduate', 'Student')
  @ApiOperation({ summary: 'Mark student as graduated with honors/completion records' })
  graduate(
    @CurrentUser() principal: AuthPrincipal,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: GraduateStudentDto,
  ) {
    return this.students.graduate(principal, id, dto);
  }

  // ---------------------------------------------------------------------------
  // ID Card & Documents
  // ---------------------------------------------------------------------------

  @Get(':id/id-card')
  @RequirePermissions(PERMISSIONS.STUDENT_READ)
  @ApiOperation({ summary: 'Generate formatted scannable student ID card' })
  generateIdCard(
    @CurrentUser() principal: AuthPrincipal,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.students.generateIdCard(principal, id);
  }

  @Get(':id/documents')
  @RequirePermissions(PERMISSIONS.STUDENT_READ)
  @ApiOperation({ summary: 'List student documents and records' })
  listDocuments(
    @CurrentUser() principal: AuthPrincipal,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.students.listDocuments(principal, id);
  }

  @Post(':id/documents')
  @RequirePermissions(PERMISSIONS.STUDENT_MANAGE)
  @Audit('student.document_upload', 'Document')
  @ApiOperation({ summary: 'Upload/attach a document or student photo' })
  addDocument(
    @CurrentUser() principal: AuthPrincipal,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UploadStudentDocumentDto,
  ) {
    return this.students.addDocument(principal, id, dto);
  }

  @Delete(':id/documents/:documentId')
  @RequirePermissions(PERMISSIONS.STUDENT_MANAGE)
  @Audit('student.document_delete', 'Document')
  @ApiOperation({ summary: 'Remove a student document' })
  removeDocument(
    @CurrentUser() principal: AuthPrincipal,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('documentId', new ParseUUIDPipe()) documentId: string,
  ) {
    return this.students.removeDocument(principal, id, documentId);
  }

  // ---------------------------------------------------------------------------
  // Guardian Relationships
  // ---------------------------------------------------------------------------

  @Post(':id/guardians')
  @RequirePermissions(PERMISSIONS.STUDENT_MANAGE)
  @Audit('student.link_guardian', 'StudentGuardian')
  @ApiOperation({ summary: 'Link a guardian to student with relationship configuration' })
  linkGuardian(
    @CurrentUser() principal: AuthPrincipal,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: LinkGuardianDto,
  ) {
    return this.students.linkGuardian(principal, id, dto);
  }

  @Delete(':id/guardians/:guardianId')
  @RequirePermissions(PERMISSIONS.STUDENT_MANAGE)
  @Audit('student.unlink_guardian', 'StudentGuardian')
  @ApiOperation({ summary: 'Unlink a guardian from student' })
  unlinkGuardian(
    @CurrentUser() principal: AuthPrincipal,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('guardianId', new ParseUUIDPipe()) guardianId: string,
  ) {
    return this.students.unlinkGuardian(principal, id, guardianId);
  }
}
