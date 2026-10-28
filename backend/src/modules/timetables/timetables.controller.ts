import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ActiveTenant, TenantContext } from '../../common/decorators/active-tenant.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../common/constants/permissions';
import { Audit } from '../audit/audit.decorator';
import { TimetablesService } from './timetables.service';
import { CreateTimetableEntryDto, TimetableQueryDto } from './dto/timetable.dto';

@ApiTags('timetables')
@ApiBearerAuth()
@Controller('timetables')
export class TimetablesController {
  constructor(private readonly timetablesService: TimetablesService) {}

  @Post()
  @RequirePermissions(PERMISSIONS.TIMETABLE_MANAGE)
  @Audit('timetable.create', 'TimetableEntry')
  createEntry(
    @ActiveTenant() tenant: TenantContext,
    @Body() dto: CreateTimetableEntryDto,
  ) {
    return this.timetablesService.createEntry(tenant.organizationId, dto);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.TIMETABLE_READ)
  findAll(
    @ActiveTenant() tenant: TenantContext,
    @Query() query: TimetableQueryDto,
  ) {
    return this.timetablesService.findAll(tenant.organizationId, query);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.TIMETABLE_MANAGE)
  @Audit('timetable.delete', 'TimetableEntry')
  deleteEntry(
    @ActiveTenant() tenant: TenantContext,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.timetablesService.deleteEntry(tenant.organizationId, id);
  }
}
