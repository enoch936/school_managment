import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { DocumentType, Gender, GuardianRelation, SensitivityLevel, StudentStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/pagination/pagination.dto';

export class CreateStudentDto {
  @ApiProperty()
  @IsUUID()
  schoolId!: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  campusId?: string;

  @ApiPropertyOptional({ example: 'STU-2026-0001' })
  @IsString()
  @MaxLength(40)
  @IsOptional()
  studentNumber?: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  firstName!: string;

  @ApiPropertyOptional()
  @IsString()
  @MaxLength(80)
  @IsOptional()
  middleName?: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  lastName!: string;

  @ApiPropertyOptional({ enum: Gender })
  @IsEnum(Gender)
  @IsOptional()
  gender?: Gender;

  @ApiPropertyOptional({ example: '2014-09-01' })
  @IsDateString()
  @IsOptional()
  dateOfBirth?: string;

  @ApiPropertyOptional()
  @IsString()
  @MaxLength(100)
  @IsOptional()
  placeOfBirth?: string;

  @ApiPropertyOptional()
  @IsString()
  @MaxLength(80)
  @IsOptional()
  nationality?: string;

  @ApiPropertyOptional()
  @IsString()
  @MaxLength(50)
  @IsOptional()
  nationalId?: string;

  @ApiPropertyOptional()
  @IsString()
  @MaxLength(50)
  @IsOptional()
  birthCertificateNo?: string;

  @ApiPropertyOptional({ example: 'O+' })
  @IsString()
  @MaxLength(10)
  @IsOptional()
  bloodGroup?: string;

  @ApiPropertyOptional()
  @IsString()
  @MaxLength(50)
  @IsOptional()
  religion?: string;

  @ApiPropertyOptional()
  @IsString()
  @MaxLength(50)
  @IsOptional()
  motherTongue?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  photoUrl?: string;

  @ApiPropertyOptional()
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional()
  @IsString()
  @MaxLength(30)
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional()
  @IsString()
  @MaxLength(255)
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ enum: StudentStatus })
  @IsEnum(StudentStatus)
  @IsOptional()
  status?: StudentStatus;

  @ApiPropertyOptional()
  @IsString()
  @MaxLength(160)
  @IsOptional()
  emergencyContactName?: string;

  @ApiPropertyOptional()
  @IsString()
  @MaxLength(50)
  @IsOptional()
  emergencyContactRelation?: string;

  @ApiPropertyOptional()
  @IsString()
  @MaxLength(30)
  @IsOptional()
  emergencyContactPhone?: string;

  @ApiPropertyOptional()
  @IsString()
  @MaxLength(30)
  @IsOptional()
  emergencyContactSecondaryPhone?: string;

  @ApiPropertyOptional()
  @IsString()
  @MaxLength(2000)
  @IsOptional()
  medicalNotes?: string;

  @ApiPropertyOptional()
  @IsString()
  @MaxLength(200)
  @IsOptional()
  previousSchool?: string;

  @ApiPropertyOptional()
  @IsString()
  @MaxLength(255)
  @IsOptional()
  previousSchoolAddress?: string;

  @ApiPropertyOptional()
  @IsString()
  @MaxLength(50)
  @IsOptional()
  previousSchoolGrade?: string;

  @ApiPropertyOptional({ example: '2026-09-01' })
  @IsDateString()
  @IsOptional()
  enrollmentDate?: string;
}

export class UpdateStudentDto extends PartialType(CreateStudentDto) {}

export class StudentQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  schoolId?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  campusId?: string;

  @ApiPropertyOptional({ enum: StudentStatus })
  @IsEnum(StudentStatus)
  @IsOptional()
  @Type(() => String)
  status?: StudentStatus;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  classId?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  sectionId?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  academicYearId?: string;

  @ApiPropertyOptional({ enum: Gender })
  @IsEnum(Gender)
  @IsOptional()
  gender?: Gender;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  bloodGroup?: string;
}

export class EnrollStudentDto {
  @ApiProperty()
  @IsUUID()
  academicYearId!: string;

  @ApiProperty()
  @IsUUID()
  classId!: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  sectionId?: string;

