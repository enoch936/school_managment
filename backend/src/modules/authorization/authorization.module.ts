import { Global, Module } from '@nestjs/common';
import { AuthorizationService } from './authorization.service';
import { RolesService } from './roles.service';
import { RolesController } from './roles.controller';
import { ResourceAuthorizationService } from './resource-authorization.service';
import { ContextsService } from './contexts.service';
import { ContextsController } from './contexts.controller';

@Global()
@Module({
  controllers: [RolesController, ContextsController],
  providers: [
    AuthorizationService,
    RolesService,
    ResourceAuthorizationService,
    ContextsService,
  ],
  exports: [
    AuthorizationService,
    RolesService,
    ResourceAuthorizationService,
    ContextsService,
  ],
})
export class AuthorizationModule {}
