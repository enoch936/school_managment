import { IsDateString, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/pagination/pagination.dto';

export class CreateDisciplineCaseDto {
  @IsUUID()
  @IsNotEmpty()
  schoolId!: string;

  @IsUUID()
  @IsNotEmpty()
  studentId!: string;

  @IsDateString()
  @IsNotEmpty()
  incidentDate!: string;

  @IsString()
  @IsNotEmpty()
  category!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsString()
  @IsOptional()
  actionTaken?: string;
}

export class UpdateDisciplineCaseDto {
  @IsString()
  @IsOptional()
  actionTaken?: string;

  @IsString()
  @IsOptional()
  status?: string;
}

export class DisciplineQueryDto extends PaginationQueryDto {
  @IsUUID()
  @IsOptional()
  schoolId?: string;

  @IsUUID()
  @IsOptional()
  studentId?: string;

  @IsString()
  @IsOptional()
  status?: string;
}

export class UpsertHealthRecordDto {
  @IsUUID()
  @IsNotEmpty()
  schoolId!: string;

  @IsUUID()
  @IsNotEmpty()
  studentId!: string;

  @IsString()
  @IsOptional()
  bloodType?: string;

  @IsString()
  @IsOptional()
  allergies?: string;

  @IsString()
  @IsOptional()
  conditions?: string;

  @IsString()
  @IsOptional()
  medications?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