  @ApiPropertyOptional()
  @IsInt()
  @Min(1)
  @IsOptional()
  rollNumber?: number;

  @ApiPropertyOptional({ example: '2026-09-01' })
  @IsDateString()
  @IsOptional()
  enrolledAt?: string;

  @ApiPropertyOptional()
  @IsString()
  @MaxLength(500)
  @IsOptional()
  notes?: string;
}

export class TransferStudentDto {
  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  targetCampusId?: string;

  @ApiPropertyOptional()
  @IsString()
  @MaxLength(200)
  @IsOptional()
  externalSchoolName?: string;

  @ApiProperty()
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  transferReason!: string;

  @ApiPropertyOptional({ example: '2026-10-15' })
  @IsDateString()
  @IsOptional()
  transferDate?: string;
}

export class PromoteStudentDto {
  @ApiProperty()
  @IsUUID()
  targetAcademicYearId!: string;

  @ApiProperty()
  @IsUUID()
  targetClassId!: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  targetSectionId?: string;

  @ApiPropertyOptional()
  @IsString()
  @MaxLength(500)
  @IsOptional()
  notes?: string;
}

export class BulkPromoteStudentsDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  studentIds!: string[];

  @ApiProperty()
  @IsUUID()
  targetAcademicYearId!: string;

  @ApiProperty()
  @IsUUID()
  targetClassId!: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  targetSectionId?: string;

  @ApiPropertyOptional()
  @IsString()
  @MaxLength(500)
  @IsOptional()
  notes?: string;
}

export class WithdrawStudentDto {
  @ApiProperty()
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  withdrawalReason!: string;

  @ApiPropertyOptional({ example: '2026-10-20' })
  @IsDateString()
  @IsOptional()
  withdrawalDate?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  clearanceCompleted?: boolean;
}

export class GraduateStudentDto {
  @ApiPropertyOptional({ example: '2027-06-30' })
  @IsDateString()
  @IsOptional()
  graduationDate?: string;

  @ApiPropertyOptional()
  @IsString()
  @MaxLength(200)
  @IsOptional()
  honors?: string;

  @ApiPropertyOptional()
  @IsString()
  @MaxLength(500)
  @IsOptional()
  notes?: string;
}

export class UploadStudentDocumentDto {
  @ApiProperty({ enum: DocumentType })
  @IsEnum(DocumentType)
  type!: DocumentType;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  storageKey!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  mimeType?: string;

  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  sizeBytes?: number;

  @ApiPropertyOptional({ enum: SensitivityLevel })
  @IsEnum(SensitivityLevel)
  @IsOptional()
  sensitivity?: SensitivityLevel;
}

export class LinkGuardianDto {
  @ApiProperty()
  @IsUUID()
  guardianId!: string;

  @ApiProperty({ enum: GuardianRelation })
  @IsEnum(GuardianRelation)
  relation!: GuardianRelation;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isLegalGuardian?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  canPickup?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  hasPortalAccess?: boolean;
}

export class MergeStudentsDto {
  @ApiProperty({ description: 'ID of the duplicate record that will be archived' })
  @IsUUID()
  sourceStudentId!: string;

  @ApiProperty({ description: 'ID of the primary record that will be kept' })
  @IsUUID()
  targetStudentId!: string;

  @ApiPropertyOptional()
  @IsString()
  @MaxLength(500)
  @IsOptional()
  notes?: string;
}

export class ImportStudentRowDto {
  @IsString()
  firstName!: string;

  @IsOptional()
  @IsString()
  middleName?: string;

  @IsString()
  lastName!: string;

  @IsOptional()
  @IsString()
  studentNumber?: string;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  nationalId?: string;

  @IsOptional()
  @IsString()
  emergencyContactName?: string;

  @IsOptional()
  @IsString()
  emergencyContactPhone?: string;

  @IsOptional()
  @IsString()
  previousSchool?: string;
}

export class BulkImportStudentsDto {
  @ApiProperty()
  @IsUUID()
  schoolId!: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  campusId?: string;

  @ApiProperty({ type: [ImportStudentRowDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportStudentRowDto)
  students!: ImportStudentRowDto[];
}
