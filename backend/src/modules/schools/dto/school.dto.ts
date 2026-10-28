import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationQueryDto } from '../../../common/pagination/pagination.dto';

export class CreateSchoolDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name!: string;

  @ApiProperty({ example: 'BFA' })
  @IsString()
  @MinLength(1)
  @MaxLength(30)
  code!: string;

  @ApiPropertyOptional()
  @IsString()
  @MaxLength(40)
  @IsOptional()
  type?: string;

  @ApiPropertyOptional()
  @IsString()
  @MaxLength(160)
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

  @ApiPropertyOptional()
  @IsString()
  @MaxLength(255)
  @IsOptional()
  website?: string;

  @ApiPropertyOptional()
  @IsString()
  @MaxLength(50)
  @IsOptional()
  taxId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  logoUrl?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  timezone?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  locale?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  currency?: string;
}

export class UpdateSchoolDto extends PartialType(CreateSchoolDto) {
  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class SchoolQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateCampusDto {
  @ApiProperty()
  @IsUUID()
  schoolId!: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(30)
  code!: string;

  @ApiPropertyOptional()
  @IsString()
  @MaxLength(255)
  @IsOptional()
  address?: string;

  @ApiPropertyOptional()
  @IsString()
  @MaxLength(30)
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional()
  @IsString()
  @MaxLength(160)
  @IsOptional()
  email?: string;

  @ApiPropertyOptional()
  @IsInt()
  @Min(1)
  @IsOptional()
  capacity?: number;
}

export class UpdateCampusDto extends PartialType(CreateCampusDto) {
  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class SchoolOnboardingDto {
  @ApiProperty({ example: 'Springfield Academy' })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty({ example: 'SP-ACAD' })
  @IsString()
  @MinLength(1)
  code!: string;

  @ApiPropertyOptional({ example: 'K12' })
  @IsString()
  @IsOptional()
  type?: string;

  @ApiPropertyOptional({ example: 'info@springfield.edu' })
  @IsString()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: '+251911223344' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: 'Bole Subcity, Woreda 03' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ example: 'https://springfield.edu' })
  @IsString()
  @IsOptional()
  website?: string;

  @ApiPropertyOptional({ example: 'TIN-9876543210' })
  @IsString()
  @IsOptional()
  taxId?: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/logo.png' })
  @IsString()
  @IsOptional()
  logoUrl?: string;

  @ApiPropertyOptional({ example: 'Africa/Addis_Ababa' })
  @IsString()
  @IsOptional()
  timezone?: string;

  @ApiPropertyOptional({ example: 'en' })
  @IsString()
  @IsOptional()
  locale?: string;

  @ApiPropertyOptional({ example: 'ETB' })
  @IsString()
  @IsOptional()
  currency?: string;

  // Campus setup
  @ApiProperty({ example: 'Main Campus' })
  @IsString()
  @MinLength(2)
  mainCampusName!: string;

  @ApiProperty({ example: 'MAIN' })
  @IsString()
  @MinLength(1)
  mainCampusCode!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  mainCampusAddress?: string;

  // Academic calendar setup
  @ApiProperty({ example: '2026-2027 Academic Year' })
  @IsString()
  academicYearName!: string;

  @ApiProperty({ example: '2026-09-01' })
  @IsDateString()
  academicYearStartDate!: string;

  @ApiProperty({ example: '2027-06-30' })
  @IsDateString()
  academicYearEndDate!: string;

  @ApiProperty({ example: ['Semester 1', 'Semester 2'] })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  termNames!: string[];

  // Grading & Attendance policies
  @ApiPropertyOptional({ example: 'LETTER_GRADE' })
  @IsString()
  @IsOptional()
  gradingScaleType?: string;

  @ApiPropertyOptional({ example: 'DAILY' })
  @IsString()
  @IsOptional()
  attendanceMode?: string;

  @ApiPropertyOptional({ example: 75 })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  minAttendancePercentage?: number;
}

export class CreateCalendarEventDto {
  @ApiProperty()
  @IsUUID()
  schoolId!: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  academicYearId?: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  title!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 'HOLIDAY' })
  @IsString()
  type!: string;

  @ApiProperty()
  @IsDateString()
  startDate!: string;

  @ApiProperty()
  @IsDateString()
  endDate!: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isAllDay?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  affectsAttendance?: boolean;
}

export class UpdateCalendarEventDto extends PartialType(CreateCalendarEventDto) {}

export class CalendarQueryDto {
  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  from?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  to?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  type?: string;
}

export class GradeBandDto {
  @ApiProperty()
  @IsString()
  grade!: string;

  @ApiProperty()
  @IsNumber()
  minPercentage!: number;

  @ApiProperty()
  @IsNumber()
  maxPercentage!: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  gpaValue?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;
}

export class CreateGradingScaleDto {
  @ApiProperty()
  @IsUUID()
  schoolId!: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiPropertyOptional({ example: 'LETTER_GRADE' })
  @IsString()
  @IsOptional()
  type?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @ApiProperty({ type: [GradeBandDto] })
  @IsArray()
  @ArrayMinSize(1)
  @Type(() => GradeBandDto)
  bands!: GradeBandDto[];
}

export class UpdateGradingScaleDto extends PartialType(CreateGradingScaleDto) {}

export class UpsertSchoolPolicyDto {
  @ApiProperty()
  @IsUUID()
  schoolId!: string;

  @ApiProperty({ example: 'ATTENDANCE' })
  @IsString()
  category!: string;

  @ApiProperty({ example: 'attendance.minimum_percentage' })
  @IsString()
  key!: string;

  @ApiProperty({ example: 'Minimum Attendance Requirement' })
  @IsString()
  name!: string;

  @ApiProperty()
  @IsObject()
  value!: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;
}

export class CreateDocumentTemplateDto {
  @ApiProperty()
  @IsUUID()
  schoolId!: string;

  @ApiProperty({ example: 'ID_CARD' })
  @IsString()
  type!: string;

  @ApiProperty({ example: 'Standard Student ID Card' })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty()
  @IsObject()
  layout!: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  headerLogo?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  footerText?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateDocumentTemplateDto extends PartialType(CreateDocumentTemplateDto) {}

export class UpdateSubscriptionDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  plan?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  studentLimit?: number;

  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  seatsAllowed?: number;

  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  campusLimit?: number;

  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  staffLimit?: number;

  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  storageLimitMb?: number;
}

export class ToggleFeatureFlagDto {
  @ApiProperty()
  @IsString()
  key!: string;

  @ApiProperty()
  @IsBoolean()
  enabled!: boolean;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}

export class UpdateTenantSettingsDto {
  @ApiProperty()
  @IsObject()
  settings!: Record<string, unknown>;
}
