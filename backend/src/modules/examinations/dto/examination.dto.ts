import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { ExamStatus, ExamType } from '@prisma/client';
import { PaginationQueryDto } from '../../../common/pagination/pagination.dto';

export class CreateExamDto {
  @IsUUID()
  @IsNotEmpty()
  schoolId!: string;

  @IsUUID()
  @IsNotEmpty()
  classId!: string;

  @IsUUID()
  @IsNotEmpty()
  subjectId!: string;

  @IsUUID()
  @IsNotEmpty()
  academicYearId!: string;

  @IsUUID()
  @IsOptional()
  termId?: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsEnum(ExamType)
  @IsNotEmpty()
  type!: ExamType;

  @IsInt()
  @Min(1)
  totalMarks!: number;

  @IsInt()
  @Min(0)
  passMark!: number;

  @IsDateString()
  @IsOptional()
  startsAt?: string;

  @IsDateString()
  @IsOptional()
  endsAt?: string;

  @IsInt()
  @IsOptional()
  durationMinutes?: number;
}

export class UpdateExamDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsEnum(ExamStatus)
  @IsOptional()
  status?: ExamStatus;

  @IsInt()
  @IsOptional()
  totalMarks?: number;

  @IsInt()
  @IsOptional()
  passMark?: number;

  @IsDateString()
  @IsOptional()
  startsAt?: string;

  @IsDateString()
  @IsOptional()
  endsAt?: string;
}

export class RecordGradeDto {
  @IsUUID()
  @IsNotEmpty()
  studentId!: string;

  @IsInt()
  @Min(0)
  score!: number;
}

export class ExamQueryDto extends PaginationQueryDto {
  @IsUUID()
  @IsOptional()
  schoolId?: string;

  @IsUUID()
  @IsOptional()
  classId?: string;

  @IsUUID()
  @IsOptional()
  subjectId?: string;

  @IsEnum(ExamStatus)
  @IsOptional()
  status?: ExamStatus;
}
