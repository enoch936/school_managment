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
import { LoanStatus } from '@prisma/client';
import { PaginationQueryDto } from '../../../common/pagination/pagination.dto';

export class CreateBookDto {
  @IsUUID()
  @IsNotEmpty()
  schoolId!: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsOptional()
  author?: string;

  @IsString()
  @IsOptional()
  isbn?: string;

  @IsString()
  @IsOptional()
  publisher?: string;

  @IsInt()
  @IsOptional()
  publishedYear?: number;

  @IsString()
  @IsOptional()
  category?: string;

  @IsInt()
  @Min(1)
  copiesCount!: number;
}

export class CheckoutBookDto {
  @IsUUID()
  @IsNotEmpty()
  bookId!: string;

  @IsUUID()
  @IsNotEmpty()
  studentId!: string;

  @IsDateString()
  @IsNotEmpty()
  dueAt!: string;
}

export class ReturnBookDto {
  @IsInt()
  @Min(0)
  @IsOptional()
  fineMinor?: number;
}

export class LibraryQueryDto extends PaginationQueryDto {
  @IsUUID()
  @IsOptional()
  schoolId?: string;

  @IsString()
  @IsOptional()
  category?: string;
}

export class LoanQueryDto extends PaginationQueryDto {
  @IsUUID()
  @IsOptional()
  schoolId?: string;

  @IsEnum(LoanStatus)
  @IsOptional()
  status?: LoanStatus;
}
