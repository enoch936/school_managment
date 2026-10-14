import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ActiveTenant, TenantContext } from '../../common/decorators/active-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../common/constants/permissions';
import { UpdateUserDto, UserQueryDto } from './dto/user.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.USER_READ)
  list(@ActiveTenant() tenant: TenantContext, @Query() query: UserQueryDto) {
    return this.users.list(tenant.organizationId, query);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.USER_READ)
  get(@ActiveTenant() tenant: TenantContext, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.users.get(tenant.organizationId, id);
  }

  @Patch('me')
  updateMe(@CurrentUser('userId') userId: string, @Body() dto: UpdateUserDto) {
    return this.users.updateProfile(userId, dto);
  }

  @Patch(':id/status')
  @RequirePermissions(PERMISSIONS.USER_MANAGE)
  setStatus(
    @ActiveTenant() tenant: TenantContext,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: { isActive: boolean },
  ) {
    return this.users.setActive(tenant.organizationId, id, body.isActive);
  }
}
