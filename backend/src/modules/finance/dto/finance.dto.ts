import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { InvoiceStatus, PaymentMethod } from '@prisma/client';
import { PaginationQueryDto } from '../../../common/pagination/pagination.dto';

export class CreateFeeStructureItemDto {
  @IsString()
  @IsNotEmpty()
  category!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  @Min(0)
  amountMinor!: number; // Integer minor units (e.g., 50000 = 500.00 ETB)

  @IsOptional()
  isMandatory?: boolean;
}

export class CreateFeeStructureDto {
  @IsUUID()
  @IsNotEmpty()
  schoolId!: string;

  @IsUUID()
  @IsOptional()
  academicYearId?: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  currency?: string; // Default: 'ETB'

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateFeeStructureItemDto)
  items!: CreateFeeStructureItemDto[];
}

export class CreateInvoiceItemDto {
  @IsString()
  @IsNotEmpty()
  category!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsInt()
  @Min(0)
  unitMinor!: number; // minor units
}

export class CreateInvoiceDto {
  @IsUUID()
  @IsNotEmpty()
  schoolId!: string;

  @IsUUID()
  @IsNotEmpty()
  studentId!: string;

  @IsUUID()
  @IsOptional()
  academicYearId?: string;

  @IsString()
  @IsNotEmpty()
  invoiceNumber!: string;

  @IsDateString()
  @IsNotEmpty()
  dueDate!: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  discountMinor?: number;

  @IsString()
  @IsOptional()
  currency?: string; // Default 'ETB'

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateInvoiceItemDto)
  items!: CreateInvoiceItemDto[];
}

export class RecordPaymentDto {
  @IsUUID()
  @IsNotEmpty()
  invoiceId!: string;

  @IsInt()
  @Min(1)
  amountMinor!: number; // minor units to allocate

  @IsEnum(PaymentMethod)
  @IsNotEmpty()
  method!: PaymentMethod;

  @IsString()
  @IsOptional()
  reference?: string;

  @IsString()
  @IsOptional()
  idempotencyKey?: string;
}

export class FinanceQueryDto extends PaginationQueryDto {
  @IsUUID()
  @IsOptional()
  schoolId?: string;

  @IsUUID()
  @IsOptional()
  studentId?: string;

  @IsEnum(InvoiceStatus)
  @IsOptional()
  status?: InvoiceStatus;
}
