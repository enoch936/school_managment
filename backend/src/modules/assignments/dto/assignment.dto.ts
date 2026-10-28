import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationQueryDto } from '../../../common/pagination/pagination.dto';

export class CreateAssignmentDto {
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
  @IsOptional()
  teacherId?: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  maxScore?: number;

  @IsDateString()
  @IsNotEmpty()
  dueAt!: string;

  @IsBoolean()
  @IsOptional()
  allowLate?: boolean;
}

export class AssignmentQueryDto extends PaginationQueryDto {
  @IsUUID()
  @IsOptional()
  schoolId?: string;

  @IsUUID()
  @IsOptional()
  classId?: string;

  @IsUUID()
  @IsOptional()
  subjectId?: string;

  @IsUUID()
  @IsOptional()
  teacherId?: string;

  @IsBoolean()
  @IsOptional()
  publishedOnly?: boolean;
}

export class SubmitAssignmentDto {
  @IsUUID()
  @IsNotEmpty()
  studentId!: string;

  @IsString()
  @IsOptional()
  content?: string;

  @IsOptional()
  attachments?: any;
}

export class GradeSubmissionDto {
  @IsInt()
  @Min(0)
  @Type(() => Number)
  score!: number;

  @IsString()
  @IsOptional()
  feedback?: string;
}
