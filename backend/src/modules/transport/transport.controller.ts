import {
  Body,
  Controller,
  Get,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ActiveTenant, TenantContext } from '../../common/decorators/active-tenant.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../common/constants/permissions';
import { Audit } from '../audit/audit.decorator';
import { TransportService } from './transport.service';
import {
  AssignStudentTransportDto,
  CreateRouteDto,
  CreateVehicleDto,
  TransportQueryDto,
} from './dto/transport.dto';

@ApiTags('transport')
@ApiBearerAuth()
@Controller('transport')
export class TransportController {
  constructor(private readonly transport: TransportService) {}

  @Post('vehicles')
  @RequirePermissions(PERMISSIONS.TRANSPORT_MANAGE)
  @Audit('transport.create_vehicle', 'Vehicle')
  createVehicle(
    @ActiveTenant() tenant: TenantContext,
    @Body() dto: CreateVehicleDto,
  ) {
    return this.transport.createVehicle(tenant.organizationId, dto);
  }

  @Get('vehicles')
  @RequirePermissions(PERMISSIONS.TRANSPORT_READ)
  getVehicles(
    @ActiveTenant() tenant: TenantContext,
    @Query() query: TransportQueryDto,
  ) {
    return this.transport.getVehicles(tenant.organizationId, query);
  }

  @Post('routes')
  @RequirePermissions(PERMISSIONS.TRANSPORT_MANAGE)
  @Audit('transport.create_route', 'Route')
  createRoute(
    @ActiveTenant() tenant: TenantContext,
    @Body() dto: CreateRouteDto,
  ) {
    return this.transport.createRoute(tenant.organizationId, dto);
  }

  @Get('routes')
  @RequirePermissions(PERMISSIONS.TRANSPORT_READ)
  getRoutes(
    @ActiveTenant() tenant: TenantContext,
    @Query() query: TransportQueryDto,
  ) {
    return this.transport.getRoutes(tenant.organizationId, query);
  }

  @Post('assignments')
  @RequirePermissions(PERMISSIONS.TRANSPORT_MANAGE)
  @Audit('transport.assign_student', 'TransportAssignment')
  assignStudent(
    @ActiveTenant() tenant: TenantContext,
    @Body() dto: AssignStudentTransportDto,
  ) {
    return this.transport.assignStudent(tenant.organizationId, dto);
  }
}
