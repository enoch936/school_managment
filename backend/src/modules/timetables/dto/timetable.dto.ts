import { IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTimetableEntryDto {
  @IsUUID()
  @IsNotEmpty()
  schoolId!: string;

  @IsUUID()
  @IsNotEmpty()
  academicYearId!: string;

  @IsUUID()
  @IsOptional()
  termId?: string;

  @IsUUID()
  @IsNotEmpty()
  classId!: string;

  @IsUUID()
  @IsOptional()
  sectionId?: string;

  @IsUUID()
  @IsNotEmpty()
  subjectId!: string;

  @IsUUID()
  @IsOptional()
  teacherId?: string;

  @IsUUID()
  @IsOptional()
  roomId?: string;

  @IsInt()
  @Min(1)
  @Max(7)
  @Type(() => Number)
  dayOfWeek!: number;

  @IsString()
  @IsNotEmpty()
  startTime!: string;

  @IsString()
  @IsNotEmpty()
  endTime!: string;
}

export class TimetableQueryDto {
  @IsUUID()
  @IsOptional()
  schoolId?: string;

  @IsUUID()
  @IsOptional()
  academicYearId?: string;

  @IsUUID()
  @IsOptional()
  classId?: string;

  @IsUUID()
  @IsOptional()
  sectionId?: string;

  @IsUUID()
  @IsOptional()
  teacherId?: string;

  @IsInt()
  @Min(1)
  @Max(7)
  @IsOptional()
  @Type(() => Number)
  dayOfWeek?: number;
}
