import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AttendanceMode, AttendanceStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/pagination/pagination.dto';

export class AttendanceEntryDto {
  @ApiProperty()
  @IsUUID()
  studentId!: string;

  @ApiProperty({ enum: AttendanceStatus })
  @IsEnum(AttendanceStatus)
  status!: AttendanceStatus;

  @ApiPropertyOptional()
  @IsInt()
  @Min(0)
  @IsOptional()
  minutesLate?: number;

  @ApiPropertyOptional()
  @IsString()
  @MaxLength(500)
  @IsOptional()
  note?: string;
}

export class BulkAttendanceDto {
  @ApiProperty()
  @IsUUID()
  schoolId!: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  classId?: string;

  @ApiProperty({ example: '2026-03-04' })
  @IsDateString()
  date!: string;

  @ApiPropertyOptional({ default: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  period?: number;

  @ApiPropertyOptional({ enum: AttendanceMode })
  @IsEnum(AttendanceMode)
  @IsOptional()
  mode?: AttendanceMode;

  @ApiProperty({ type: [AttendanceEntryDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AttendanceEntryDto)
  entries!: AttendanceEntryDto[];
}

export class AttendanceQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: '2026-03-01' })
  @IsDateString()
  @IsOptional()
  dateFrom?: string;

  @ApiPropertyOptional({ example: '2026-03-31' })
  @IsDateString()
  @IsOptional()
  dateTo?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  studentId?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  classId?: string;

  @ApiPropertyOptional({ enum: AttendanceStatus })
  @IsEnum(AttendanceStatus)
  @IsOptional()
  status?: AttendanceStatus;
}
