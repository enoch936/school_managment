import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationQueryDto } from '../../../common/pagination/pagination.dto';

export class CreateVehicleDto {
  @IsUUID()
  @IsNotEmpty()
  schoolId!: string;

  @IsString()
  @IsNotEmpty()
  plateNumber!: string;

  @IsString()
  @IsOptional()
  model?: string;

  @IsInt()
  @Min(1)
  capacity!: number;

  @IsString()
  @IsOptional()
  driverName?: string;

  @IsString()
  @IsOptional()
  driverPhone?: string;
}

export class CreateRouteStopDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsInt()
  @Min(1)
  sequence!: number;

  @IsString()
  @IsOptional()
  scheduledAt?: string;
}

export class CreateRouteDto {
  @IsUUID()
  @IsNotEmpty()
  schoolId!: string;

  @IsUUID()
  @IsOptional()
  vehicleId?: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  feeMinor?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRouteStopDto)
  @IsOptional()
  stops?: CreateRouteStopDto[];
}

export class AssignStudentTransportDto {
  @IsUUID()
  @IsNotEmpty()
  routeId!: string;

  @IsUUID()
  @IsOptional()
  stopId?: string;

  @IsUUID()
  @IsNotEmpty()
  studentId!: string;
}

export class TransportQueryDto extends PaginationQueryDto {
  @IsUUID()
  @IsOptional()
  schoolId?: string;
}
