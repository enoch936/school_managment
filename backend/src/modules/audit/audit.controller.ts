import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ActiveTenant, TenantContext } from '../../common/decorators/active-tenant.decorator';
import { PERMISSIONS } from '../../common/constants/permissions';
import { paginate } from '../../common/pagination/pagination.dto';
import { AuditQueryDto } from './dto/audit-query.dto';
import { AuditService } from './audit.service';

@ApiTags('audit')
@ApiBearerAuth()
@Controller('audit')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.AUDIT_READ)
  async list(
    @ActiveTenant() tenant: TenantContext,
    @CurrentUser() user: { isPlatformAdmin: boolean },
    @Query() query: AuditQueryDto,
  ) {
    const orgId = user.isPlatformAdmin && !tenant.organizationId ? null : tenant.organizationId;
    const { data, total } = await this.audit.list(orgId, {
      entityType: query.entityType,
      actorId: query.actorId,
      action: query.action,
      take: query.take,
      skip: query.skip,
    });
    return paginate(data, total, query.page, query.pageSize);
  }
}
