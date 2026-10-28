import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { StaffStatus } from '@prisma/client';
import { PaginationQueryDto } from '../../../common/pagination/pagination.dto';

export class CreateStaffDto {
  @IsUUID()
  @IsNotEmpty()
  schoolId!: string;

  @IsUUID()
  @IsOptional()
  campusId?: string;

  @IsString()
  @IsNotEmpty()
  employeeCode!: string;

  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @IsString()
  @IsOptional()
  middleName?: string;

  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @IsString()
  @IsOptional()
  jobTitle?: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsDateString()
  @IsOptional()
  hireDate?: string;
}

export class CreateTeacherDto {
  @IsUUID()
  @IsNotEmpty()
  schoolId!: string;

  @IsString()
  @IsNotEmpty()
  employeeCode!: string;

  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @IsString()
  @IsOptional()
  middleName?: string;

  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsUUID()
  @IsOptional()
  departmentId?: string;

  @IsString()
  @IsOptional()
  qualification?: string;

  @IsDateString()
  @IsOptional()
  hireDate?: string;
}

export class CreateTeacherAssignmentDto {
  @IsUUID()
  @IsNotEmpty()
  teacherId!: string;

  @IsUUID()
  @IsNotEmpty()
  subjectId!: string;

  @IsUUID()
  @IsNotEmpty()
  classId!: string;

  @IsUUID()
  @IsOptional()
  sectionId?: string;

  @IsUUID()
  @IsNotEmpty()
  academicYearId!: string;
}

export class StaffQueryDto extends PaginationQueryDto {
  @IsUUID()
  @IsOptional()
  schoolId?: string;

  @IsEnum(StaffStatus)
  @IsOptional()
  status?: StaffStatus;

  @IsUUID()
  @IsOptional()
  departmentId?: string;
}
