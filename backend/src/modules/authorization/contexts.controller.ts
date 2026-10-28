import { Controller, Get, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedRequest, AuthPrincipal } from '../../common/interfaces/auth-principal.interface';
import { ContextsService } from './contexts.service';

@ApiTags('contexts')
@ApiBearerAuth()
@Controller('contexts')
export class ContextsController {
  constructor(private readonly contexts: ContextsService) {}

  @Get('available')
  @ApiOperation({
    summary: 'Discover all accessible organizations, schools, campuses, and academic years',
  })
  getAvailableContexts(@Req() req: AuthenticatedRequest) {
    return this.contexts.getAvailableContexts(req.user as AuthPrincipal);
  }

  @Get('active')
  @ApiOperation({
    summary: 'Get the active multi-tenancy context and effective permissions for the current request',
  })
  getActiveContext(@Req() req: AuthenticatedRequest) {
    return this.contexts.getActiveContext(req.user as AuthPrincipal);
  }
}
