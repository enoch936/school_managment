import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ActiveTenant, TenantContext } from '../../common/decorators/active-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthPrincipal } from '../../common/interfaces/auth-principal.interface';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../common/constants/permissions';
import { Audit } from '../audit/audit.decorator';
import { DisciplineHealthService } from './discipline-health.service';
import {
  CreateDisciplineCaseDto,
  DisciplineQueryDto,
  UpdateDisciplineCaseDto,
  UpsertHealthRecordDto,
} from './dto/discipline-health.dto';

@ApiTags('discipline-health')
@ApiBearerAuth()
@Controller()
export class DisciplineHealthController {
  constructor(private readonly service: DisciplineHealthService) {}

  @Post('discipline-cases')
  @RequirePermissions(PERMISSIONS.DISCIPLINE_MANAGE)
  @Audit('discipline.create', 'DisciplineCase')
  createCase(
    @ActiveTenant() tenant: TenantContext,
    @CurrentUser() user: AuthPrincipal,
    @Body() dto: CreateDisciplineCaseDto,
  ) {
    return this.service.createDisciplineCase(tenant.organizationId, user.userId, dto);
  }

  @Get('discipline-cases')
  @RequirePermissions(PERMISSIONS.DISCIPLINE_READ)
  findAllCases(
    @ActiveTenant() tenant: TenantContext,
    @Query() query: DisciplineQueryDto,
  ) {
    return this.service.findAllDisciplineCases(tenant.organizationId, query);
  }

  @Patch('discipline-cases/:id')
  @RequirePermissions(PERMISSIONS.DISCIPLINE_MANAGE)
  @Audit('discipline.update', 'DisciplineCase')
  updateCase(
    @ActiveTenant() tenant: TenantContext,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateDisciplineCaseDto,
  ) {
    return this.service.updateDisciplineCase(tenant.organizationId, id, dto);
  }

  @Get('health-records/students/:studentId')
  @RequirePermissions(PERMISSIONS.HEALTH_READ)
  getHealthRecord(
    @ActiveTenant() tenant: TenantContext,
    @Param('studentId', new ParseUUIDPipe()) studentId: string,
  ) {
    return this.service.getHealthRecord(tenant.organizationId, studentId);
  }

  @Put('health-records')
  @RequirePermissions(PERMISSIONS.HEALTH_MANAGE)
  @Audit('health.upsert', 'HealthRecord')
  upsertHealthRecord(
    @ActiveTenant() tenant: TenantContext,
    @CurrentUser() user: AuthPrincipal,
    @Body() dto: UpsertHealthRecordDto,
  ) {
    return this.service.upsertHealthRecord(tenant.organizationId, user.userId, dto);
  }
}
