import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ActiveTenant, TenantContext } from '../../common/decorators/active-tenant.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../common/constants/permissions';
import { Audit } from '../audit/audit.decorator';
import { RolesService } from './roles.service';
import {
  AssignMembershipDto,
  CreateCustomRoleDto,
  UpdateCustomRoleDto,
} from './dto/role.dto';

@ApiTags('roles')
@ApiBearerAuth()
@Controller()
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get('roles')
  @RequirePermissions(PERMISSIONS.ROLE_READ)
  findAllRoles(@ActiveTenant() tenant: TenantContext) {
    return this.rolesService.findAllRoles(tenant.organizationId);
  }

  @Get('permissions')
  @RequirePermissions(PERMISSIONS.ROLE_READ)
  findAllPermissions() {
    return this.rolesService.findAllPermissions();
  }

  @Post('roles')
  @RequirePermissions(PERMISSIONS.ROLE_MANAGE)
  @Audit('role.create', 'Role')
  createCustomRole(
    @ActiveTenant() tenant: TenantContext,
    @Body() dto: CreateCustomRoleDto,
  ) {
    return this.rolesService.createCustomRole(tenant.organizationId, dto);
  }

  @Patch('roles/:id')
  @RequirePermissions(PERMISSIONS.ROLE_MANAGE)
  @Audit('role.update', 'Role')
  updateCustomRole(
    @ActiveTenant() tenant: TenantContext,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateCustomRoleDto,
  ) {
    return this.rolesService.updateCustomRole(tenant.organizationId, id, dto);
  }

  @Delete('roles/:id')
  @RequirePermissions(PERMISSIONS.ROLE_MANAGE)
  @Audit('role.delete', 'Role')
  deleteCustomRole(
    @ActiveTenant() tenant: TenantContext,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.rolesService.deleteCustomRole(tenant.organizationId, id);
  }

  @Post('users/:id/memberships')
  @RequirePermissions(PERMISSIONS.USER_MANAGE)
  @Audit('user-membership.assign', 'Membership')
  assignMembership(
    @ActiveTenant() tenant: TenantContext,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: AssignMembershipDto,
  ) {
    return this.rolesService.assignMembership(tenant.organizationId, id, dto);
  }

  @Delete('users/:id/memberships/:membershipId')
  @RequirePermissions(PERMISSIONS.USER_MANAGE)
  @Audit('user-membership.revoke', 'Membership')
  revokeMembership(
    @ActiveTenant() tenant: TenantContext,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('membershipId', new ParseUUIDPipe()) membershipId: string,
  ) {
    return this.rolesService.revokeMembership(tenant.organizationId, id, membershipId);
  }
}
