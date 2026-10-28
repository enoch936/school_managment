import { Global, Module } from '@nestjs/common';
import { AuthorizationService } from './authorization.service';
import { RolesService } from './roles.service';
import { RolesController } from './roles.controller';
import { ResourceAuthorizationService } from './resource-authorization.service';

@Global()
@Module({
  controllers: [RolesController],
  providers: [AuthorizationService, RolesService, ResourceAuthorizationService],
  exports: [AuthorizationService, RolesService, ResourceAuthorizationService],
})
export class AuthorizationModule {}
