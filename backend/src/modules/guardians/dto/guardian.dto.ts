import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { GuardianRelation } from '@prisma/client';
import { PaginationQueryDto } from '../../../common/pagination/pagination.dto';

export class CreateGuardianDto {
  @IsUUID()
  @IsNotEmpty()
  schoolId!: string;

  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsNotEmpty()
  phone!: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  occupation?: string;
}

export class UpdateGuardianDto {
  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  occupation?: string;
}

export class LinkStudentDto {
  @IsUUID()
  @IsNotEmpty()
  studentId!: string;

  @IsEnum(GuardianRelation)
  @IsNotEmpty()
  relation!: GuardianRelation;

  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;

  @IsBoolean()
  @IsOptional()
  isLegalGuardian?: boolean;
}

export class GuardianQueryDto extends PaginationQueryDto {
  @IsUUID()
  @IsOptional()
  schoolId?: string;
}
