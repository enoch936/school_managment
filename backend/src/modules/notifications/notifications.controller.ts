import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginationQueryDto } from '../../common/pagination/pagination.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(@CurrentUser('userId') userId: string, @Query() query: PaginationQueryDto) {
    return this.notifications.listForUser(userId, query.page, query.pageSize);
  }

  @Patch(':id/read')
  markRead(
    @CurrentUser('userId') userId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.notifications.markRead(userId, id);
  }
}
