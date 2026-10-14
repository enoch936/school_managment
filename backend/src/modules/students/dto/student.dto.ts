import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Gender, StudentStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
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

  @ApiProperty({ example: 'STU-2026-0001' })
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  studentNumber!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(80)
  firstName!: string;

  @ApiPropertyOptional()
  @IsString()
  @MaxLength(80)
  @IsOptional()
  middleName?: string;

  @ApiProperty()
  @IsString()
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
  @MaxLength(30)
  @IsOptional()
  emergencyContactPhone?: string;

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
}
