import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/pagination/pagination.dto';

export class CreateAcademicYearDto {
  @ApiProperty()
  @IsUUID()
  schoolId!: string;

  @ApiProperty({ example: '2025/2026' })
  @IsString()
  @MaxLength(40)
  name!: string;

  @ApiProperty({ example: '2025-09-01' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ example: '2026-06-30' })
  @IsDateString()
  endDate!: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isCurrent?: boolean;
}

export class UpdateAcademicYearDto extends PartialType(CreateAcademicYearDto) {}

export class CreateTermDto {
  @ApiProperty()
  @IsUUID()
  academicYearId!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(40)
  name!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  sequence!: number;

  @ApiProperty()
  @IsDateString()
  startDate!: string;

  @ApiProperty()
  @IsDateString()
  endDate!: string;
}

export class CreateClassDto {
  @ApiProperty()
  @IsUUID()
  schoolId!: string;

  @ApiProperty()
  @IsUUID()
  academicYearId!: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  campusId?: string;

  @ApiProperty({ example: 'Grade 9A' })
  @IsString()
  @MaxLength(80)
  name!: string;

  @ApiPropertyOptional()
  @IsInt()
  @Min(1)
  @IsOptional()
  capacity?: number;
}

export class UpdateClassDto extends PartialType(CreateClassDto) {}

export class CreateSubjectDto {
  @ApiProperty()
  @IsUUID()
  schoolId!: string;

  @ApiProperty({ example: 'MATH-9' })
  @IsString()
  @MaxLength(40)
  code!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isCore?: boolean;
}

export class UpdateSubjectDto extends PartialType(CreateSubjectDto) {}

export class AcademicsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  schoolId?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  academicYearId?: string;
}
