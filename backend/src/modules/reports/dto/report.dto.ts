import { IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';

export class ReportFilterDto {
  @IsUUID()
  @IsOptional()
  schoolId?: string;

  @IsUUID()
  @IsOptional()
  academicYearId?: string;

  @IsDateString()
  @IsOptional()
  dateFrom?: string;

  @IsDateString()
  @IsOptional()
  dateTo?: string;
}

export class ExportReportDto extends ReportFilterDto {
  @IsString()
  @IsOptional()
  format?: 'csv' | 'json';
}
